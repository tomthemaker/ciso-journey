import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const loadCurriculum = () => JSON.parse(readFileSync(resolve(root, 'curriculum/c01.v1.json'), 'utf8'));
export const loadLegacy = () => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8');
  return [...html.matchAll(/\['((?:w\d+)|(?:p[2-6][a-e]))','([^']+)','([^']+)'\]/g)]
    .map(([, id, title, outcome]) => ({ id, title, outcome }));
};

export function validateCurriculum(data, legacy = loadLegacy()) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const nonempty = value => typeof value === 'string' && value.trim().length > 0;
  const ids = (records, label) => {
    check(Array.isArray(records), `${label} must be an array`);
    const map = new Map();
    for (const record of records ?? []) {
      check(nonempty(record.id), `${label} needs an ID`);
      check(!map.has(record.id), `${label}: duplicate ${record.id}`);
      map.set(record.id, record);
    }
    return map;
  };
  const references = (values, map, label, allowEmpty = false) => {
    check(Array.isArray(values) && (allowEmpty || values.length > 0), `${label}: missing references`);
    for (const id of values ?? []) check(map.has(id), `${label}: unknown reference ${id}`);
    check(new Set(values).size === values?.length, `${label}: duplicate reference`);
  };
  const acyclic = (map, key, label) => {
    const active = new Set(), visited = new Set();
    const visit = id => {
      if (active.has(id)) { errors.push(`${label}: cycle at ${id}`); return; }
      if (visited.has(id) || !map.has(id)) return;
      active.add(id);
      for (const dependency of map.get(id)[key] ?? []) visit(dependency);
      active.delete(id); visited.add(id);
    };
    for (const id of map.keys()) visit(id);
  };
  check(data.schemaVersion === 1, 'Unsupported schemaVersion');
  check(nonempty(data.contentVersion), 'Missing contentVersion');
  check(data.status === 'draft' && data.authorship?.independentEducatorReview === null && data.authorship?.legalReview === null,
    'C01 has no independent educator/legal review; retain draft provenance');
  const tasks = ids(data.tasks, 'tasks'), objectives = ids(data.objectives, 'objectives');
  const domains = ids(data.domains, 'domains'), competencies = ids(data.competencies, 'competencies');
  const sources = ids(data.sources, 'sources'), frameworks = ids(data.frameworkVersions, 'frameworks');
  const expectedTaskIds = [...Array.from({ length: 12 }, (_, i) => `w${i + 1}`),
    ...[2, 3, 4, 5, 6].flatMap(n => [...'abcde'].map(letter => `p${n}${letter}`))];
  check(tasks.size === 37 && expectedTaskIds.every(id => tasks.has(id)), 'Exactly the actual 37 task IDs are required');
  check(legacy.length === 37, 'Legacy extraction must find 37 tasks');
  for (const task of legacy) {
    const record = tasks.get(task.id);
    check(record?.legacyTitle === task.title && record?.legacyOutcome === task.outcome, `Legacy meaning changed: ${task.id}`);
  }
  const legacyCompetencies = ['Security architecture', 'Cyber-risk management', 'Governance', 'Compliance', 'Security operations', 'Executive reporting'];
  check(competencies.size === 6, 'Six legacy competencies required');
  legacyCompetencies.forEach((name, i) => check(competencies.get(`comp-${i + 1}`)?.legacyName === name &&
    competencies.get(`comp-${i + 1}`)?.legacyDefault === [0, 1, 0, 0, 0, 2][i], `Legacy competency changed: ${name}`));
  check(domains.size === 10, 'Ten domains required');
  for (const domain of domains.values()) {
    references(domain.competencyIds, competencies, `${domain.id} competencies`);
    check(data.tasks.some(task => task.domainIds.includes(domain.id)), `Uncovered domain ${domain.id}`);
  }
  for (const id of competencies.keys()) check(data.tasks.some(task => task.competencyIds.includes(id)), `Uncovered competency ${id}`);
  for (const source of sources.values()) {
    let url; try { url = new URL(source.url); } catch { /* reported below */ }
    check(url?.protocol === 'https:' && /(^|\.)(nist\.gov|iso\.org|isc2\.org|sitecorecloud\.io|isaca\.org|edoeb\.admin\.ch|fedlex\.admin\.ch|eur-lex\.europa\.eu)$/.test(url?.hostname ?? ''), `Non-primary HTTPS source ${source.id}`);
    check(['publisher', 'title', 'version', 'jurisdiction', 'verification'].every(key => nonempty(source[key])), `Source metadata incomplete: ${source.id}`);
    check(/^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt) && source.reviewDueAt > source.checkedAt, `Source review dates invalid: ${source.id}`);
  }
  check(frameworks.size === 4, 'Four versioned frameworks required');
  for (const framework of frameworks.values()) {
    references(framework.sourceIds, sources, `${framework.id} sources`);
    check(nonempty(framework.dateBasis) && nonempty(framework.granularity), `Missing framework validity/granularity: ${framework.id}`);
    check(Object.keys(framework.targets).length > 0, `No targets: ${framework.id}`);
    check(!framework.validFrom || !framework.validUntilExclusive || framework.validFrom < framework.validUntilExclusive, `Invalid validity window: ${framework.id}`);
  }
  check(frameworks.get('cissp-2024')?.validFrom === '2024-04-15' && frameworks.get('cissp-2024')?.validUntilExclusive === '2027-04-15', 'CISSP validity dates required');
  check(frameworks.get('cism-2022')?.validUntilExclusive === '2026-11-03', 'CISM replacement boundary required');
  const transitions = data.mappingPolicy?.transitions ?? [];
  for (const framework of frameworks.values()) if (framework.validUntilExclusive) check(transitions.some(item => item.frameworkVersionId === framework.id && item.on === framework.validUntilExclusive && nonempty(item.action)), `Missing transition gate ${framework.id}`);
  for (const task of tasks.values()) {
    references(task.domainIds, domains, `${task.id} domains`);
    references(task.competencyIds, competencies, `${task.id} competencies`);
    references(task.objectiveIds, objectives, `${task.id} objectives`);
    references(task.prerequisiteTaskIds, tasks, `${task.id} prerequisites`, true);
    check(task.status === 'planned', `Task must remain planned: ${task.id}`);
    check(new Set(task.frameworkMappings.map(mapping => mapping.frameworkVersionId)).size === 4 && task.frameworkMappings.length === 4, `${task.id} needs four framework mappings`);
    for (const mapping of task.frameworkMappings) {
      const framework = frameworks.get(mapping.frameworkVersionId);
      check(!!framework, `${task.id}: unknown framework ${mapping.frameworkVersionId}`);
      references(mapping.targetIds, new Map(Object.entries(framework?.targets ?? {})), `${task.id} mapping targets`);
      check(mapping.status === 'provisional-alignment', `Mapping cannot imply independent review: ${task.id}`);
    }
    for (const id of task.objectiveIds) check(objectives.get(id)?.taskId === task.id, `Objective belongs to wrong task: ${id}`);
    if (['w1', 'w2', 'w3', 'w4'].includes(task.id)) check(task.priority === 'R1-first-loop', `First-loop priority missing: ${task.id}`);
  }
  for (const objective of objectives.values()) {
    check(tasks.get(objective.taskId)?.objectiveIds.includes(objective.id), `Orphan objective ${objective.id}`);
    check(/^(Classify|Construct|Trace|Select|Draw|Compare|Design|Allocate|Propose|Rank|Assign|Draft|Prioritize|Resolve|Build|Define|Interpret|Synthesize|Defend|Write|Estimate|Justify|Plan|Prepare|Run|Reassess|Assemble|Produce)\b/.test(objective.statement), `Objective needs an observable action: ${objective.id}`);
    references(objective.prerequisiteObjectiveIds, objectives, `${objective.id} prerequisites`, true);
    check(objective.prerequisiteObjectiveIds.length > 0 || nonempty(objective.entryRequirement), `Missing entry prerequisite: ${objective.id}`);
    references(objective.sourceIds, sources, `${objective.id} sources`);
    const plan = objective.assessmentPlan;
    check(plan?.status === 'planned-not-authored' && nonempty(plan?.artifact) && nonempty(plan?.kind) && plan.criteria?.length >= 2 && plan.criteria.every(nonempty), `Assessment plan incomplete: ${objective.id}`);
    check(objective.status === 'draft' && nonempty(objective.version), `Objective provenance/version invalid: ${objective.id}`);
    for (const taskId of tasks.get(objective.taskId)?.prerequisiteTaskIds ?? []) check(objective.prerequisiteObjectiveIds.some(id => objectives.get(id)?.taskId === taskId), `Objective omits task prerequisite ${objective.id} -> ${taskId}`);
  }
  for (const tag of ['secure-software', 'cloud', 'cryptography', 'networking', 'leadership']) check(data.tasks.some(task => task.topicTags.includes(tag)), `Missing explicit topic ${tag}`);
  references(data.jurisdictionScope.sourceIds, sources, 'jurisdiction sources');
  check(['default', 'switzerland', 'eu', 'publicationGate'].every(key => nonempty(data.jurisdictionScope[key])), 'Swiss/EU scope incomplete');
  acyclic(tasks, 'prerequisiteTaskIds', 'Task prerequisites');
  acyclic(objectives, 'prerequisiteObjectiveIds', 'Objective prerequisites');
  return errors;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const data = loadCurriculum(), errors = validateCurriculum(data);
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Curriculum valid: ${data.tasks.length} unchanged tasks, ${data.domains.length} domains, ${data.competencies.length} competencies, ${data.objectives.length} objectives, ${data.frameworkVersions.length} frameworks, ${data.sources.length} primary-source records; prerequisites acyclic. This is structural validation, not educational or legal approval.`);
}
