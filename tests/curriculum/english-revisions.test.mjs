import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateContent } from '../../scripts/validate-content.mjs';

const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const previous = read('../fixtures/foundation-before-issue-47.json');
const candidate = read('../../content/foundation.v1.json');
const refKey = ref => `${ref.id}@${ref.version}`;
const latest = id => candidate.records.filter(record => record.id === id).sort((a, b) => b.version - a.version)[0];
const exact = ref => candidate.records.find(record => record.id === ref.id && record.version === ref.version);
const attempts = previous.records.map((record, index) => ({ id: `synthetic-${index}`, contentRef: { id: record.id, version: record.version } }));

test('previous delivered revisions, actor provenance, editorial history and synthetic attempt references survive', () => {
  assert.deepEqual(validateContent(candidate, { previous, attempts, asOf: '2026-10-28' }), []);
  for (const record of previous.records) assert.deepEqual(exact(record), record, refKey(record));
  for (const actor of previous.actors) assert.deepEqual(candidate.actors.find(item => item.id === actor.id), actor);
  for (const item of previous.editorial) assert.deepEqual(candidate.editorial.find(entry => refKey(entry.ref) === refKey(item.ref)), item);
  const altered = structuredClone(candidate);
  altered.records.find(record => refKey(record) === refKey(previous.records[0])).title += ' altered';
  assert.match(validateContent(altered, { previous, attempts, asOf: '2026-10-28' }).join('\n'), /Immutable revision removed\/changed/);
});

test('latest assessment revisions retain stable identities, keys and score dimensions', () => {
  const priorLatest = new Map();
  for (const r of previous.records) if (!priorLatest.has(r.id) || priorLatest.get(r.id).version < r.version) priorLatest.set(r.id, r);
  for (const old of priorLatest.values()) {
    const next = latest(old.id);
    assert.deepEqual(next.taskIds, old.taskIds, old.id);
    assert.deepEqual(next.objectiveIds, old.objectiveIds, old.id);
    if (old.kind === 'question' && old.payload.format === 'mcq') {
      assert.deepEqual(next.payload.options.map(option => option.id), old.payload.options.map(option => option.id), old.id);
      assert.equal(next.payload.correctOptionId, old.payload.correctOptionId, old.id);
    }
    if (old.kind === 'rubric') {
      assert.deepEqual(next.payload.criteria.map(c => [c.id, c.levels.map(l => l.score)]), old.payload.criteria.map(c => [c.id, c.levels.map(l => l.score)]), old.id);
    }
    if (next.version > old.version) {
      assert.deepEqual(next.supersedes, { id: old.id, version: old.version });
      assert.ok(next.changeNote && next.priorAttemptImpact && next.scheduleImpact);
      const editorial = candidate.editorial.find(item => refKey(item.ref) === refKey(next));
      assert.equal(editorial.status, 'draft'); assert.deepEqual(editorial.reviews, []);
    }
  }
  const scenario = latest('scenario-foundation-decision');
  assert.equal(scenario.payload.rubricRef.version, 3);
  assert.match(scenario.payload.deliverable, /rubric-foundation-case@3/);
  assert.equal(exact(scenario.payload.rubricRef).id, 'rubric-foundation-case');
});

test('current teaching catalog keeps every stable ID and revised payloads pin current teaching dependencies', () => {
  const oldIds = new Set(previous.records.filter(record => record.kind !== 'source').map(record => record.id));
  const newIds = new Set(candidate.records.filter(record => record.kind !== 'source').map(record => record.id));
  assert.deepEqual(newIds, oldIds);
  const oldVersions = new Map();
  for (const r of previous.records) oldVersions.set(r.id, Math.max(oldVersions.get(r.id) || 0, r.version));
  const inspect = (value, owner) => {
    if (Array.isArray(value)) return value.forEach(item => inspect(item, owner));
    if (!value || typeof value !== 'object') return;
    if (Object.keys(value).sort().join(',') === 'id,version' && latest(value.id)) {
      if (latest(value.id).kind !== 'source') assert.equal(value.version, latest(value.id).version, `${owner} -> ${refKey(value)}`);
    } else Object.values(value).forEach(item => inspect(item, owner));
  };
  for (const id of newIds) {
    const record = latest(id);
    if (record.version > oldVersions.get(id)) inspect(record.payload, refKey(record));
  }
});
