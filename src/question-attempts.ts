import type { ContentBundle, ContentRecord, ContentRef } from './content.ts';
import { findContent } from './content.ts';
import type { LearnerState } from './types.ts';

export interface Option { id: string; text: string; explanation: string }
export interface Criterion { id: string; description: string; levels: { score: number; descriptor: string }[] }
export interface Question extends ContentRecord {
  payload: ContentRecord['payload'] & { format: 'mcq' | 'scenario' | 'open'; prompt: string; difficulty: string;
    options: Option[]; correctOptionId: string | null; rubricRef: ContentRef | null; annotatedExample: string | null };
}
export interface Rubric extends ContentRecord { payload: ContentRecord['payload'] & { criteria: Criterion[] } }
export interface QuestionAttempt {
  id: string; submittedAt: string; contentRef: ContentRef; contentVersion: string; curriculumVersion: string;
  objectiveIds: string[]; sourceRefs: ContentRef[]; rubricRef: ContentRef | null;
  format: 'mcq' | 'scenario' | 'open'; response: string;
  provenance: 'keyed-mcq' | 'unassessed-response'; correct: boolean | null;
  [key: string]: unknown;
}
export interface RubricSelfAssessment {
  id: string; attemptId: string; assessedAt: string; rubricRef: ContentRef;
  provenance: 'self-assessment'; ratings: { criterionId: string; score: number }[];
  [key: string]: unknown;
}
export interface QuestionAttempts {
  schemaVersion: 1; attempts: QuestionAttempt[]; selfAssessments: RubricSelfAssessment[];
  [key: string]: unknown;
}
const object = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const slug = (value: unknown): value is string => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);
const nonempty = (value: unknown): value is string => typeof value === 'string' && !!value.trim();
const ref = (value: unknown): value is ContentRef => object(value) && slug(value.id) && Number.isSafeInteger(value.version) && Number(value.version) > 0;
const instant = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
const unique = (values: string[]): boolean => new Set(values).size === values.length;
/** Imported historical refs may resolve to a different kind or an incompatible shape. */
export function resolveRubric(bundle: ContentBundle, reference: ContentRef | null | undefined): Rubric | undefined {
  const record = reference ? findContent(bundle, reference) : undefined;
  if (record?.kind !== 'rubric' || !object(record.payload) || !Array.isArray(record.payload.criteria) || !record.payload.criteria.length ||
    !record.payload.criteria.every(criterion => object(criterion) && slug(criterion.id) && nonempty(criterion.description) &&
      Array.isArray(criterion.levels) && criterion.levels.length > 0 && criterion.levels.every(level =>
        object(level) && Number.isSafeInteger(level.score) && Number(level.score) >= 0 && nonempty(level.descriptor)))) return undefined;
  return record as Rubric;
}
function invalid(): never { throw new Error('Invalid or unsupported question attempts. Current progress has not changed.'); }
/** Structural validation also accepts historical refs unavailable in today's installed bundle. */
export function validateQuestionAttempts(value: unknown): asserts value is QuestionAttempts {
  if (!object(value) || value.schemaVersion !== 1 || !Array.isArray(value.attempts) || !Array.isArray(value.selfAssessments)) invalid();
  const ids = new Set<string>();
  for (const a of value.attempts) {
    if (!object(a) || !nonempty(a.id) || ids.has(a.id) || !instant(a.submittedAt) || !ref(a.contentRef) ||
      !nonempty(a.contentVersion) || !nonempty(a.curriculumVersion) || !Array.isArray(a.objectiveIds) ||
      !a.objectiveIds.length || !a.objectiveIds.every(slug) || !unique(a.objectiveIds) || !Array.isArray(a.sourceRefs) ||
      !a.sourceRefs.length || !a.sourceRefs.every(ref) || !nonempty(a.response)) invalid();
    if (a.format === 'mcq') {
      // C02 option IDs are opaque nonempty strings (including numeric strings), not content-reference slugs.
      // New submissions check exact option membership in createAttempt; unknown historical IDs stay literal.
      if (a.rubricRef !== null || a.provenance !== 'keyed-mcq' || typeof a.correct !== 'boolean') invalid();
    } else if (a.format === 'scenario' || a.format === 'open') {
      if (!ref(a.rubricRef) || a.provenance !== 'unassessed-response' || a.correct !== null) invalid();
    } else invalid();
    ids.add(a.id);
  }
  const assessed = new Set<string>();
  for (const a of value.selfAssessments) {
    if (!object(a) || !nonempty(a.id) || ids.has(a.id) || !nonempty(a.attemptId) || assessed.has(a.attemptId) ||
      !instant(a.assessedAt) || !ref(a.rubricRef) || a.provenance !== 'self-assessment' || !Array.isArray(a.ratings) || !a.ratings.length) invalid();
    const attempt = value.attempts.find(item => item.id === a.attemptId);
    if (!attempt || attempt.format === 'mcq' || attempt.rubricRef.id !== a.rubricRef.id || attempt.rubricRef.version !== a.rubricRef.version || a.assessedAt < attempt.submittedAt) invalid();
    for (const rating of a.ratings) if (!object(rating) || !slug(rating.criterionId) || !Number.isSafeInteger(rating.score) || Number(rating.score) < 0) invalid();
    if (!unique(a.ratings.map(item => item.criterionId))) invalid();
    ids.add(a.id); assessed.add(a.attemptId);
  }
}
const copyRef = (value: ContentRef): ContentRef => ({ id: value.id, version: value.version });
export function createAttempt(bundle: ContentBundle, question: Question, response: string, id: string, submittedAt: string): QuestionAttempt {
  if (!response.trim() || (question.payload.format === 'mcq' && !question.payload.options.some(option => option.id === response))) throw new Error('Attempt an answer first.');
  return { id, submittedAt, contentRef: copyRef(question), contentVersion: bundle.contentVersion, curriculumVersion: bundle.curriculumVersion,
    objectiveIds: [...question.objectiveIds], sourceRefs: question.sourceRefs.map(copyRef), rubricRef: question.payload.rubricRef ? copyRef(question.payload.rubricRef) : null,
    format: question.payload.format, response, provenance: question.payload.format === 'mcq' ? 'keyed-mcq' : 'unassessed-response',
    correct: question.payload.format === 'mcq' ? response === question.payload.correctOptionId : null };
}
/** New attempts append; retries cannot change a submitted answer. */
export function appendAttempt(state: LearnerState, attempt: QuestionAttempt): void {
  const candidate: QuestionAttempts = structuredClone(state.questionAttempts ?? { schemaVersion: 1, attempts: [], selfAssessments: [] });
  candidate.attempts.push(structuredClone(attempt));
  validateQuestionAttempts(candidate);
  state.questionAttempts = candidate;
}
export function appendSelfAssessment(state: LearnerState, bundle: ContentBundle, attemptId: string, ratings: RubricSelfAssessment['ratings'], id: string, assessedAt: string): void {
  const candidate = structuredClone(state.questionAttempts);
  const attempt = candidate?.attempts.find(item => item.id === attemptId);
  const rubric = resolveRubric(bundle, attempt?.rubricRef);
  if (!candidate || !attempt || !rubric || ratings.length !== rubric.payload.criteria.length ||
    !rubric.payload.criteria.every(criterion => ratings.some(rating => rating.criterionId === criterion.id && criterion.levels.some(level => level.score === rating.score)))) throw new Error('Choose one rubric anchor for every criterion.');
  candidate.selfAssessments.push({ id, attemptId, assessedAt, rubricRef: copyRef(rubric), provenance: 'self-assessment', ratings: structuredClone(ratings) });
  validateQuestionAttempts(candidate);
  state.questionAttempts = candidate;
}
export const questionHash = (ref: ContentRef): string => `#questions/${ref.id}/${ref.version}`;
export function questionRoute(hash: string): ContentRef | undefined {
  const match = /^#questions\/([a-z][a-z0-9-]*)\/([1-9]\d*)$/.exec(hash);
  return match && Number.isSafeInteger(Number(match[2])) ? { id: match[1], version: Number(match[2]) } : undefined;
}
