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
  const response = await fetch(`${api}${path}`, { method, headers: { apikey: key, ...(token ? { Authorization: `Bearer ${token}` } : {}), 'Content-Type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const text = await response.text();
  return { status: response.status, data: text ? JSON.parse(text) : null };
}
async function rpc(user, name, body = {}) {
  const response = await request(`/rest/v1/rpc/sync_${name}`, user?.access_token, body);
  assert.equal(response.status, 200, `${name}: ${JSON.stringify(response.data)}`);
  return response.data;
}
async function denied(user, name, body = {}, message) {
  const result = await request(`/rest/v1/rpc/sync_${name}`, user?.access_token, body);
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
const append = (status, state, parent = status.head) => ({ protocol: 1, generation: status.generation, id: randomUUID(), kind: 'append', parent, frontier: null, snapshot: snapshot(state) });
const commit = (u, p_request) => rpc(u, 'commit', { p_request });
async function archive(u) {
  const status = await rpc(u, 'status'), revisions = [];
  let after = 0;
  while (after < status.sequence) {
    const page = await rpc(u, 'pull', { p_generation: status.generation, p_after: after, p_through: status.sequence, p_limit: 2 });
    assert.equal(page.owner, u.user.id);
    assert.equal(page.generation, status.generation);
    assert.ok(page.revisions.length);
    revisions.push(...page.revisions); after = revisions.at(-1).sequence;
  }
  return { format: 'ciso-journey-sync', version: 1, status, revisions };
}
async function compactArchive(u) {
  const status = await rpc(u, 'status'), revisions = [], chunks = [];
  let after = 0, hash = '';
  while (after < status.sequence) {
    const page = await rpc(u, 'pull', { p_generation: status.generation, p_after: after, p_through: status.sequence, p_limit: 2, p_compact: true });
    assert.ok(page.revisions.length); revisions.push(...page.revisions); after = revisions.at(-1).sequence;
  }
  while (true) {
    const page = await rpc(u, 'chunks', { p_generation: status.generation, p_after: hash });
    assert.equal(page.owner, u.user.id); if (!page.chunks.length) break;
    chunks.push(...page.chunks); hash = chunks.at(-1).hash;
  }
  return { format: 'ciso-journey-sync', version: 1, status, revisions, chunks };
}
function unpackArchive(saved, hash, cache = new Map()) {
  const nodes = new Map(saved.chunks.map(c => [c.hash, c.node]));
  function unpack(hash) {
    if (cache.has(hash)) return cache.get(hash);
    const node = nodes.get(hash); assert.ok(node, 'Every archived reference exists');
    const result = node.kind === 'value' ? node.value : node.kind === 'object'
      ? Object.fromEntries(Object.entries(node.children).map(([key, child]) => [key, unpack(child)]))
      : node.kind === 'array' ? node.children.map(unpack) : node.children.flatMap(unpack);
    cache.set(hash, result); return result;
  }
  return unpack(hash);
}
function data(archive, id) { return archive.revisions.find(r => r.id === id).request.snapshot.data; }

// One isolated integration scenario owns its synthetic identities; never logs session credentials.
test('local Supabase Auth/Postgres/API security and snapshot protocol', { timeout: 300000 }, async t => {
  const a = await user('a'), b = await user('b');
  let A, B, base, left, right, branch, resolution;
  const baseState = validateBackup(JSON.parse(readFileSync(new URL('../fixtures/v1/mixed-progress.json', import.meta.url))));
  baseState.readingProgress = { schemaVersion: 1, entries: [{ contentRef: { id: 'synthetic-lesson', version: 1 }, completed: true }] };
  baseState.displayPreferences = { schema: 1, theme: 'dark' };
  baseState.questionAttempts = { schemaVersion: 1, attempts: [], selfAssessments: [] };
  baseState.scenarioResponses = { schemaVersion: 1, responses: [], selfAssessments: [] };
  baseState.resourceProgress = { schemaVersion: 1, entries: [{ id: 'w1-synthetic', taskId: 'w1', isCustom: false, revisions: [{ version: 1, title: 'Synthetic', platform: 'Test', url: 'https://example.test', type: 'reference', archived: false, changedAt: '2026-01-01T00:00:00.000Z' }], progress: [{ resourceVersion: 1, status: 'in-progress', completedAt: null, notes: 'Private fictional note', evidenceUrl: '', recordedAt: '2026-01-01T00:00:00.000Z' }] }] };
  enrollCard(baseState, { id: 'synthetic-card', version: 1 }, '2026-01-01T00:00:00.000Z');
  appendEvidence(baseState, { id: 'evidence', title: 'Fictional study', url: 'https://example.test/evidence', notes: '<script>literal</script>' });
  appendAppraisal(baseState, { id: 'appraisal', date: '2026-01-01', competency: 'Governance', level: 'Explain', provenance: 'self-assessment', scope: 'Fictional', rationale: 'Synthetic reflection', evidenceIds: ['evidence'], responseIds: [] });
  validateState(baseState);

  await t.test('verified one-time email token, explicit enrollment, anonymous and forged JWT denial', async () => {
    await denied(a, 'status', {}, /account_unavailable/);
    for (const [name, body] of Object.entries({ enroll: {}, status: {}, commit: { p_request: {} }, pull: { p_generation: randomUUID(), p_after: 0, p_through: 0 }, chunks: { p_generation: randomUUID() }, erase: { p_generation: randomUUID(), p_sequence: 0, p_id: randomUUID(), p_snapshot: snapshot(empty()) }, close: { p_generation: randomUUID(), p_sequence: 0 } })) await denied(null, name, body);
    A = await rpc(a, 'enroll'); B = await rpc(b, 'enroll');
    assert.deepEqual(await rpc(a, 'enroll'), A);
    assert.notEqual(A.generation, B.generation);
    const parts = a.access_token.split('.');
    const claims = JSON.parse(Buffer.from(parts[1], 'base64url')); claims.sub = b.user.id;
    parts[1] = Buffer.from(JSON.stringify(claims)).toString('base64url');
    await denied({ access_token: parts.join('.') }, 'status');
    const missingEmail = `not-enrolled-${randomUUID()}@example.test`;
    const login = await request('/auth/v1/otp', null, { email: missingEmail, create_user: false });
    assert.ok(login.status >= 400);
    assert.equal(sql(`select count(*) from auth.users where email = '${missingEmail}';`), '0');
  });
  await t.test('immutable requests, lost acknowledgement retry, parent and owner forgery', async () => {
    base = append(A, baseState); A = await commit(a, base);
    assert.deepEqual(await commit(a, base), A);
    await denied(a, 'commit', { p_request: { ...base, snapshot: snapshot(empty()) } }, /operation_id_reused/);
    await denied(b, 'commit', { p_request: { ...base, id: randomUUID() } }, /generation_changed/);
    await denied(a, 'commit', { p_request: { ...append(A, baseState), owner: b.user.id } }, /request_invalid/);
    await denied(b, 'commit', { p_request: append(B, empty(), base.id) }, /parent_missing/);
    await denied(b, 'pull', { p_generation: A.generation, p_after: 0, p_through: 1 }, /generation_changed/);
    await denied(b, 'chunks', { p_generation: A.generation }, /generation_changed/);
    const bData = await archive(b); assert.equal(bData.revisions.length, 0);
    // B may use the same random operation ID in B's partition; it cannot address A's rows.
    const own = { ...append(B, empty()), id: base.id }; B = await commit(b, own);
    assert.deepEqual(data(await archive(a), base.id), baseState);
    assert.deepEqual(data(await archive(b), base.id), empty());
  });
  await t.test('no direct REST tables, owner mutation, private helper or privilege escape', async () => {
    for (const method of ['GET', 'POST', 'PATCH', 'DELETE']) {
      const response = await request('/rest/v1/accounts', a.access_token, method === 'GET' ? undefined : { owner: b.user.id }, method);
      assert.ok(response.status >= 400);
    }
    const helper = await request('/rest/v1/rpc/subject', a.access_token, {}); assert.ok(helper.status >= 400);
    assert.equal(sql(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='sync_private' and c.relkind='r' and not c.relrowsecurity;`), '0');
    assert.equal(sql(`select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='sync_private' and c.relkind='r' and (has_table_privilege('authenticated',c.oid,'SELECT,INSERT,UPDATE,DELETE') or has_table_privilege('anon',c.oid,'SELECT,INSERT,UPDATE,DELETE'));`), '0');
    // Prove default-deny RLS independently of ACLs, using rolled-back test-only grants.
    const rls = sql(`begin; grant usage on schema sync_private to authenticated; grant select, update on all tables in schema sync_private to authenticated; set local role authenticated; select set_config('request.jwt.claim.sub','${a.user.id}',true); select count(*) from sync_private.accounts; update sync_private.accounts set owner='${b.user.id}' where owner='${a.user.id}'; rollback;`);
    assert.match(rls, /\n0\nUPDATE 0\n/);
    assert.equal(sql(`select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='sync_private' and has_function_privilege('authenticated',p.oid,'EXECUTE');`), '0');
  });
  await t.test('concurrent notes and independent FSRS chains preserve exact before/after history', async () => {
    const first = structuredClone(baseState), second = structuredClone(baseState);
    first.journal[0].body = 'Device A private note'; second.journal[0].body = 'Device B conflicting note';
    applyReview(first, { eventId: 'review-a', contentRef: { id: 'synthetic-card', version: 1 }, rating: 'Good', now: '2026-01-01T00:00:00.000Z', timeZone: 'UTC' });
    applyReview(second, { eventId: 'review-b', contentRef: { id: 'synthetic-card', version: 1 }, rating: 'Again', now: '2026-01-01T00:01:00.000Z', timeZone: 'UTC' });
    left = append(A, first); right = append(A, second);
    const outcomes = await Promise.all([commit(a, left), commit(a, right)]);
    assert.deepEqual(outcomes.map(r => r.outcome).sort(), ['accepted', 'conflict']);
    A = await rpc(a, 'status'); assert.equal(A.tips.length, 2);
    const saved = await archive(a);
    assert.deepEqual(data(saved, left.id), first); assert.deepEqual(data(saved, right.id), second);
    for (const r of saved.revisions) assert.deepEqual(validateBackup(createBackup(r.request.snapshot.data)), r.request.snapshot.data);
    const bad = structuredClone(first); bad.reviewProgress.events[0].timeZone = 'Europe/Zurich';
    await denied(a, 'commit', { p_request: append(A, bad, left.id) }, /observation_id_reused/);
    for (const field of ['reviewProgress', 'portfolio', 'studyPreferences']) {
      const future = snapshot(first); future.data[field] = { schemaVersion: 99 };
      await denied(a, 'commit', { p_request: { ...append(A, first), snapshot: future } }, /namespace_version_unsupported/);
    }
  });
  await t.test('offline branch descendants and stale/simultaneous resolutions cannot hide evidence', async () => {
    const next = structuredClone(right.snapshot.data); next.journal[0].body += ' plus offline descendant';
    branch = append(A, next, right.id); await commit(a, branch);
    const stale = { ...append(A, left.snapshot.data), kind: 'resolve', parent: null, frontier: { sequence: A.sequence, tips: A.tips } };
    await denied(a, 'commit', { p_request: stale }, /resolution_stale/);
    A = await rpc(a, 'status');
    const combined = structuredClone(left.snapshot.data); combined.journal[0].body = 'Explicit combined A and B note';
    resolution = { ...append(A, combined), kind: 'resolve', parent: null, frontier: { sequence: A.sequence, tips: A.tips } };
    const simultaneous = await Promise.all([request('/rest/v1/rpc/sync_commit', a.access_token, { p_request: resolution }), request('/rest/v1/rpc/sync_commit', a.access_token, { p_request: { ...resolution, id: randomUUID() } })]);
    assert.equal(simultaneous.filter(r => r.status === 200).length, 1);
    const winner = simultaneous.find(r => r.status === 200).data;
    const saved = await archive(a); assert.equal(saved.status.tips.length, 1);
    assert.deepEqual(data(saved, branch.id), next); assert.deepEqual(data(saved, winner.head), combined);
    // A late offline child of a resolved-away branch reopens a visible conflict.
    const late = append(saved.status, next, branch.id); const result = await commit(a, late);
    assert.equal(result.outcome, 'conflict'); assert.equal(result.head, winner.head);
    assert.equal((await archive(a)).revisions.length, 6);
    A = result;
  });
  await t.test('consistent paginated full archive and all original snapshots survive JSON export', async () => {
    const saved = await archive(a), restored = JSON.parse(JSON.stringify(saved));
    const compact = JSON.parse(JSON.stringify(await compactArchive(a)));
    for (const revision of compact.revisions) assert.deepEqual(unpackArchive(compact, revision.request.snapshotHash).data, data(saved, revision.id));
    assert.deepEqual(saved, restored);
    for (const revision of restored.revisions) validateState(revision.request.snapshot.data);
    assert.deepEqual(data(restored, base.id), baseState);
    await denied(a, 'pull', { p_generation: A.generation, p_after: 0, p_through: A.sequence + 1 }, /cursor_invalid/);
    await denied(a, 'pull', { p_generation: A.generation, p_after: 0, p_through: A.sequence, p_limit: 1000 }, /cursor_invalid/);
  });
  await t.test('account disable and live Auth ban defeat an otherwise valid JWT', async () => {
    sql(`update sync_private.accounts set enabled=false where owner='${a.user.id}';`);
    for (const name of ['status', 'enroll']) await denied(a, name, {}, /account_unavailable/);
    await denied(a, 'commit', { p_request: append(A, empty()) }, /account_unavailable/);
    sql(`update sync_private.accounts set enabled=true where owner='${a.user.id}'; update auth.users set banned_until=now()+interval '1 hour' where id='${a.user.id}';`);
    await denied(a, 'status', {}, /identity_unavailable/);
    sql(`update auth.users set banned_until=null where id='${a.user.id}';`);
  });
  await t.test('generation erasure purges payloads and blocks old offline queues, retries and cursors', async () => {
    const before = await rpc(a, 'status'), pending = append(before, baseState);
    const erase = { p_generation: before.generation, p_sequence: before.sequence, p_id: randomUUID(), p_snapshot: snapshot(empty()) };
    await denied(a, 'erase', { ...erase, p_sequence: before.sequence - 1 }, /erasure_stale/);
    A = await rpc(a, 'erase', erase); assert.notEqual(A.generation, before.generation);
    assert.deepEqual(await rpc(a, 'erase', erase), A);
    await denied(a, 'erase', { ...erase, p_snapshot: snapshot(baseState) }, /generation_changed/);
    for (const p_request of [base, pending]) await denied(a, 'commit', { p_request }, /generation_changed/);
    await denied(a, 'pull', { p_generation: before.generation, p_after: 0, p_through: before.sequence }, /generation_changed/);
    await denied(a, 'chunks', { p_generation: before.generation }, /generation_changed/);
    assert.equal(sql(`select count(*) from sync_private.chunks where owner='${a.user.id}' and generation='${before.generation}';`), '0');
    const fresh = await archive(a); assert.equal(fresh.revisions.length, 1); assert.deepEqual(data(fresh, A.head), empty());
    // A stale full backup requires a new, explicitly confirmed local copy; never rebase pending uploads.
    assert.deepEqual(data(await archive(b), base.id), empty());
  });
  await t.test('quota fails atomically and leaves immutable history and operation available for retry', async () => {
    const current = await rpc(a, 'status'), pending = append(current, baseState);
    const beforeRows = sql(`select (select count(*) from sync_private.chunks where owner='${a.user.id}'), (select count(*) from sync_private.observations where owner='${a.user.id}');`);
    sql(`update sync_private.accounts set archive_bytes=67108864 where owner='${a.user.id}';`);
    await denied(a, 'commit', { p_request: pending }, /archive_quota/);
    assert.equal((await rpc(a, 'status')).sequence, current.sequence);
    assert.equal(sql(`select (select count(*) from sync_private.chunks where owner='${a.user.id}'), (select count(*) from sync_private.observations where owner='${a.user.id}');`), beforeRows);
    sql(`update sync_private.accounts set archive_bytes=${current.archiveBytes} where owner='${a.user.id}';`);
    A = await commit(a, pending); assert.equal(A.sequence, current.sequence + 1);
  });
  await t.test('closure deletes Auth identity and all data; stale JWT cannot read, write or re-enroll', async () => {
    const before = await rpc(a, 'status');
    assert.deepEqual(await rpc(a, 'close', { p_generation: before.generation, p_sequence: before.sequence }), { closed: true });
    for (const name of ['enroll', 'status']) await denied(a, name, {}, /identity_unavailable/);
    await denied(a, 'commit', { p_request: append(before, baseState) }, /identity_unavailable/);
    await denied(a, 'pull', { p_generation: before.generation, p_after: 0, p_through: before.sequence }, /identity_unavailable/);
    assert.equal(sql(`select count(*) from auth.users where id='${a.user.id}';`), '0');
    assert.equal(sql(`select count(*) from sync_private.chunks where owner='${a.user.id}';`), '0');
    assert.equal(sql(`select enabled from sync_private.accounts where owner='${a.user.id}';`), 'f');
    B = await rpc(b, 'status'); assert.equal(B.sequence, 1);
    await rpc(b, 'close', { p_generation: B.generation, p_sequence: B.sequence });
  });
});

test('persistent snapshot chunks bound ordinary growing history without pruning offline parents', { timeout: 300000 }, async t => {
  const learner = await user('growth'); let status = await rpc(learner, 'enroll');
  const state = empty(); let submittedBytes = 0; const firstId = randomUUID();
  // 400 saved observations, each carrying an ordinary long-form fictional study note.
  // Retaining full snapshots exceeds the old 64 MiB quota; shared blocks should stay small.
  for (let index = 0; index < 400; index++) {
    state.journal.push({ id: `synthetic-${index}`, date: '2026-01-01', title: `Reflection ${index}`, body: `${index}: ${'Fictional study observation. '.repeat(100)}` });
    const pending = append(status, state); if (index === 0) pending.id = firstId;
    submittedBytes += Buffer.byteLength(JSON.stringify(pending));
    status = await commit(learner, pending);
  }
  assert.ok(submittedBytes > 64 * 1024 * 1024);
  assert.ok(status.archiveBytes < 4 * 1024 * 1024, `Unexpected retained size ${status.archiveBytes}`);
  const last = await rpc(learner, 'pull', { p_generation: status.generation, p_after: 399, p_through: 400, p_limit: 1 });
  assert.deepEqual(last.revisions[0].request.snapshot.data, state);
  const first = await rpc(learner, 'pull', { p_generation: status.generation, p_after: 0, p_through: 1, p_limit: 1 });
  assert.equal(first.revisions[0].request.snapshot.data.journal.length, 1);
  const oldOffline = append(status, first.revisions[0].request.snapshot.data, firstId);
  const conflict = await commit(learner, oldOffline); assert.equal(conflict.outcome, 'conflict');
  // Cross the next array-tree height; exact order, strings, extension fields and numbers survive.
  while (state.journal.length < 1057) {
    const index = state.journal.length;
    state.journal.push({ id: `synthetic-${index}`, date: '2026-01-01', title: String(index), body: 'Fictional later observation', extension: { nested: [null, true, 1.25, ['literal', { untouched: '<script>' }]] } });
  }
  const large = append(conflict, state, status.head); const largeResult = await commit(learner, large);
  const result = await rpc(learner, 'pull', { p_generation: status.generation, p_after: largeResult.sequence - 1, p_through: largeResult.sequence, p_limit: 1 });
  assert.deepEqual(result.revisions[0].request.snapshot.data, state); validateState(state);
  const compact = await compactArchive(learner);
  assert.ok(Buffer.byteLength(JSON.stringify(compact)) < 5 * 1024 * 1024);
  assert.deepEqual(unpackArchive(compact, compact.revisions.at(-1).request.snapshotHash).data, state);
  assert.equal(unpackArchive(compact, compact.revisions[0].request.snapshotHash).data.journal.length, 1);
  t.diagnostic(`400 growing snapshots: ${submittedBytes} submitted bytes; ${status.archiveBytes} retained logical bytes; all original parents retained`);
  await rpc(learner, 'close', { p_generation: largeResult.generation, p_sequence: largeResult.sequence });
});
