import { readFileSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurriculum } from './validate-curriculum.mjs';

// The small declarative shape contract is shared by all records; semantic gates follow.
const text = value => typeof value === 'string' && value.trim().length > 0;
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const list = value => Array.isArray(value);
const positive = value => Number.isSafeInteger(value) && value > 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
const https = value => { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; } };
const oneOf = (...values) => value => values.includes(value);
const nullable = rule => value => value === null || rule(value);
const ref = value => object(value) && /^[a-z][a-z0-9-]*$/.test(value.id) && positive(value.version) && Object.keys(value).length === 2;
const key = value => `${value?.id}@${value?.version}`;
const all = rule => value => list(value) && value.every(rule);
const nonempty = rule => value => all(rule)(value) && value.length > 0;
export const publicationStates = ['draft', 'source-checked', 'independently-reviewed', 'published', 'stale', 'retired'];
const shapes = {
  lesson: { sections: nonempty(object), prerequisiteRefs: all(ref), estimatedMinutes: positive, workedExample: text, misconceptions: nonempty(text), practiceRefs: nonempty(ref), conceptRefs: nonempty(ref) },
  concept: { definition: text, misconception: text },
  question: { format: oneOf('mcq', 'scenario', 'open'), prompt: text, difficulty: oneOf('introductory', 'intermediate', 'advanced'), options: all(object), correctOptionId: nullable(text), rubricRef: nullable(ref), annotatedExample: nullable(text) },
  card: { prompt: text, answer: text, conceptRef: ref },
  scenario: { brief: text, deliverable: text, constraints: nonempty(text), rubricRef: ref, annotatedExample: text },
  rubric: { criteria: nonempty(object), assessmentProvenance: oneOf('self-assessment', 'rubric-assessment', 'independent-review') },
  source: { publisher: text, url: https, edition: text, jurisdiction: text, publicationDate: nullable(date), effectiveDate: nullable(date), checkedAt: date, reviewDueAt: date, verification: oneOf('metadata-only', 'authoritative-text'), verificationEvidence: text, verifierId: text, sourceKind: oneOf('official-reference', 'authoritative-law'), copyright: text, c01SourceId: nullable(text) },
  mapping: { frameworkVersionId: text, targetIds: nonempty(text), validFrom: nullable(date), validUntilExclusive: nullable(date), rationale: text, limitation: text },
};
const common = { id: value => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value), version: positive, kind: oneOf(...Object.keys(shapes)), title: text, authorIds: nonempty(text), authoredAt: date, objectiveIds: all(text), taskIds: all(text), sourceRefs: all(ref), legalClaims: all(object), supersedes: nullable(ref), changeNote: text, priorAttemptImpact: text, scheduleImpact: text, payload: object };
export const loadContent = (path = new URL('../content/c02.example.v1.json', import.meta.url)) => JSON.parse(readFileSync(path, 'utf8'));

// No network or writes: errors are suitable for CI and the future authoring UI.
export function validateContent(bundle, { curriculum = loadCurriculum(), previous = null, attempts = [], asOf = new Date().toISOString().slice(0, 10) } = {}) {
  const errors = [];
  const check = (ok, message) => { if (!ok) errors.push(message); };
  const shape = (value, rules, label) => {
    if (!object(value)) { errors.push(`${label}: expected object`); return false; }
    for (const [field, rule] of Object.entries(rules)) check(rule(value[field]), `${label}.${field}: invalid or missing`);
    for (const field of Object.keys(value)) check(field in rules, `${label}.${field}: unknown field`);
    return Object.entries(rules).every(([field, rule]) => rule(value[field]));
  };
  if (!shape(bundle, { schemaVersion: value => value === 1, contentVersion: text, curriculumVersion: text, actors: list, records: list, editorial: list }, 'bundle')) return errors;
  check(date(asOf), 'asOf: invalid date');
  check(bundle.curriculumVersion === curriculum.contentVersion, 'Curriculum version differs; revalidate mappings/objectives');
  const actors = new Map(), records = new Map(), editorial = new Map();
  for (const actor of bundle.actors) if (shape(actor, { id: text, kind: oneOf('human', 'ai'), role: text }, 'actor')) {
    check(!actors.has(actor.id), `Duplicate actor ${actor.id}`); actors.set(actor.id, actor);
  }
  for (const record of bundle.records) {
    if (!shape(record, common, 'record') || !shape(record.payload, shapes[record.kind], key(record))) continue;
    check(!records.has(key(record)), `Duplicate revision ${key(record)}`); records.set(key(record), record);
  }
  for (const item of bundle.editorial) if (shape(item, { ref, status: oneOf(...publicationStates), reviews: all(object), unresolvedChallenges: all(text) }, 'editorial')) {
    check(!editorial.has(key(item.ref)), `Duplicate editorial ${key(item.ref)}`); editorial.set(key(item.ref), item);
    check(records.has(key(item.ref)), `Editorial has unknown revision ${key(item.ref)}`);
  }
  const validBundle = { ...bundle, records: [...records.values()], editorial: [...editorial.values()] };
  const referenced = (references, kind, label) => {
    for (const target of references) check(records.has(key(target)) && (!kind || records.get(key(target)).kind === kind), `${label}: unknown/wrong-kind reference ${key(target)}`);
    check(new Set(references.map(key)).size === references.length, `${label}: duplicate reference`);
  };
  const objectiveMap = new Map(curriculum.objectives.map(item => [item.id, item]));
  const taskMap = new Map(curriculum.tasks.map(item => [item.id, item]));
  for (const record of records.values()) {
    const label = key(record), p = record.payload, state = editorial.get(label);
    check(!!state, `${label}: missing editorial status`);
    check(record.authorIds.every(id => actors.has(id)), `${label}: unknown author`);
    check(new Set(record.authorIds).size === record.authorIds.length, `${label}: duplicate author`);
    check(record.authoredAt <= asOf, `${label}: future authorship`);
    check(record.taskIds.every(id => taskMap.has(id)), `${label}: unknown legacy task`);
    check(record.objectiveIds.every(id => objectiveMap.has(id) && record.taskIds.includes(objectiveMap.get(id).taskId)), `${label}: unknown/mismatched C01 objective`);
    if (record.kind !== 'source') {
      check(record.objectiveIds.length > 0 && record.taskIds.length > 0 && record.sourceRefs.length > 0, `${label}: objectives/tasks/sources required`);
    }
    referenced(record.sourceRefs, 'source', label);
    if (record.version === 1) check(record.supersedes === null, `${label}: first version cannot supersede`);
    else {
      check(record.supersedes?.id === record.id && record.supersedes?.version === record.version - 1, `${label}: correction must supersede immediately prior version`);
      referenced(record.supersedes ? [record.supersedes] : [], record.kind, label);
      const prior = records.get(key(record.supersedes));
      check(!prior || prior.authoredAt <= record.authoredAt, `${label}: correction predates prior version`);
    }
    if (record.kind === 'lesson') {
      referenced(p.conceptRefs, 'concept', label); referenced(p.practiceRefs, null, label); referenced(p.prerequisiteRefs, 'lesson', label);
      for (const practice of p.practiceRefs) check(['question', 'scenario'].includes(records.get(key(practice))?.kind), `${label}: practice must be question/scenario`);
      for (const section of p.sections) shape(section, { heading: text, body: text }, `${label}.section`);
    }
    if (record.kind === 'card') referenced([p.conceptRef], 'concept', label);
    if (record.kind === 'scenario' || (record.kind === 'question' && p.format !== 'mcq')) {
      check(ref(p.rubricRef) && text(p.annotatedExample), `${label}: response requires rubric and annotated example`);
      if (ref(p.rubricRef)) referenced([p.rubricRef], 'rubric', label);
    }
    if (record.kind === 'question') {
      if (p.format === 'mcq') {
        check(p.options.length >= 2 && p.rubricRef === null && p.annotatedExample === null, `${label}: MCQ needs options and a keyed answer`);
        for (const option of p.options) shape(option, { id: text, text, explanation: text }, `${label}.option`);
        check(p.options.some(option => option.id === p.correctOptionId) && new Set(p.options.map(option => option.id)).size === p.options.length, `${label}: invalid correct answer/duplicate option`);
      } else check(p.options.length === 0 && p.correctOptionId === null, `${label}: open responses cannot use exact-text answers`);
    }
    if (record.kind === 'rubric') for (const criterion of p.criteria) {
      if (shape(criterion, { id: text, description: text, levels: nonempty(object) }, `${label}.criterion`)) {
        for (const level of criterion.levels) shape(level, { score: value => Number.isSafeInteger(value) && value >= 0, descriptor: text }, `${label}.level`);
        check(new Set(criterion.levels.map(level => level.score)).size === criterion.levels.length && criterion.levels.length >= 2, `${label}: rubric needs distinct anchored scores`);
      }
    }
    if (record.kind === 'source') {
      check(actors.has(p.verifierId), `${label}: unknown source verifier`);
      check(record.sourceRefs.length === 0, `${label}: sources cannot cite other content`);
      const hostname = new URL(p.url).hostname;
      check(/(^|\.)(nist\.gov|iso\.org|isc2\.org|sitecorecloud\.io|isaca\.org|edoeb\.admin\.ch|fedlex\.admin\.ch|eur-lex\.europa\.eu)$/.test(hostname), `${label}: primary publisher URL required`);
      if (p.sourceKind === 'authoritative-law') check(/(^|\.)(fedlex\.admin\.ch|eur-lex\.europa\.eu)$/.test(hostname), `${label}: authoritative legal text URL required`);
      check(p.checkedAt <= asOf && p.reviewDueAt > p.checkedAt, `${label}: invalid review dates`);
      const maxDays = p.sourceKind === 'authoritative-law' ? 90 : 366;
      check((Date.parse(p.reviewDueAt) - Date.parse(p.checkedAt)) / 86400000 <= maxDays, `${label}: review cadence exceeded`);
      if (p.sourceKind === 'authoritative-law' && p.verification === 'authoritative-text') check(actors.get(p.verifierId)?.kind === 'human', `${label}: authoritative law requires human text verification`);
      const inherited = curriculum.sources.find(source => source.id === p.c01SourceId);
      if (p.c01SourceId !== null) {
        check(inherited?.url === p.url, `${label}: C01 source mismatch`);
        if (inherited?.verification.includes('unverified') && p.verification === 'authoritative-text')
          check(p.checkedAt > inherited.checkedAt && actors.get(p.verifierId)?.kind === 'human', `${label}: unverified C01 law requires a new human text verification`);
      }
    }
    if (record.kind === 'mapping') {
      const framework = curriculum.frameworkVersions.find(item => item.id === p.frameworkVersionId);
      check(!!framework && p.targetIds.every(id => Object.hasOwn(framework.targets, id)), `${label}: unsupported framework target`);
      check(framework && p.validFrom === framework.validFrom && p.validUntilExclusive === framework.validUntilExclusive, `${label}: preserve C01 validity window`);
    }
    for (const claim of record.legalClaims) if (shape(claim, { statement: text, jurisdiction: text, sector: text, applicability: text, effectiveAt: date, sourceRef: ref, locator: text }, `${label}.legalClaim`)) {
      check(record.sourceRefs.some(source => key(source) === key(claim.sourceRef)), `${label}: legal claim source must be cited`);
      const source = records.get(key(claim.sourceRef));
      if (state && ['source-checked', 'independently-reviewed', 'published'].includes(state.status)) check(source?.kind === 'source' && source.payload.sourceKind === 'authoritative-law' && source.payload.verification === 'authoritative-text', `${label}: legal claim requires verified authoritative text`);
    }
    if (!state) continue;
    const independent = role => state.reviews.some(review => review.role === role && review.verdict === 'approve' && actors.get(review.reviewerId)?.kind === 'human' && !record.authorIds.includes(review.reviewerId));
    for (const review of state.reviews) if (shape(review, { reviewerId: text, role: oneOf('educator', 'legal'), reviewedAt: date, evidence: text, verdict: oneOf('approve', 'changes-requested') }, `${label}.review`)) {
      check(actors.has(review.reviewerId) && review.reviewedAt >= record.authoredAt && review.reviewedAt <= asOf, `${label}: invalid reviewer/date`);
      check(actors.get(review.reviewerId)?.kind === 'human' && !record.authorIds.includes(review.reviewerId), `${label}: independent review requires a separate human`);
    }
    if (['source-checked', 'independently-reviewed', 'published'].includes(state.status)) {
      check(state.unresolvedChallenges.length === 0 && !state.reviews.some(review => review.verdict === 'changes-requested'), `${label}: unresolved source/review challenge`);
      const sources = record.kind === 'source' ? [record] : record.sourceRefs.map(source => records.get(key(source)));
      check(sources.every(source => source?.payload.verification === 'authoritative-text'), `${label}: source text not checked`);
      check(effectiveStatus(validBundle, record, asOf, curriculum) === state.status, `${label}: overdue/expired content must be stale`);
    }
    if (['independently-reviewed', 'published'].includes(state.status)) {
      check(independent('educator'), `${label}: independent educator approval required; AI-only is provisional`);
      if (record.legalClaims.length || (record.kind === 'source' && p.sourceKind === 'authoritative-law')) check(independent('legal'), `${label}: independent legal approval required`);
    }
    if (state.status === 'published') for (const dependency of contentRefs(record)) {
      check(editorial.get(key(dependency))?.status === 'published' && effectiveStatus(validBundle, records.get(key(dependency)), asOf, curriculum) === 'published', `${label}: dependency ${key(dependency)} is not currently published`);
    }
  }
  // All delivered revisions remain append-only, not just those with known attempts.
  if (previous) {
    for (const old of previous.records ?? []) check(isDeepStrictEqual(records.get(key(old)), old), `Immutable revision removed/changed: ${key(old)}`);
    const priorActors = new Map((previous.actors ?? []).map(actor => [actor.id, actor]));
    for (const [id, old] of priorActors) check(isDeepStrictEqual(actors.get(id), old), `Actor provenance changed: ${id}`);
  }
  for (const attempt of attempts) check(object(attempt) && ref(attempt.contentRef) && records.has(key(attempt.contentRef)), `Attempt ${attempt?.id ?? '?'}: original content version unavailable`);
  const visiting = new Set(), visited = new Set();
  const visit = record => {
    if (visiting.has(key(record))) { errors.push(`Lesson prerequisite cycle: ${key(record)}`); return; }
    if (visited.has(key(record))) return;
    visiting.add(key(record));
    for (const dependency of record.payload.prerequisiteRefs ?? []) { const target = records.get(key(dependency)); if (target?.kind === 'lesson') visit(target); }
    visiting.delete(key(record)); visited.add(key(record));
  };
  for (const record of records.values()) if (record.kind === 'lesson') visit(record);
  return errors;
}

function contentRefs(record) {
  const p = record.payload ?? {};
  return [...(record.sourceRefs ?? []), ...(p.conceptRefs ?? []), ...(p.practiceRefs ?? []), ...(p.prerequisiteRefs ?? []), ...(p.conceptRef ? [p.conceptRef] : []), ...(p.rubricRef ? [p.rubricRef] : [])];
}

// Source evidence can be unusable even while the source is visibly a draft.
function sourceEvidenceStale(bundle, record, asOf) {
  if (record?.kind !== 'source') return false;
  const state = bundle.editorial.find(item => key(item?.ref) === key(record));
  return record.payload.reviewDueAt <= asOf || state?.unresolvedChallenges.length > 0 ||
    state?.reviews.some(review => review.verdict === 'changes-requested');
}

// Expiry propagates through dependencies without erasing historical publication metadata.
export function effectiveStatus(bundle, record, asOf, curriculum = loadCurriculum(), visited = new Set()) {
  if (!record || !object(record.payload)) return 'stale';
  const state = bundle.editorial.find(item => key(item?.ref) === key(record))?.status;
  if (['draft', 'stale', 'retired'].includes(state) || visited.has(key(record))) return state;
  visited.add(key(record));
  const p = record.payload;
  if (sourceEvidenceStale(bundle, record, asOf) || (record.kind === 'mapping' && ((p.validUntilExclusive && p.validUntilExclusive <= asOf) || (p.validFrom && p.validFrom > asOf)))) return 'stale';
  for (const target of contentRefs(record)) {
    const dependent = bundle.records.find(item => key(item) === key(target));
    if (sourceEvidenceStale(bundle, dependent, asOf) || ['stale', 'retired'].includes(effectiveStatus(bundle, dependent, asOf, curriculum, visited))) return 'stale';
  }
  return state;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    const path = args[0]?.startsWith('--') ? undefined : args.shift();
    const options = {};
    while (args.length) {
      const flag = args.shift(), value = args.shift();
      if (!value || !['--previous', '--attempts', '--as-of'].includes(flag)) throw new Error('Usage: validate-content.mjs [bundle.json] [--previous bundle.json] [--attempts synthetic-attempts.json] [--as-of YYYY-MM-DD]');
      options[flag.slice(2)] = flag === '--as-of' ? value : JSON.parse(readFileSync(value, 'utf8'));
    }
    if (options['as-of']) { options.asOf = options['as-of']; delete options['as-of']; }
    const bundle = loadContent(path);
    const errors = validateContent(bundle, options);
    if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
    else console.log(`Content contract valid: ${bundle.records.length} revisions. Structural validation is not educator/legal approval.`);
  } catch (error) { console.error(`Content validation failed: ${error.message}`); process.exitCode = 1; }
}
