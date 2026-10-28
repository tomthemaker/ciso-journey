import { contentKey, findContent, safeHttps } from './content.ts';
import type { ContentBundle, ContentRecord, ContentRef } from './content.ts';
import { resolveRubric } from './question-attempts.ts';
import type { LearnerState } from './types.ts';

export interface Scenario extends ContentRecord {
  payload: ContentRecord['payload'] & { brief: string; deliverable: string; constraints: string[]; rubricRef: ContentRef; annotatedExample: string };
}
export const responseFields = [
  ['impact', 'Business impact'], ['options', 'Options and tradeoffs'], ['accountableOwner', 'Accountable owner and responsibilities'],
  ['recommendation', 'Recommendation and revisit condition'], ['residualRisk', 'Residual risk and uncertainty'],
] as const;
export type DecisionField = typeof responseFields[number][0];
export interface DecisionResponse extends Record<DecisionField, string> {
  evidence: { title: string; url: string; notes: string; [key: string]: unknown };
  [key: string]: unknown;
}
export interface ScenarioResponse {
  id: string; submittedAt: string; contentRef: ContentRef; contentVersion: string; curriculumVersion: string;
  objectiveIds: string[]; sourceRefs: ContentRef[]; rubricRef: ContentRef;
  provenance: 'unassessed-response'; response: DecisionResponse;
  [key: string]: unknown;
}
export interface CaseSelfAssessment {
  id: string; responseId: string; assessedAt: string; rubricRef: ContentRef; provenance: 'self-assessment';
  ratings: { criterionId: string; score: number }[];
  [key: string]: unknown;
}
export interface ScenarioResponses {
  schemaVersion: 1; responses: ScenarioResponse[]; selfAssessments: CaseSelfAssessment[];
  [key: string]: unknown;
}
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
const slug = (v: unknown): v is string => typeof v === 'string' && /^[a-z][a-z0-9-]*$/.test(v);
const ref = (v: unknown): v is ContentRef => object(v) && slug(v.id) && Number.isSafeInteger(v.version) && Number(v.version) > 0;
const instant = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v;
const unique = (v: string[]): boolean => new Set(v).size === v.length;
const copyRef = (v: ContentRef): ContentRef => ({ id: v.id, version: v.version });
function invalid(): never { throw new Error('Invalid or unsupported executive case responses. Current progress has not changed.'); }
export function validateDecisionResponse(value: unknown): asserts value is DecisionResponse {
  if (!object(value) || !responseFields.every(([key]) => text(value[key])) || !object(value.evidence) ||
    !text(value.evidence.title) || typeof value.evidence.notes !== 'string' || typeof value.evidence.url !== 'string' ||
    (value.evidence.url !== '' && !safeHttps(value.evidence.url))) invalid();
}
/** Validate structure without substituting today's content for unavailable historical refs. */
export function validateScenarioResponses(value: unknown): asserts value is ScenarioResponses {
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.responses) || !Array.isArray(value.selfAssessments)) invalid();
  const ids = new Set<string>();
  for (const a of value.responses) {
    if (!object(a) || !text(a.id) || ids.has(a.id) || !instant(a.submittedAt) || !ref(a.contentRef) || !ref(a.rubricRef) ||
      !text(a.contentVersion) || !text(a.curriculumVersion) || a.provenance !== 'unassessed-response' ||
      !Array.isArray(a.objectiveIds) || !a.objectiveIds.length || !a.objectiveIds.every(slug) || !unique(a.objectiveIds) ||
      !Array.isArray(a.sourceRefs) || !a.sourceRefs.length || !a.sourceRefs.every(ref)) invalid();
    validateDecisionResponse(a.response); ids.add(a.id);
  }
  const assessed = new Set<string>();
  for (const a of value.selfAssessments) {
    if (!object(a) || !text(a.id) || ids.has(a.id) || !text(a.responseId) || assessed.has(a.responseId) || !instant(a.assessedAt) ||
      !ref(a.rubricRef) || a.provenance !== 'self-assessment' || !Array.isArray(a.ratings) || !a.ratings.length) invalid();
    const response = value.responses.find(item => item.id === a.responseId);
    if (!response || contentKey(response.rubricRef) !== contentKey(a.rubricRef) || a.assessedAt < response.submittedAt) invalid();
    if (!a.ratings.every(r => object(r) && slug(r.criterionId) && Number.isSafeInteger(r.score) && Number(r.score) >= 0) ||
      !unique(a.ratings.map(r => r.criterionId))) invalid();
    ids.add(a.id); assessed.add(a.responseId);
  }
}
export function resolveScenario(bundle: ContentBundle, reference: ContentRef): Scenario | undefined {
  const r = findContent(bundle, reference);
  return r?.kind === 'scenario' && object(r.payload) && text(r.payload.brief) && text(r.payload.deliverable) &&
    text(r.payload.annotatedExample) && Array.isArray(r.payload.constraints) && r.payload.constraints.every(text) && ref(r.payload.rubricRef) ? r as Scenario : undefined;
}
export function createScenarioResponse(bundle: ContentBundle, scenario: Scenario, response: DecisionResponse, id: string, submittedAt: string): ScenarioResponse {
  validateDecisionResponse(response);
  return { id, submittedAt, contentRef: copyRef(scenario), contentVersion: bundle.contentVersion, curriculumVersion: bundle.curriculumVersion,
    objectiveIds: [...scenario.objectiveIds], sourceRefs: scenario.sourceRefs.map(copyRef), rubricRef: copyRef(scenario.payload.rubricRef),
    provenance: 'unassessed-response', response: structuredClone(response) };
}
export function appendScenarioResponse(state: LearnerState, response: ScenarioResponse): void {
  const candidate: ScenarioResponses = structuredClone(state.scenarioResponses ?? { schemaVersion: 1, responses: [], selfAssessments: [] });
  candidate.responses.push(structuredClone(response)); validateScenarioResponses(candidate); state.scenarioResponses = candidate;
}
export function appendCaseSelfAssessment(state: LearnerState, bundle: ContentBundle, responseId: string, ratings: CaseSelfAssessment['ratings'], id: string, assessedAt: string): void {
  const candidate = structuredClone(state.scenarioResponses);
  const response = candidate?.responses.find(item => item.id === responseId);
  const rubric = resolveRubric(bundle, response?.rubricRef);
  if (!candidate || !response || !rubric || ratings.length !== rubric.payload.criteria.length ||
    !rubric.payload.criteria.every(c => ratings.some(r => r.criterionId === c.id && c.levels.some(l => l.score === r.score)))) throw new Error('Choose one exact rubric anchor for every criterion.');
  candidate.selfAssessments.push({ id, responseId, assessedAt, rubricRef: copyRef(rubric), provenance: 'self-assessment', ratings: structuredClone(ratings) });
  validateScenarioResponses(candidate); state.scenarioResponses = candidate;
}
export const caseHash = (ref: ContentRef): string => `#cases/${ref.id}/${ref.version}`;
export function caseRoute(hash: string): ContentRef | undefined {
  const match = /^#cases\/([a-z][a-z0-9-]*)\/([1-9]\d*)$/.exec(hash);
  return match && Number.isSafeInteger(Number(match[2])) ? { id: match[1], version: Number(match[2]) } : undefined;
}
