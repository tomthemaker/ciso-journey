-- Private tables + RPC-only API. No caller-supplied owner, no writable REST tables.
create schema sync_private;
revoke all on schema sync_private from public, anon, authenticated;

create table sync_private.accounts (
  owner uuid primary key, -- intentionally survives deletion of auth.users (revocation tombstone)
  enabled boolean not null default true,
  generation uuid not null default gen_random_uuid(),
  sequence bigint not null default 0 check (sequence >= 0),
  head uuid,
  tips uuid[] not null default '{}',
  archive_bytes bigint not null default 0 check (archive_bytes >= 0),
  last_erasure jsonb
);
create table sync_private.revisions (
  owner uuid not null references sync_private.accounts(owner),
  generation uuid not null,
  id uuid not null,
  sequence bigint not null,
  request jsonb not null, -- metadata only; snapshot is reconstructed from shared chunks
  snapshot_hash text not null,
  fingerprint text not null,
  result jsonb not null,
  primary key (owner, generation, id),
  unique (owner, generation, sequence)
);
-- Exact observations cannot be changed under the same ID, even on another branch.
create table sync_private.observations (
  owner uuid not null references sync_private.accounts(owner),
  generation uuid not null,
  kind text not null,
  id text not null,
  value_hash text not null,
  primary key (owner, generation, kind, id)
);
-- Content-addressing is account/generation scoped: no cross-account existence oracle.
create table sync_private.chunks (
  owner uuid not null references sync_private.accounts(owner),
  generation uuid not null,
  hash text not null,
  node jsonb not null,
  primary key (owner, generation, hash)
);
alter table sync_private.chunks enable row level security;
alter table sync_private.accounts enable row level security;
alter table sync_private.revisions enable row level security;
alter table sync_private.observations enable row level security;
-- Default-deny RLS: all access is through the explicitly authorized functions below.
revoke all on all tables in schema sync_private from public, anon, authenticated;

create function sync_private.subject() returns uuid
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare subject uuid := auth.uid();
begin
  if subject is null or not exists (
    select 1 from auth.users u where u.id = subject and u.email_confirmed_at is not null
      and not coalesce(u.is_anonymous, false) and u.deleted_at is null
      and (u.banned_until is null or u.banned_until <= now())
  ) then raise exception 'sync_identity_unavailable' using errcode = '42501'; end if;
  return subject;
end $$;

create function sync_private.active_account() returns sync_private.accounts
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare account sync_private.accounts; subject uuid := sync_private.subject();
begin
  -- Serializes all writes AND reads with generation erasure/closure.
  select * into account from sync_private.accounts where owner = subject for update;
  if not found or not account.enabled then
    raise exception 'sync_account_unavailable' using errcode = '42501';
  end if;
  return account;
end $$;

create function sync_private.status(account sync_private.accounts) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('protocol', 1, 'owner', account.owner, 'generation', account.generation,
    'sequence', account.sequence, 'head', account.head, 'tips', account.tips,
    'archiveBytes', account.archive_bytes, 'archiveLimitBytes', 67108864);
$$;

-- Structural/version fence, NOT an alternative to the client's full LearnerState validator.
-- A malicious owner can submit invalid learning semantics; clients quarantine those snapshots.
create function sync_private.validate_snapshot(snapshot jsonb) returns void
language plpgsql set search_path = '' as $$
#variable_conflict use_variable
declare state jsonb; field text;
begin
  if snapshot is null or jsonb_typeof(snapshot) <> 'object'
    or snapshot->'schemaVersion' is distinct from '2'::jsonb
    or (select count(*) from jsonb_object_keys(snapshot)) <> 2
    or jsonb_typeof(snapshot->'data') is distinct from 'object'
    or octet_length(snapshot::text) > 16777216 then
    raise exception 'sync_snapshot_invalid_or_too_large' using errcode = '22023';
  end if;
  state := snapshot->'data';
  if jsonb_typeof(state->'completed') is distinct from 'object'
    or jsonb_typeof(state->'scores') is distinct from 'object'
    or jsonb_typeof(state->'journal') is distinct from 'array'
    or jsonb_typeof(state->'achievements') is distinct from 'array' then
    raise exception 'sync_state_invalid' using errcode = '22023';
  end if;
  foreach field in array array['readingProgress','reviewProgress','questionAttempts','scenarioResponses','resourceProgress','portfolio','studyPreferences'] loop
    if state ? field and (jsonb_typeof(state->field) <> 'object' or state->field->'schemaVersion' is distinct from '1'::jsonb) then
      raise exception 'sync_namespace_version_unsupported' using errcode = '22023';
    end if;
  end loop;
  if state ? 'displayPreferences' and state->'displayPreferences'->'schema' is distinct from '1'::jsonb then
    raise exception 'sync_namespace_version_unsupported' using errcode = '22023';
  end if;
end $$;

create function sync_private.observe(subject uuid, generation uuid, snapshot jsonb) returns bigint
language plpgsql set search_path = '' as $$
#variable_conflict use_variable
declare path text[]; observations jsonb; item jsonb; old text; kind text; value_hash text; added_bytes bigint := 0;
begin
  foreach path slice 1 in array array[
    ['reviewProgress','events'], ['questionAttempts','attempts'], ['questionAttempts','selfAssessments'],
    ['scenarioResponses','responses'], ['scenarioResponses','selfAssessments'], ['portfolio','appraisals']
  ] loop
    observations := snapshot->'data' #> path;
    if observations is null then continue; end if;
    if jsonb_typeof(observations) <> 'array' then raise exception 'sync_observations_invalid' using errcode = '22023'; end if;
    kind := array_to_string(path, '.');
    for item in select value from jsonb_array_elements(observations) loop
      if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string'
        or length(item->>'id') not between 1 and 256 then
        raise exception 'sync_observation_id_invalid' using errcode = '22023';
      end if;
      value_hash := encode(sha256(convert_to(item::text, 'UTF8')), 'hex');
      select o.value_hash into old from sync_private.observations o
        where o.owner = subject and o.generation = observe.generation and o.kind = kind and o.id = item->>'id';
      if found then
        if old <> value_hash then raise exception 'sync_observation_id_reused' using errcode = '22023'; end if;
      else
        insert into sync_private.observations values (subject, generation, kind, item->>'id', value_hash);
        added_bytes := added_bytes + 192 + octet_length(item->>'id');
      end if;
    end loop;
  end loop;
  return added_bytes;
end $$;

-- Persistent JSON tree. Arrays use fixed 32-way blocks: appending to a long history
-- adds only a tail and logarithmic ancestors, not N duplicate event IDs per revision.
create function sync_private.pack(subject uuid, generation uuid, value jsonb) returns text
language plpgsql set search_path = '' as $$
#variable_conflict use_variable
declare hash text := encode(sha256(convert_to(value::text, 'UTF8')), 'hex'); node jsonb;
  child record; children jsonb; n integer; stride integer := 1; start_at integer; block jsonb;
begin
  if exists (select 1 from sync_private.chunks c where c.owner = subject and c.generation = pack.generation and c.hash = hash) then return hash; end if;
  if jsonb_typeof(value) = 'array' then
    n := jsonb_array_length(value); children := '[]'::jsonb;
    while stride * 32 < n loop stride := stride * 32; end loop;
    if stride = 1 then
      for child in select v from jsonb_array_elements(value) v loop
        children := children || jsonb_build_array(sync_private.pack(subject, generation, child.v));
      end loop;
      node := jsonb_build_object('kind', 'array', 'children', children);
    else
      start_at := 0;
      while start_at < n loop
        select jsonb_agg(v order by ordinal) into block from jsonb_array_elements(value) with ordinality a(v, ordinal)
          where ordinal > start_at and ordinal <= start_at + stride;
        children := children || jsonb_build_array(sync_private.pack(subject, generation, block));
        start_at := start_at + stride;
      end loop;
      node := jsonb_build_object('kind', 'concat', 'children', children);
    end if;
  elsif jsonb_typeof(value) = 'object' and octet_length(value::text) > 1024 then
    children := '{}'::jsonb;
    for child in select key, v from jsonb_each(value) e(key, v) loop
      children := children || jsonb_build_object(child.key, sync_private.pack(subject, generation, child.v));
    end loop;
    node := jsonb_build_object('kind', 'object', 'children', children);
  else node := jsonb_build_object('kind', 'value', 'value', value);
  end if;
  insert into sync_private.chunks values (subject, generation, hash, node);
  update sync_private.accounts set archive_bytes = archive_bytes + octet_length(node::text) + 96 where owner = subject;
  return hash;
end $$;

create function sync_private.unpack(subject uuid, generation uuid, hash text) returns jsonb
language plpgsql set search_path = '' as $$
#variable_conflict use_variable
declare node jsonb; child record; result jsonb;
begin
  select c.node into node from sync_private.chunks c where c.owner = subject and c.generation = unpack.generation and c.hash = hash;
  if not found then raise exception 'sync_chunk_missing'; end if;
  if node->>'kind' = 'value' then return node->'value'; end if;
  if node->>'kind' = 'object' then
    result := '{}'::jsonb;
    for child in select key, value from jsonb_each(node->'children') loop
      result := result || jsonb_build_object(child.key, sync_private.unpack(subject, generation, child.value #>> '{}'));
    end loop;
  else
    result := '[]'::jsonb;
    for child in select value from jsonb_array_elements_text(node->'children') loop
      if node->>'kind' = 'array' then
        result := result || jsonb_build_array(sync_private.unpack(subject, generation, child.value));
      else result := result || sync_private.unpack(subject, generation, child.value);
      end if;
    end loop;
  end if;
  return result;
end $$;

create function public.sync_enroll() returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare subject uuid := sync_private.subject(); account sync_private.accounts;
begin
  -- Explicit opt-in; login alone never enrolls or uploads. Closed owners cannot re-enroll.
  insert into sync_private.accounts(owner) values (subject) on conflict do nothing;
  account := sync_private.active_account();
  return sync_private.status(account);
end $$;

create function public.sync_status() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin return sync_private.status(sync_private.active_account()); end $$;

create function public.sync_pull(p_generation uuid, p_after bigint, p_through bigint, p_limit integer default 1, p_compact boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare account sync_private.accounts := sync_private.active_account(); result jsonb;
begin
  if p_generation is distinct from account.generation then raise exception 'sync_generation_changed' using errcode = '22023'; end if;
  if p_compact is null or p_after is null or p_through is null or p_limit is null or p_after < 0 or p_through < p_after
    or p_through > account.sequence or p_limit not between 1 and 2 then
    raise exception 'sync_cursor_invalid' using errcode = '22023';
  end if;
  select coalesce(jsonb_agg(to_jsonb(r) order by r.sequence), '[]'::jsonb) into result from (
    select id, sequence, request || case when p_compact then jsonb_build_object('snapshotHash', snapshot_hash) else jsonb_build_object('snapshot', sync_private.unpack(account.owner, p_generation, snapshot_hash)) end as request, revisions.result from sync_private.revisions
    where owner = account.owner and generation = p_generation and sequence > p_after and sequence <= p_through
    order by sequence limit p_limit
  ) r;
  return jsonb_build_object('protocol', 1, 'owner', account.owner, 'generation', account.generation, 'revisions', result);
end $$;

-- Compact full backup uses revision metadata plus these immutable shared chunks.
-- A page targets 1 MiB (one larger scalar may occupy a page by itself). New concurrent
-- chunks are harmless extras; all roots at the caller's frozen sequence already exist.
create function public.sync_chunks(p_generation uuid, p_after text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare account sync_private.accounts := sync_private.active_account(); result jsonb;
begin
  if p_generation is distinct from account.generation then raise exception 'sync_generation_changed' using errcode = '22023'; end if;
  if p_after is null or (p_after <> '' and p_after !~ '^[a-f0-9]{64}$') then raise exception 'sync_cursor_invalid' using errcode = '22023'; end if;
  select coalesce(jsonb_agg(jsonb_build_object('hash', hash, 'node', node) order by hash), '[]'::jsonb) into result from (
    select hash, node, row_number() over(order by hash) as n,
      sum(octet_length(node::text) + 96) over(order by hash) as bytes
    from (select hash, node from sync_private.chunks where owner = account.owner and generation = p_generation and hash > p_after order by hash limit 100) page
  ) bounded where n = 1 or bytes <= 1048576;
  return jsonb_build_object('protocol', 1, 'owner', account.owner, 'generation', account.generation, 'chunks', result);
end $$;

-- One immutable request ID per snapshot. Resolve is a CAS over the COMPLETE frontier.
create function public.sync_commit(p_request jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare
  account sync_private.accounts := sync_private.active_account();
  operation uuid; parent uuid; generation uuid; previous sync_private.revisions;
  tips uuid[]; parents uuid[]; result jsonb; kind text; added_bytes bigint; snapshot_hash text; fingerprint text;
begin
  if p_request is null or jsonb_typeof(p_request) <> 'object' or octet_length(p_request::text) > 16781312
    or p_request->'protocol' is distinct from '1'::jsonb
    or (select count(*) from jsonb_object_keys(p_request)) <> 7
    or not (p_request ?& array['protocol','generation','id','kind','parent','frontier','snapshot']) then
    raise exception 'sync_request_invalid' using errcode = '22023';
  end if;
  generation := (p_request->>'generation')::uuid;
  operation := (p_request->>'id')::uuid;
  kind := p_request->>'kind';
  if generation is distinct from account.generation then raise exception 'sync_generation_changed' using errcode = '22023'; end if;
  if operation is null or kind not in ('append', 'resolve') or kind is null then
    raise exception 'sync_request_invalid' using errcode = '22023';
  end if;
  fingerprint := encode(sha256(convert_to(p_request::text, 'UTF8')), 'hex');
  select * into previous from sync_private.revisions where owner = account.owner and revisions.generation = generation and id = operation;
  if found then
    if previous.fingerprint <> fingerprint then raise exception 'sync_operation_id_reused' using errcode = '22023'; end if;
    return previous.result; -- stable original result; use sync_status for current state
  end if;
  perform sync_private.validate_snapshot(p_request->'snapshot');
  tips := account.tips;
  if kind = 'append' then
    if p_request->'frontier' <> 'null'::jsonb then raise exception 'sync_frontier_invalid' using errcode = '22023'; end if;
    parent := (p_request->>'parent')::uuid;
    if parent is not null and not exists (select 1 from sync_private.revisions
      where owner = account.owner and revisions.generation = generation and id = parent) then
      raise exception 'sync_parent_missing' using errcode = '22023';
    end if;
    -- A late descendant of ANY historical parent is a new visible conflict, never a lost write.
    tips := array_append(array_remove(tips, parent), operation);
    if (parent is not distinct from account.head) and cardinality(account.tips) <= 1 then
      account.head := operation;
    end if;
  else
    if p_request->'parent' <> 'null'::jsonb or jsonb_typeof(p_request->'frontier') <> 'object'
      or (select count(*) from jsonb_object_keys(p_request->'frontier')) <> 2
      or p_request->'frontier'->'sequence' is distinct from to_jsonb(account.sequence)
      or jsonb_typeof(p_request->'frontier'->'tips') is distinct from 'array' then
      raise exception 'sync_resolution_stale' using errcode = '22023';
    end if;
    select array_agg(value::uuid order by value::uuid) into parents from jsonb_array_elements_text(p_request->'frontier'->'tips');
    if parents is distinct from (select array_agg(t order by t) from unnest(account.tips) t)
      or cardinality(account.tips) < 2 then raise exception 'sync_resolution_stale' using errcode = '22023'; end if;
    account.head := operation;
    tips := array[operation];
  end if;
  snapshot_hash := sync_private.pack(account.owner, generation, p_request->'snapshot');
  select archive_bytes into account.archive_bytes from sync_private.accounts where owner = account.owner;
  if cardinality(tips) > 64 then raise exception 'sync_conflict_quota' using errcode = '54000'; end if;
  added_bytes := octet_length((p_request - 'snapshot')::text) + octet_length(to_jsonb(tips)::text) + 1024 + sync_private.observe(account.owner, generation, p_request->'snapshot');
  if account.archive_bytes + added_bytes > 67108864 or account.sequence >= 100000 then
    raise exception 'sync_archive_quota' using errcode = '54000';
  end if;
  account.sequence := account.sequence + 1;
  account.tips := tips;
  account.archive_bytes := account.archive_bytes + added_bytes;
  result := sync_private.status(account) || jsonb_build_object('id', operation,
    'outcome', case when cardinality(tips) > 1 then 'conflict' else 'accepted' end);
  insert into sync_private.revisions values (account.owner, generation, operation, account.sequence, p_request - 'snapshot', snapshot_hash, fingerprint, result);
  update sync_private.accounts set sequence = account.sequence, head = account.head, tips = account.tips,
    archive_bytes = account.archive_bytes where owner = account.owner;
  return result;
end $$;

-- Explicit destructive erasure. A server-minted generation fences every pre-erasure offline queue.
-- Retained data must be selected by the learner; no implicit copy of old state into the new generation.
create function public.sync_erase(p_generation uuid, p_sequence bigint, p_id uuid, p_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare account sync_private.accounts := sync_private.active_account(); receipt jsonb; new_generation uuid; bytes bigint; snapshot_hash text;
begin
  if p_id is null then raise exception 'sync_erasure_invalid' using errcode = '22023'; end if;
  if p_generation is distinct from account.generation then
    -- Retry uses only the last receipt and its original fingerprint, never old learner payloads.
    if account.last_erasure->>'id' = p_id::text
      and account.last_erasure->>'fromGeneration' = p_generation::text
      and account.last_erasure->'fromSequence' = to_jsonb(p_sequence)
      and account.last_erasure->>'fingerprint' = encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex') then
      return account.last_erasure->'result';
    end if;
    raise exception 'sync_generation_changed' using errcode = '22023';
  end if;
  if p_sequence is distinct from account.sequence then raise exception 'sync_erasure_stale' using errcode = '22023'; end if;
  perform sync_private.validate_snapshot(p_snapshot);
  new_generation := gen_random_uuid();
  delete from sync_private.revisions where owner = account.owner;
  delete from sync_private.observations where owner = account.owner;
  delete from sync_private.chunks where owner = account.owner;
  update sync_private.accounts set archive_bytes = 0 where owner = account.owner;
  snapshot_hash := sync_private.pack(account.owner, new_generation, p_snapshot);
  select archive_bytes into bytes from sync_private.accounts where owner = account.owner;
  bytes := bytes + 1024 + sync_private.observe(account.owner, new_generation, p_snapshot);
  if bytes > 67108864 then raise exception 'sync_archive_quota' using errcode = '54000'; end if;
  account.generation := new_generation; account.sequence := 1; account.head := p_id;
  account.tips := array[p_id]; account.archive_bytes := bytes;
  receipt := sync_private.status(account) || jsonb_build_object('id', p_id, 'outcome', 'erased');
  insert into sync_private.revisions values (account.owner, new_generation, p_id, 1,
    jsonb_build_object('protocol', 1, 'generation', new_generation, 'id', p_id, 'kind', 'seed',
      'parent', null, 'frontier', null), snapshot_hash, '', receipt);
  update sync_private.accounts set generation = new_generation, sequence = 1, head = p_id, tips = array[p_id], archive_bytes = bytes,
    last_erasure = jsonb_build_object('id', p_id, 'fromGeneration', p_generation, 'fromSequence', p_sequence,
      'fingerprint', encode(sha256(convert_to(p_snapshot::text, 'UTF8')), 'hex'), 'result', receipt)
    where owner = account.owner;
  return receipt;
end $$;

create function public.sync_close(p_generation uuid, p_sequence bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_variable
declare account sync_private.accounts := sync_private.active_account();
begin
  if p_generation is distinct from account.generation or p_sequence is distinct from account.sequence then
    raise exception 'sync_closure_stale' using errcode = '22023';
  end if;
  delete from sync_private.revisions where owner = account.owner;
  delete from sync_private.observations where owner = account.owner;
  delete from sync_private.chunks where owner = account.owner;
  update sync_private.accounts set enabled = false, generation = gen_random_uuid(), sequence = 0,
    head = null, tips = '{}', archive_bytes = 0, last_erasure = null where owner = account.owner;
  -- No Storage objects exist in this release. Auth identity and sessions cascade-delete atomically.
  delete from auth.users where id = account.owner;
  return jsonb_build_object('closed', true);
end $$;

revoke all on all functions in schema sync_private from public, anon, authenticated;
revoke all on function public.sync_enroll(), public.sync_status(), public.sync_pull(uuid,bigint,bigint,integer,boolean), public.sync_chunks(uuid,text),
  public.sync_commit(jsonb), public.sync_erase(uuid,bigint,uuid,jsonb), public.sync_close(uuid,bigint) from public, anon, authenticated;
grant execute on function public.sync_enroll(), public.sync_status(), public.sync_pull(uuid,bigint,bigint,integer,boolean), public.sync_chunks(uuid,text),
  public.sync_commit(jsonb), public.sync_erase(uuid,bigint,uuid,jsonb), public.sync_close(uuid,bigint) to authenticated;
