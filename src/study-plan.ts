import { contentKey, findContent } from './content.ts';
import type { ContentBundle, ContentRecord, ContentRef } from './content.ts';
import { latestRecords } from './content-catalog.ts';
import { isRead } from './reading-progress.ts';
import { resolveRubric } from './question-attempts.ts';
import { dueQueue } from './reviews.ts';
import { studyTaskIds } from './study-preferences.ts';
import type { LearnerState } from './types.ts';

export interface StudyTask { id: string; prerequisiteTaskIds: string[] }
export interface StudySuggestion { record: ContentRecord; minutes: number; reasons: string[]; warnings: string[]; fits: boolean; override: boolean }
const key = contentKey;
const exact = (refs: ContentRef[], ref: ContentRef) => refs.some(r => key(r) === key(ref));
/** Inspect exact reading revisions, including historical prerequisites. Cycles and missing refs block automatic suggestions. */
export function readingGaps(bundle: ContentBundle, state: LearnerState, record: ContentRecord) {
  const ready: ContentRecord[] = [], warnings: string[] = [], visited = new Set<string>();
  function visit(current: ContentRecord, path: Set<string>): void {
    if (path.has(key(current))) { warnings.push(`Prerequisite cycle at ${key(current)}; choose manually after checking the lesson.`); return; }
    if (visited.has(key(current))) return;
    const next = new Set(path).add(key(current));
    const refs = current.payload.prerequisiteRefs ?? [];
    for (const ref of refs) {
      if (isRead(state, ref)) continue;
      const prerequisite = findContent(bundle, ref);
      if (prerequisite?.kind !== 'lesson') warnings.push(`Exact prerequisite ${key(ref)} is unavailable; no newer revision is substituted.`);
      else visit(prerequisite, next);
    }
    if (!isRead(state, current) && refs.every(ref => isRead(state, ref))) ready.push(current);
    visited.add(key(current));
  }
  visit(record, new Set());
  return { ready, warnings: [...new Set(warnings)] };
}
/** Latest keyed answers and latest explicit rubric judgments are separate observations.
 * A newer unassessed response cannot erase an earlier explicit rubric judgment. */
function feedback(bundle: ContentBundle, state: LearnerState): Map<string, string[]> {
  const reasons = new Map<string, string[]>();
  function add(ref: ContentRef, reason: string) { reasons.set(key(ref), [...(reasons.get(key(ref)) ?? []), reason]); }
  const attempts = [...(state.questionAttempts?.attempts ?? [])].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.id.localeCompare(b.id));
  for (const attempt of new Map(attempts.map(item => [key(item.contentRef), item])).values())
    if (attempt.provenance === 'keyed-mcq' && attempt.correct === false) add(attempt.contentRef, 'Your latest keyed MCQ attempt on this exact revision was incorrect; revisit the explanation.');
  const questionJudgments = [...(state.questionAttempts?.selfAssessments ?? [])].sort((a, b) => a.assessedAt.localeCompare(b.assessedAt) || a.id.localeCompare(b.id));
  const latestQuestions = new Map<string, typeof questionJudgments[number]>();
  for (const judgment of questionJudgments) {
    const attempt = attempts.find(item => item.id === judgment.attemptId);
    if (attempt) latestQuestions.set(key(attempt.contentRef), judgment);
  }
  for (const [reference, judgment] of latestQuestions) if (lowAnchor(bundle, judgment)) {
    const attempt = attempts.find(item => key(item.contentRef) === reference)!;
    add(attempt.contentRef, 'Your latest explicit question rubric self-rating includes a low exact available anchor; an unassessed response does not supersede it.');
  }
  const responses = state.scenarioResponses?.responses ?? [];
  const caseJudgments = [...(state.scenarioResponses?.selfAssessments ?? [])].sort((a, b) => a.assessedAt.localeCompare(b.assessedAt) || a.id.localeCompare(b.id));
  const latestCases = new Map<string, typeof caseJudgments[number]>();
  for (const judgment of caseJudgments) {
    const response = responses.find(item => item.id === judgment.responseId);
    if (response) latestCases.set(key(response.contentRef), judgment);
  }
  for (const [reference, judgment] of latestCases) if (lowAnchor(bundle, judgment)) {
    const response = responses.find(item => key(item.contentRef) === reference)!;
    add(response.contentRef, 'Your latest explicit case rubric self-rating includes a low exact available anchor; this is self-reported feedback, retained until another explicit judgment.');
  }
  return reasons;
}
function lowAnchor(bundle: ContentBundle, assessment: { rubricRef: ContentRef; ratings: { criterionId: string; score: number }[] }): boolean {
  const rubric = resolveRubric(bundle, assessment.rubricRef);
  return assessment.ratings.some(rating => {
    const levels = rubric?.payload.criteria.find(c => c.id === rating.criterionId)?.levels;
    return !!levels?.some(level => level.score === rating.score) && rating.score === Math.min(...levels.map(level => level.score)) && levels.some(level => level.score > rating.score);
  });
}
/** Pure deterministic ranking. Budgets describe a suggested session; no scheduler/history/progress writes occur. */
export function personalizedPlan(bundle: ContentBundle, state: LearnerState, now: string, tasks: StudyTask[] = [], timeZone?: string) {
  const preferences = state.studyPreferences, budget = preferences?.dailyMinutes ?? 45, goals = [...(preferences?.goalTaskIds ?? [])].sort((a, b) => studyTaskIds.indexOf(a) - studyTaskIds.indexOf(b));
  const queue = dueQueue(state, now, timeZone), remaining = Math.max(0, budget - queue.due.length);
  const warnings: string[] = [], goalPath = new Set<string>(), taskGaps: string[] = [];
  function visitTask(id: string, path: Set<string>): void {
    if (path.has(id)) { warnings.push(`Task prerequisite cycle at ${id}; automatic task ordering is blocked for this path.`); return; }
    if (state.completed[id]) return;
    const prerequisites = tasks.find(task => task.id === id)?.prerequisiteTaskIds ?? [];
    if (prerequisites.some(prerequisite => !state.completed[prerequisite])) for (const prerequisite of prerequisites) visitTask(prerequisite, new Set(path).add(id));
    else if (!taskGaps.includes(id)) taskGaps.push(id);
    goalPath.add(id);
  }
  for (const goal of [...goals].sort((a, b) => studyTaskIds.indexOf(a) - studyTaskIds.indexOf(b))) visitTask(goal, new Set());
  const dueTasks = new Set(queue.due.flatMap(card => findContent(bundle, card.contentRef)?.taskIds ?? []));
  const observed = feedback(bundle, state);
  const candidates = new Map<string, StudySuggestion & { priority: number }>();
  const lessonRecords = latestRecords(bundle, 'lesson');
  const practiced = [...latestRecords(bundle, 'question'), ...latestRecords(bundle, 'scenario')];
  function add(record: ContentRecord, priority: number, reasons: string[], blocked: string[] = [], override = false) {
    const minutes = record.kind === 'lesson' ? (typeof record.payload.estimatedMinutes === 'number' ? record.payload.estimatedMinutes : 20) : record.kind === 'question' ? 3 : 15;
    const previous = candidates.get(key(record));
    candidates.set(key(record), { record, priority: Math.min(priority, previous?.priority ?? Infinity), minutes, reasons: [...new Set(previous && previous.priority <= priority ? [...previous.reasons, ...reasons] : [...reasons, ...(previous?.reasons ?? [])])].slice(0, 4), warnings: blocked, fits: minutes <= remaining, override });
  }
  for (const lesson of lessonRecords) {
    const relatedFeedback = practiced.filter(record => observed.has(key(record)) && (exact(lesson.payload.practiceRefs ?? [], record) || record.taskIds.some(id => lesson.taskIds.includes(id))));
    const reasons: string[] = [], priority = relatedFeedback.length ? 1 : lesson.taskIds.some(id => dueTasks.has(id)) ? 2 : lesson.taskIds.some(id => goalPath.has(id)) ? 3 : 4;
    if (relatedFeedback.length) reasons.push('Related practice has an observed incorrect answer or explicit low rubric self-rating; reading is a suggested revisit, not a competency judgment.');
    if (lesson.taskIds.some(id => dueTasks.has(id))) reasons.push('Related enrolled cards are due or overdue. Their reviews stay in the queue.');
    if (lesson.taskIds.some(id => goalPath.has(id))) reasons.push(`Supports your selected task goals (${goals.join(', ')}) or their open task prerequisites.`);
    if (!reasons.length) reasons.push('Continue in roadmap order; no stronger observed practice signal or selected goal applies.');
    const gaps = readingGaps(bundle, state, lesson);
    warnings.push(...gaps.warnings);
    if (gaps.warnings.length) continue;
    if (!isRead(state, lesson) || gaps.ready.length) for (const ready of gaps.ready) add(ready, priority, key(ready) === key(lesson) ? reasons.concat('Exact reading prerequisites are marked read or none are required.') : reasons.concat(`Read this exact prerequisite before ${lesson.title} (${key(lesson)}).`));
    else if (priority < 4) add(lesson, priority + 0.5, reasons.concat('This revision is already marked read; revisit is optional.'));
    if (isRead(state, lesson) && !gaps.ready.length) for (const practice of (lesson.payload.practiceRefs ?? []).flatMap(ref => findContent(bundle, ref) ?? []).filter(record => ['question', 'scenario'].includes(record.kind))) {
      const observedReasons = observed.get(key(practice));
      const attempted = practice.kind === 'question' ? state.questionAttempts?.attempts.some(a => key(a.contentRef) === key(practice)) : state.scenarioResponses?.responses.some(a => key(a.contentRef) === key(practice));
      if (observedReasons || !attempted) add(practice, observedReasons ? 0 : priority + 0.25, observedReasons ?? ['Practice an exact reference from a lesson marked read; no attempt on this revision is recorded.']);
    }
  }
  // Standalone applied cases can have feedback without belonging to a lesson's practice list.
  for (const record of practiced.filter(item => observed.has(key(item)))) {
    const parent = lessonRecords.find(lesson => exact(lesson.payload.practiceRefs ?? [], record));
    if (!parent) {
      const gaps = readingGaps(bundle, state, record);
      if (!gaps.warnings.length && (record.payload.prerequisiteRefs ?? []).every(ref => isRead(state, ref))) add(record, 0, observed.get(key(record))!);
      warnings.push(...gaps.warnings);
    }
  }
  const override = preferences?.overrideRef;
  if (override) {
    const record = findContent(bundle, override);
    if (record && ['lesson', 'question', 'scenario'].includes(record.kind)) {
      const parent = record.kind === 'lesson' ? record : lessonRecords.find(lesson => exact(lesson.payload.practiceRefs ?? [], record));
      const gaps = parent ? readingGaps(bundle, state, parent) : undefined;
      const blocked = [...(gaps?.warnings ?? []), ...(gaps?.ready.filter(item => key(item) !== key(record)).map(item => `Unread exact prerequisite/context: ${item.title} (${key(item)}).`) ?? [])];
      add(record, -1, ['You explicitly chose this exact revision. Clear the override to restore automatic ranking.'], blocked, true);
    } else warnings.push(`Your chosen exact revision ${key(override)} is unavailable for study. The saved choice is retained; choose another or clear it.`);
  }
  const ranked = [...candidates.values()].sort((a, b) => a.priority - b.priority || studyTaskIds.indexOf(a.record.taskIds[0]) - studyTaskIds.indexOf(b.record.taskIds[0]) || key(a.record).localeCompare(key(b.record)));
  const selected = ranked.find(item => item.override) ?? ranked.find(item => item.fits);
  if (goals.length > 1) warnings.push('Goals have equal priority. Shared prerequisites come first; remaining ties follow roadmap order. Choose an override to change the order.');
  if (queue.due.length >= budget) warnings.push(`${queue.due.length} due reviews meet or exceed the ${budget}-minute budget at roughly one minute each. All remain available; unfinished reviews carry over without schedule changes.`);
  if (!selected && ranked.length) warnings.push('No full suggested activity fits the remaining budget. Choose an activity manually, study part of a lesson, or increase the budget; no completion is recorded automatically.');
  return { budget, remaining, queue, selected, suggestions: ranked, taskGaps, warnings: [...new Set(warnings)] };
}
