-- D045: one online account state. Retain old data as sealed recovery staging;
-- never choose a competing branch or discard an existing learner's data.
revoke all on function public.sync_enroll(), public.sync_status(), public.sync_pull(uuid,bigint,bigint,integer,boolean), public.sync_chunks(uuid,text),
  public.sync_commit(jsonb), public.sync_erase(uuid,bigint,uuid,jsonb), public.sync_close(uuid,bigint) from public, anon, authenticated;

create schema account_private;
revoke all on schema account_private from public, anon, authenticated;
create table account_private.states (
  owner uuid primary key, -- retained disabled tombstone on explicit closure
  enabled boolean not null default true,
  revision uuid not null default gen_random_uuid(),
  snapshot text
);
create table account_private.observations (
  owner uuid not null references account_private.states(owner),
  kind text not null,
  id text not null,
  id_hash bytea not null,
  fingerprint bytea not null,
  primary key (owner, kind, id_hash)
);
alter table account_private.states enable row level security;
alter table account_private.observations enable row level security;
revoke all on all tables in schema account_private from public, anon, authenticated;

create function account_private.subject() returns uuid
language plpgsql security definer set search_path = '' as $$
declare subject uuid := auth.uid();
begin
  -- Serialize with Auth deletion/ban and other operations for this subject.
  -- The JWT is verified by Auth/PostgREST; its owner is never a request argument.
  perform 1 from auth.users u where u.id = subject and u.email_confirmed_at is not null
    and not coalesce(u.is_anonymous, false) and u.deleted_at is null
    and (u.banned_until is null or u.banned_until <= now()) for update;
  if not found or not exists (
    select 1 from auth.sessions s where s.user_id = subject
      and s.id::text = auth.jwt()->>'session_id'
      and (s.not_after is null or s.not_after > now())
  ) then raise exception 'account_identity_unavailable' using errcode = '42501'; end if;
  return subject;
end $$;

create function account_private.defaults() returns text
language sql immutable set search_path = '' as $$
  select '{"schemaVersion":2,"data":{"completed":{},"scores":{"Security architecture":0,"Cyber-risk management":1,"Governance":0,"Compliance":0,"Security operations":0,"Executive reporting":2},"journal":[],"achievements":[]}}'::text;
$$;

create function account_private.envelope(state account_private.states) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('protocol',1,'owner',state.owner,'revision',state.revision,'snapshot',state.snapshot);
$$;

create function account_private.current_state() returns account_private.states
language plpgsql security definer set search_path = '' as $$
declare subject uuid := account_private.subject(); state account_private.states;
begin
  -- The old protocol is read-only to operators. No automatic import or branch choice.
  if exists (select 1 from sync_private.accounts a where a.owner = subject and not a.enabled) then
    raise exception 'account_unavailable' using errcode = '42501';
  end if;
  if exists (select 1 from sync_private.revisions r where r.owner = subject) then
    raise exception 'legacy_account_requires_recovery' using errcode = 'P0001';
  end if;
  insert into account_private.states(owner,snapshot) values(subject,account_private.defaults()) on conflict do nothing;
  select * into state from account_private.states s where s.owner = subject for update;
  if not state.enabled then raise exception 'account_unavailable' using errcode = '42501'; end if;
  return state;
end $$;

-- PostgreSQL text/JSONB cannot represent U+0000 or lone UTF-16 surrogates,
-- which existing JS file backups accept. Retain serialized JSON verbatim and use
-- only this private, injective projection for validation/identity hashes. A '~'
-- becomes '~007e'; NUL/surrogate code units become '~hhhh'. Astral scalars and
-- escaped surrogate pairs produce the same two units. No client codec is needed.
create function account_private.project_codepoint(code integer) returns text
language sql immutable strict set search_path = '' as $$
  select case
    when code = 0 or code = 126 or code between 55296 and 57343 then '~' || lpad(to_hex(code),4,'0')
    when code > 65535 then '~' || to_hex(55296 + ((code-65536) / 1024)) || '~' || to_hex(56320 + ((code-65536) % 1024))
    else chr(code) end;
$$;

create function account_private.project_string_piece(piece text) returns text
language plpgsql immutable strict set search_path = '' as $$
begin
  if left(piece,1) = chr(92) then
    if substr(piece,2,1) = 'u' then
      return account_private.project_codepoint(('x' || substr(piece,3,4))::bit(16)::integer);
    end if;
    return case substr(piece,2,1)
      when 'b' then chr(8) when 'f' then chr(12) when 'n' then chr(10)
      when 'r' then chr(13) when 't' then chr(9) else substr(piece,2,1) end;
  end if;
  if length(piece) = 1 then return account_private.project_codepoint(ascii(piece)); end if;
  return piece;
end $$;

create function account_private.project_string(token text) returns text
language sql immutable strict set search_path = '' as $$
  -- Match whole safe runs to avoid per-character work/quadratic concatenation.
  select to_jsonb(coalesce(string_agg(account_private.project_string_piece(m[1]),''),''))::text
  from regexp_matches(substr(token,2,length(token)-2),
    E'\\\\u[0-9a-fA-F]{4}|\\\\.|[^\\\\~' || chr(65536) || '-' || chr(1114111) || ']+|.', 'g') m;
$$;

create function account_private.project_snapshot(source text) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare projected text;
begin
  if source is null or octet_length(source) > 16777216 then
    raise exception 'account_snapshot_invalid_or_too_large' using errcode = '22023';
  end if;
  -- json checks syntax without JSONB's Unicode decoding restriction. Never
  -- extract a decoded text value from it; that would reintroduce the restriction.
  begin perform source::json;
  exception when invalid_text_representation then
    raise exception 'account_snapshot_invalid' using errcode = '22023';
  end;
  select string_agg(case when left(m[1],1) = '"' then account_private.project_string(m[1]) else m[1] end,'')
    into projected from regexp_matches(source, E'"(?:[^"\\\\]|\\\\.)*"|[^"]+', 'g') m;
  return projected::jsonb;
end $$;

-- Server structural/version fence; domain/FSRS validation stays in validateState.
-- Compatible unknown extensions are retained as JSON values, not interpreted.
create function account_private.validate_snapshot(snapshot jsonb) returns void
language plpgsql set search_path = '' as $$
declare state jsonb; field text; item jsonb; score jsonb; year numeric; month integer; day integer; days integer[];
begin
  if snapshot is null or jsonb_typeof(snapshot) <> 'object'
    or snapshot->'schemaVersion' is distinct from '2'::jsonb
    or (select count(*) from jsonb_object_keys(snapshot)) <> 2
    or jsonb_typeof(snapshot->'data') is distinct from 'object' then
    raise exception 'account_snapshot_invalid' using errcode = '22023';
  end if;
  state := snapshot->'data';
  if jsonb_typeof(state->'completed') is distinct from 'object'
    or jsonb_typeof(state->'scores') is distinct from 'object'
    or jsonb_typeof(state->'journal') is distinct from 'array'
    or jsonb_typeof(state->'achievements') is distinct from 'array' then
    raise exception 'account_state_invalid' using errcode = '22023';
  end if;
  foreach field in array array['readingProgress','reviewProgress','questionAttempts','scenarioResponses','resourceProgress','portfolio','studyPreferences'] loop
    if state ? field and (jsonb_typeof(state->field) <> 'object' or state->field->'schemaVersion' is distinct from '1'::jsonb) then
      raise exception 'account_namespace_version_unsupported' using errcode = '22023';
    end if;
  end loop;
  if state ? 'displayPreferences' and state->'displayPreferences'->'schema' is distinct from '1'::jsonb then
    raise exception 'account_namespace_version_unsupported' using errcode = '22023';
  end if;
  state := snapshot->'data';
  if exists(select 1 from jsonb_each(state->'completed') e where jsonb_typeof(e.value) <> 'boolean') then
    raise exception 'account_state_invalid' using errcode = '22023';
  end if;
  for score in select value from jsonb_each(state->'scores') loop
    if jsonb_typeof(score) <> 'number' then raise exception 'account_state_invalid' using errcode = '22023'; end if;
    if (score::text)::numeric not between 0 and 4 or trunc((score::text)::numeric) <> (score::text)::numeric then
      raise exception 'account_state_invalid' using errcode = '22023';
    end if;
  end loop;
  foreach field in array array['journal','achievements'] loop
    for item in select value from jsonb_array_elements(state->field) loop
      if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string' or item->>'id' = ''
        or jsonb_typeof(item->'date') is distinct from 'string' or (item->>'date') !~ '^[0-9]{4,}-[0-9]{2}-[0-9]{2}$'
        or jsonb_typeof(item->'title') is distinct from 'string' or jsonb_typeof(item->'body') is distinct from 'string' then
        raise exception 'account_state_invalid' using errcode = '22023';
      end if;
      -- Use the file validator's proleptic calendar, including year 0000;
      -- PostgreSQL's date cast would reject a compatible legacy year zero.
      year := split_part(item->>'date','-',1)::numeric;
      month := split_part(item->>'date','-',2)::integer;
      day := split_part(item->>'date','-',3)::integer;
      days := array[31,case when mod(year,4)=0 and (mod(year,100)<>0 or mod(year,400)=0) then 29 else 28 end,31,30,31,30,31,31,30,31,30,31];
      if month not between 1 and 12 or day not between 1 and days[month] then
        raise exception 'account_state_invalid' using errcode = '22023';
      end if;
    end loop;
    if exists (select 1 from jsonb_array_elements(state->field) e group by e->>'id' having count(*) > 1) then
      raise exception 'account_state_invalid' using errcode = '22023';
    end if;
  end loop;
  if state ? 'displayPreferences' and (jsonb_typeof(state->'displayPreferences') <> 'object'
    or jsonb_typeof(state->'displayPreferences'->'theme') is distinct from 'string'
    or state->'displayPreferences'->>'theme' not in ('system','light','dark')) then
    raise exception 'account_state_invalid' using errcode = '22023';
  end if;
  -- Every present known record collection has the existing array shape.
  foreach field in array array['readingProgress','resourceProgress'] loop
    if state ? field and jsonb_typeof(state->field->'entries') is distinct from 'array' then
      raise exception 'account_state_invalid' using errcode = '22023';
    end if;
  end loop;
end $$;

create function account_private.observe(subject uuid, snapshot jsonb) returns void
language plpgsql set search_path = '' as $$
declare path text[]; items jsonb; item jsonb; observed_kind text; candidate_hash bytea; candidate_id text; candidate_id_hash bytea; old account_private.observations;
begin
  foreach path slice 1 in array array[
    ['reviewProgress','events'], ['questionAttempts','attempts'], ['questionAttempts','selfAssessments'],
    ['scenarioResponses','responses'], ['scenarioResponses','selfAssessments'], ['portfolio','appraisals']
  ] loop
    if not snapshot->'data' ? path[1] then continue; end if;
    items := snapshot->'data' #> path;
    if jsonb_typeof(items) is distinct from 'array' then raise exception 'account_observations_invalid' using errcode = '22023'; end if;
    if exists (select 1 from jsonb_array_elements(items) e group by e->>'id' having count(*) > 1) then
      raise exception 'account_observation_duplicate' using errcode = '22023';
    end if;
    observed_kind := array_to_string(path,'.');
    for item in select value from jsonb_array_elements(items) loop
      if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string' or item->>'id' = '' then
        raise exception 'account_observation_invalid' using errcode = '22023';
      end if;
      candidate_id := item->>'id';
      candidate_id_hash := sha256(convert_to(candidate_id,'UTF8'));
      candidate_hash := sha256(convert_to(item::text,'UTF8'));
      select o.* into old from account_private.observations o
        where o.owner = subject and o.kind = observed_kind and o.id_hash = candidate_id_hash;
      if found then
        if old.id <> candidate_id then raise exception 'account_observation_hash_collision' using errcode = '22023'; end if;
        if old.fingerprint <> candidate_hash then raise exception 'account_observation_id_reused' using errcode = '22023'; end if;
      else
        insert into account_private.observations values(subject,observed_kind,candidate_id,candidate_id_hash,candidate_hash);
      end if;
    end loop;
  end loop;
  -- Bound retained identity metadata even if snapshots remove old observations.
  -- 128 MiB includes the projection's at-most-fivefold string expansion.
  if (select count(*) > 100000 or coalesce(sum(octet_length(o.id) + 128),0) > 134217728
      from account_private.observations o where o.owner = subject) then
    raise exception 'account_observation_limit' using errcode = '54000';
  end if;
end $$;

create function public.account_load() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin return account_private.envelope(account_private.current_state()); end $$;

create function public.account_save(p_expected_revision uuid, p_snapshot text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare state account_private.states := account_private.current_state(); projected jsonb;
begin
  if p_expected_revision is distinct from state.revision then raise exception 'account_revision_stale' using errcode = 'PT409'; end if;
  projected := account_private.project_snapshot(p_snapshot);
  perform account_private.validate_snapshot(projected);
  perform account_private.observe(state.owner,projected);
  update account_private.states s set snapshot = p_snapshot, revision = gen_random_uuid()
    where s.owner = state.owner returning * into state;
  return account_private.envelope(state);
end $$;

create function public.account_reset(p_expected_revision uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare state account_private.states := account_private.current_state();
begin
  if p_expected_revision is distinct from state.revision then raise exception 'account_revision_stale' using errcode = 'PT409'; end if;
  delete from account_private.observations o where o.owner = state.owner;
  update account_private.states s set snapshot = account_private.defaults(), revision = gen_random_uuid()
    where s.owner = state.owner returning * into state;
  return account_private.envelope(state);
end $$;

create function public.account_close(p_expected_revision uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare state account_private.states := account_private.current_state();
begin
  if p_expected_revision is distinct from state.revision then raise exception 'account_revision_stale' using errcode = 'PT409'; end if;
  delete from account_private.observations o where o.owner = state.owner;
  update account_private.states s set snapshot = null, enabled = false, revision = gen_random_uuid() where s.owner = state.owner;
  -- Only empty legacy accounts reach this function; preserve their disabled tombstone too.
  update sync_private.accounts a set enabled = false where a.owner = state.owner;
  delete from auth.users u where u.id = state.owner;
  return jsonb_build_object('closed',true);
end $$;

revoke all on all functions in schema account_private from public, anon, authenticated;
revoke all on function public.account_load(), public.account_save(uuid,text), public.account_reset(uuid), public.account_close(uuid) from public, anon, authenticated;
grant execute on function public.account_load(), public.account_save(uuid,text), public.account_reset(uuid), public.account_close(uuid) to authenticated;
