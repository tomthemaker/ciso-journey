import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { api, mail, settings, sql } from '../../scripts/sync-local.mjs';
import { empty } from '../../src/state.ts';
import { validateState, createBackup, validateBackup } from '../../src/backup.ts';
import { enrollCard, applyReview } from '../../src/reviews.ts';
import { appendEvidence, appendAppraisal } from '../../src/portfolio.ts';
const { key } = settings();
async function request(path, token, body, method = 'POST') {
  if (path === '/rest/v1/rpc/account_save' && body && typeof body.p_snapshot !== 'string') {
    body = { ...body, p_snapshot: JSON.stringify(body.p_snapshot) };
  }
  const response = await fetch(`${api}${path}`, { method, headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (response.status === 200 && /^\/rest\/v1\/rpc\/account_(load|save|reset)$/.test(path)) {
    assert.equal(typeof data.snapshot, 'string', 'Wire snapshot is serialized JSON');
    data.snapshot = JSON.parse(data.snapshot);
  }
  return { status: response.status, data };
}
async function rpc(user, name, body = {}) {
  const response = await request(`/rest/v1/rpc/account_${name}`, user?.access_token, body);
  assert.equal(response.status, 200, `${name}: ${JSON.stringify(response.data)}`);
  return response.data;
}
async function denied(user, name, body = {}, message) {
  const result = await request(`/rest/v1/rpc/account_${name}`, user?.access_token, body);
  assert.ok(result.status >= 400, `${name} unexpectedly succeeded`);
  if (message) assert.match(result.data.message, message);
  return result;
}
async function user(label) {
  const email = `sync-${label}-${randomUUID()}@example.test`;
  const requested = await request('/auth/v1/otp', null, { email, create_user: true });
  assert.equal(requested.status, 200);
  let verification;
  for (let i = 0; i < 30 && !verification; i++) {
    const inbox = await (await fetch(`${mail}/api/v1/messages`)).json();
    const message = inbox.messages.find(m => m.To.some(t => t.Address === email));
    if (message) {
      const detail = await (await fetch(`${mail}/api/v1/message/${message.ID}`)).json();
      const link = detail.HTML.match(/href="([^"]+)"/)?.[1];
      if (link) { const url = new URL(link.replaceAll('&amp;', '&')); verification = { token_hash: url.searchParams.get('token'), type: url.searchParams.get('type') }; }
    }
    if (!verification) await new Promise(resolve => setTimeout(resolve, 100));
  }
  assert.ok(verification?.token_hash, 'Synthetic one-time email token captured locally');
  const verified = await request('/auth/v1/verify', null, verification);
  assert.equal(verified.status, 200, 'One-time email token verifies');
  assert.ok(verified.data.user.email_confirmed_at);
  assert.ok((await request('/auth/v1/verify', null, verification)).status >= 400, 'Email token cannot be replayed');
  return verified.data;
}
const snapshot = state => ({ schemaVersion: 2, data: structuredClone(state) });
const save = (u, current, state) => rpc(u, 'save', { p_expected_revision: current.revision, p_snapshot: snapshot(state) });

test('required account state on real local Auth/Postgres/API', { timeout: 300000 }, async t => {
  const a = await user('a'), b = await user('b');
  let A, B;
  const fixture = validateBackup(JSON.parse(readFileSync(new URL('../fixtures/v1/mixed-progress.json', import.meta.url))));
  fixture.readingProgress = { schemaVersion: 1, entries: [{ contentRef: { id: 'synthetic-lesson', version: 1 }, completed: true }] };
  fixture.displayPreferences = { schema: 1, theme: 'dark' };
  fixture.questionAttempts = { schemaVersion: 1, attempts: [], selfAssessments: [] };
  fixture.scenarioResponses = { schemaVersion: 1, responses: [], selfAssessments: [] };
  fixture.resourceProgress = { schemaVersion: 1, entries: [] };
  fixture.compatibleExtension = { fictional: 'retained' };
  fixture.achievements.push({id:'year-zero',date:'0000-02-29',title:'Calendar compatibility',body:'Synthetic legacy date'});
  enrollCard(fixture, { id: 'synthetic-card', version: 1 }, '2026-01-01T00:00:00.000Z');
  applyReview(fixture, { eventId: 'review-a', contentRef: { id: 'synthetic-card', version: 1 }, rating: 'Good', now: '2026-01-01T00:00:00.000Z', timeZone: 'UTC' });
  appendEvidence(fixture, { id: 'evidence', title: 'Fictional study', url: 'https://example.test/evidence', notes: '<script>literal</script>' });
  appendAppraisal(fixture, { id: 'appraisal', date: '2026-01-01', competency: 'Governance', level: 'Explain', provenance: 'self-assessment', scope: 'Fictional', rationale: 'Synthetic reflection', evidenceIds: ['evidence'], responseIds: [] });
  validateState(fixture);

  await t.test('anonymous/forged identity denied; concurrent bootstrap returns one server-owned default', async () => {
    for (const [name, body] of Object.entries({ load: {}, save: { p_expected_revision: randomUUID(), p_snapshot: snapshot(empty()) }, reset: { p_expected_revision: randomUUID() }, close: { p_expected_revision: randomUUID() } })) await denied(null, name, body);
    const loads = await Promise.all(Array.from({ length: 8 }, () => rpc(a, 'load')));
    A = loads[0]; for (const result of loads) assert.deepEqual(result,A);
    assert.equal(A.owner,a.user.id); assert.equal(A.protocol,1);
    assert.deepEqual(A.snapshot,snapshot(empty()));
    B = await rpc(b,'load'); assert.notEqual(A.revision,B.revision);
    const parts = a.access_token.split('.');
    const claims = JSON.parse(Buffer.from(parts[1],'base64url')); claims.sub = b.user.id;
    parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url');
    await denied({ access_token: parts.join('.') },'load');
  });
  await t.test('no writable tables, ownership arguments, helper execution or legacy browser protocol', async () => {
    for (const table of ['states','observations','accounts']) for (const method of ['GET','POST','PATCH','DELETE']) {
      assert.ok((await request(`/rest/v1/${table}`,a.access_token,method === 'GET' ? undefined : { owner: b.user.id },method)).status >= 400);
    }
    await denied(a,'load',{ owner: b.user.id });
    await denied(a,'save',{ p_expected_revision: A.revision, p_snapshot: snapshot(fixture), owner: b.user.id });
    for (const name of ['sync_enroll','sync_status','sync_commit','sync_pull','sync_chunks','sync_erase','sync_close']) {
      assert.ok((await request(`/rest/v1/rpc/${name}`,a.access_token,{})).status >= 400);
    }
    for (const schema of ['account_private','sync_private']) {
      assert.equal(sql(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='${schema}' and c.relkind='r' and (not c.relrowsecurity or has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE'));`),'0');
      assert.equal(sql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='${schema}' and (has_function_privilege('authenticated',p.oid,'EXECUTE') or has_function_privilege('anon',p.oid,'EXECUTE'));`),'0');
    }
    assert.equal(sql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'sync_%' and has_function_privilege('authenticated',p.oid,'EXECUTE');`),'0');
    const rls = sql(`begin; grant usage on schema account_private to authenticated; grant select,update on all tables in schema account_private to authenticated; set local role authenticated; select set_config('request.jwt.claim.sub','${a.user.id}',true); select count(*) from account_private.states; update account_private.states set owner='${b.user.id}' where owner='${a.user.id}'; rollback;`);
    assert.match(rls,/\n0\nUPDATE 0\n/);
    const paths = sql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where (n.nspname='account_private' or (n.nspname='public' and p.proname like 'account_%')) and not ('search_path=""'=any(p.proconfig));`);
    assert.equal(paths,'0');
  });
  await t.test('two devices CAS; lost acknowledgement retry and stale reset cannot falsely succeed', async () => {
    const original = A;
    A = await save(a,A,fixture);
    const retry = await denied(a,'save',{ p_expected_revision: original.revision,p_snapshot: snapshot(fixture) },/account_revision_stale/);
    assert.equal(retry.status,409);
    assert.deepEqual(await rpc(a,'load'),A);
    const left = structuredClone(fixture), right = structuredClone(fixture);
    left.journal[0].body = 'Device one'; right.journal[0].body = 'Device two';
    const outcomes = await Promise.all([left,right].map(state => request('/rest/v1/rpc/account_save',a.access_token,{ p_expected_revision:A.revision,p_snapshot:snapshot(state) })));
    assert.deepEqual(outcomes.map(r=>r.status).sort(),[200,409]);
    A = outcomes.find(r=>r.status===200).data;
    assert.deepEqual(await rpc(a,'load'),A);
    assert.deepEqual((await rpc(b,'load')).snapshot,snapshot(empty()));
    await denied(b,'save',{ p_expected_revision:A.revision,p_snapshot:snapshot(fixture) },/account_revision_stale/);
    await denied(a,'reset',{p_expected_revision:original.revision},/account_revision_stale/);
    await denied(a,'close',{p_expected_revision:original.revision},/account_revision_stale/);
    assert.deepEqual(A.snapshot.data.reviewProgress,fixture.reviewProgress);
    assert.deepEqual(validateBackup(createBackup(A.snapshot.data)),A.snapshot.data);
    assert.deepEqual(validateBackup({app:'CISO Journey',version:1,data:fixture}),fixture);
  });
  await t.test('malformed/future snapshots and observation rewrites reject atomically', async () => {
    const bad = [];
    bad.push(null, {}, { ...snapshot(fixture),schemaVersion:99 },{ ...snapshot(fixture),owner:b.user.id });
    for (const field of ['readingProgress','reviewProgress','questionAttempts','scenarioResponses','resourceProgress','portfolio','studyPreferences']) {
      const value=snapshot(fixture);value.data[field]={schemaVersion:99};bad.push(value);
    }
    for (const [field,value] of [['completed',{w1:'true'}],['scores',{Governance:8}],['journal',[{id:'x',date:'2026-02-30',title:'bad',body:''}]],['displayPreferences',{schema:1,theme:'future'}],['reviewProgress',{schemaVersion:1}],['readingProgress',{schemaVersion:1,entries:{}}]]) {
      const valueSnapshot=snapshot(fixture);valueSnapshot.data[field]=value;bad.push(valueSnapshot);
    }
    const rewritten=snapshot(fixture);rewritten.data.reviewProgress.events[0].timeZone='Europe/Zurich';bad.push(rewritten);
    const duplicate=snapshot(fixture);duplicate.data.reviewProgress.events.push(structuredClone(duplicate.data.reviewProgress.events[0]));bad.push(duplicate);
    for (const p_snapshot of bad) {
      const rejected=await denied(a,'save',{p_expected_revision:A.revision,p_snapshot});
      assert.equal(rejected.status,400);assert.equal(rejected.data.code,'22023');
    }
    assert.deepEqual(await rpc(a,'load'),A);
    // A removed ID cannot be reused later with modified evidence.
    A=await save(a,A,empty());
    await denied(a,'save',{p_expected_revision:A.revision,p_snapshot:rewritten},/observation_id_reused/);
    A=await save(a,A,fixture);
  });
  await t.test('valid backups preserve long IDs, every UTF-16 code unit, and opaque extension keys without collisions', async () => {
    const state = empty();
    const opaque = '\0 ~0000 ~007e \\u0000 \\ud800 " \\ / \b\f\n\r\t 😀 \ud800 \udfff';
    state.journal.push({ id: opaque, date: '2026-01-01', title: opaque, body: opaque });
    state.compatibleExtension = Object.fromEntries(['\0','~0000','~','~007e','\\u0000','😀','\ud800','\udfff'].map(key => [key, { [opaque]: opaque }]));
    // Beyond both the previous 256-char limit and a PostgreSQL btree entry.
    // Random hex avoids TOAST/compression accidentally hiding the index limit.
    const eventId = Array.from({length:400}, () => randomUUID()).join('') + opaque;
    enrollCard(state,{id:'opaque-card',version:1},'2026-01-01T00:00:00.000Z');
    applyReview(state,{eventId,contentRef:{id:'opaque-card',version:1},rating:'Good',now:'2026-01-01T00:00:00.000Z',timeZone:'UTC'});
    validateState(state);
    assert.deepEqual(validateBackup(createBackup(state)),state);
    assert.deepEqual(validateBackup({app:'CISO Journey',version:1,data:state}),state);
    A = await save(a,A,state);
    assert.deepEqual(A.snapshot.data,state);
    assert.deepEqual((await rpc(a,'load')).snapshot.data,state);
    assert.deepEqual(validateBackup(createBackup(A.snapshot.data)),state);
    const original = JSON.stringify(snapshot(state));
    assert.equal(sql(`select snapshot = '${original.replaceAll("'","''")}' from account_private.states where owner='${a.user.id}'`),'t');
    // Equivalent Unicode escapes, whitespace and object order retain identities.
    const escaped = JSON.stringify(snapshot(state),null,2).replaceAll('😀','\\uD83D\\uDE00').replaceAll('~','\\u007e').replaceAll('"data"','"\\u0064ata"');
    A = await rpc(a,'save',{p_expected_revision:A.revision,p_snapshot:escaped});
    assert.deepEqual(A.snapshot.data,state);
    const reordered = structuredClone(state);
    const event = reordered.reviewProgress.events[0];
    reordered.reviewProgress.events[0] = Object.fromEntries(Object.entries(event).reverse());
    A = await save(a,A,reordered);
    const changed = structuredClone(state);
    changed.reviewProgress.events[0].timeZone = 'Europe/Zurich';
    await denied(a,'save',{p_expected_revision:A.revision,p_snapshot:snapshot(changed)},/observation_id_reused/);
    // Literal escape-looking IDs and actual NUL IDs must remain distinct.
    const ids = ['~0000','\0','\\u0000','😀','\ud83d\ude00','\ud800','~d800'];
    const countBefore = Number(sql(`select count(*) from account_private.observations where owner='${a.user.id}'`));
    for (const id of ids) {
      const separate = empty();
      enrollCard(separate,{id:'identity-card',version:1},'2026-01-01T00:00:00.000Z');
      applyReview(separate,{eventId:id,contentRef:{id:'identity-card',version:1},rating:'Good',now:'2026-01-01T00:00:00.000Z',timeZone:'UTC'});
      A = await save(a,A,separate);
      assert.deepEqual(A.snapshot.data,separate);
    }
    assert.equal(Number(sql(`select count(*) from account_private.observations where owner='${a.user.id}'`)),countBefore + new Set(ids).size);
    // Exhaustive UTF-16 coverage catches sentinel, backslash and surrogate edges.
    const units = Array.from({length:65536}, (_,i) => String.fromCharCode(i)).join('');
    const allUnits = empty();
    allUnits.journal.push({id:'all-code-units',date:'2026-01-01',title:'Synthetic Unicode',body:units});
    const projectedUnits = units.replace(/[~\u0000\ud800-\udfff]/g, unit => '~' + unit.charCodeAt(0).toString(16).padStart(4,'0'));
    const sqlSource = JSON.stringify(snapshot(allUnits)).replaceAll("'","''");
    const projected = JSON.parse(sql(`select account_private.project_snapshot('${sqlSource}')::text`));
    assert.equal(projected.data.journal[0].body,projectedUnits);
    A = await save(a,A,allUnits);
    assert.equal((await rpc(a,'load')).snapshot.data.journal[0].body,units);
    const before = A;
    for (const p_snapshot of ['{', 'null', JSON.stringify({schemaVersion:99,data:empty()}), JSON.stringify(snapshot({...empty(),extra:'x'.repeat(16777216)}))]) {
      const result = await denied(a,'save',{p_expected_revision:A.revision,p_snapshot});
      assert.equal(result.data.code,'22023');
    }
    assert.deepEqual(await rpc(a,'load'),before);
  });
  await t.test('live ban, disabled account and deleted session guard otherwise valid JWTs', async () => {
    sql(`update auth.users set banned_until=now()+interval '1 hour' where id='${a.user.id}';`);
    assert.equal((await denied(a,'load',{},/identity_unavailable/)).status,403);
    sql(`update auth.users set banned_until=null where id='${a.user.id}'; update account_private.states set enabled=false where owner='${a.user.id}';`);
    await denied(a,'load',{},/account_unavailable/);
    sql(`update account_private.states set enabled=true where owner='${a.user.id}';`);
    const claims=JSON.parse(Buffer.from(b.access_token.split('.')[1],'base64url'));
    sql(`delete from auth.sessions where id='${claims.session_id}';`);
    assert.equal((await denied(b,'load',{},/identity_unavailable/)).status,403);
  });
  await t.test('explicit reset rotates revision; stale saves never revive reset data', async () => {
    const before=A;
    A=await rpc(a,'reset',{p_expected_revision:A.revision});
    assert.deepEqual(A.snapshot,snapshot(empty()));assert.notEqual(A.revision,before.revision);
    await denied(a,'save',{p_expected_revision:before.revision,p_snapshot:before.snapshot},/account_revision_stale/);
    assert.equal(sql(`select count(*) from account_private.observations where owner='${a.user.id}';`),'0');
    assert.deepEqual(await rpc(a,'load'),A);
  });
  await t.test('populated legacy server data is staged unchanged and browser-inaccessible', async () => {
    const old=await user('legacy');
    // Operator-only fixture invokes the previous protocol to model pre-migration data.
    const request={protocol:1,id:randomUUID(),kind:'append',parent:null,frontier:null,snapshot:snapshot(fixture)};
    sql(`begin; select set_config('request.jwt.claim.sub','${old.user.id}',true); select public.sync_enroll(); select public.sync_commit('${JSON.stringify(request).replaceAll("'","''")}'::jsonb || jsonb_build_object('generation',(select generation from sync_private.accounts where owner='${old.user.id}'))); commit;`);
    const before=sql(`select row_to_json(r) from sync_private.revisions r where owner='${old.user.id}';`);
    await denied(old,'load',{},/legacy_account_requires_recovery/);
    await denied(old,'reset',{p_expected_revision:randomUUID()},/legacy_account_requires_recovery/);
    assert.equal(sql(`select row_to_json(r) from sync_private.revisions r where owner='${old.user.id}';`),before);
    assert.equal(sql(`select count(*) from account_private.states where owner='${old.user.id}';`),'0');
    assert.equal(sql(`select sync_private.unpack(owner,generation,snapshot_hash)='${JSON.stringify(snapshot(fixture)).replaceAll("'","''")}'::jsonb from sync_private.revisions where owner='${old.user.id}';`),'t');
  });
  await t.test('closure purges payload/Auth and fences retained JWT; external deletion also denies', async () => {
    assert.deepEqual(await rpc(a,'close',{p_expected_revision:A.revision}),{closed:true});
    for (const [name,body] of Object.entries({load:{},save:{p_expected_revision:A.revision,p_snapshot:snapshot(fixture)},reset:{p_expected_revision:A.revision},close:{p_expected_revision:A.revision}})) await denied(a,name,body,/identity_unavailable/);
    assert.equal(sql(`select count(*) from auth.users where id='${a.user.id}';`),'0');
    assert.equal(sql(`select count(*) from account_private.states where owner='${a.user.id}' and not enabled and snapshot is null;`),'1');
    const external=await user('external');await rpc(external,'load');sql(`delete from auth.users where id='${external.user.id}';`);
    await denied(external,'load',{},/identity_unavailable/);
  });
});
