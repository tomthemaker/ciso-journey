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
  snapshot jsonb
);
create table account_private.observations (
  owner uuid not null references account_private.states(owner),
  kind text not null,
  id text not null,
  fingerprint bytea not null,
  primary key (owner, kind, id)
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

create function account_private.defaults() returns jsonb
language sql immutable set search_path = '' as $$
  select '{"schemaVersion":2,"data":{"completed":{},"scores":{"Security architecture":0,"Cyber-risk management":1,"Governance":0,"Compliance":0,"Security operations":0,"Executive reporting":2},"journal":[],"achievements":[]}}'::jsonb;
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

-- Server structural/version fence; domain/FSRS validation stays in validateState.
-- Compatible unknown extensions are retained as JSON values, not interpreted.
create function account_private.validate_snapshot(snapshot jsonb) returns void
language plpgsql set search_path = '' as $$
declare state jsonb; field text; item jsonb; score jsonb; year numeric; month integer; day integer; days integer[];
begin
  perform sync_private.validate_snapshot(snapshot);
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
declare path text[]; items jsonb; item jsonb; observed_kind text; candidate_hash bytea; old bytea;
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
      if jsonb_typeof(item) <> 'object' or jsonb_typeof(item->'id') is distinct from 'string' or length(item->>'id') not between 1 and 256 then
        raise exception 'account_observation_invalid' using errcode = '22023';
      end if;
      candidate_hash := sha256(convert_to(item::text,'UTF8'));
      select o.fingerprint into old from account_private.observations o
        where o.owner = subject and o.kind = observed_kind and o.id = item->>'id';
      if found then
        if old <> candidate_hash then raise exception 'account_observation_id_reused' using errcode = '22023'; end if;
      else
        insert into account_private.observations values(subject,observed_kind,item->>'id',candidate_hash);
      end if;
    end loop;
  end loop;
  -- Bound retained identity metadata even if snapshots remove old observations.
  if (select count(*) from account_private.observations o where o.owner = subject) > 100000 then
    raise exception 'account_observation_limit' using errcode = '54000';
  end if;
end $$;

create function public.account_load() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin return account_private.envelope(account_private.current_state()); end $$;

create function public.account_save(p_expected_revision uuid, p_snapshot jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare state account_private.states := account_private.current_state();
begin
  if p_expected_revision is distinct from state.revision then raise exception 'account_revision_stale' using errcode = 'PT409'; end if;
  perform account_private.validate_snapshot(p_snapshot);
  perform account_private.observe(state.owner,p_snapshot);
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
revoke all on function public.account_load(), public.account_save(uuid,jsonb), public.account_reset(uuid), public.account_close(uuid) from public, anon, authenticated;
grant execute on function public.account_load(), public.account_save(uuid,jsonb), public.account_reset(uuid), public.account_close(uuid) to authenticated;
