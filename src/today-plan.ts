import { contentKey, findContent } from './content.ts';
import type { ContentBundle, ContentRecord } from './content.ts';
import { isRead } from './reading-progress.ts';
import { dueQueue } from './reviews.ts';
import type { LearnerState } from './types.ts';
import { latestRecords } from './content-catalog.ts';
export { latestRecords } from './content-catalog.ts';

/** Bulk enrollment is for new card IDs, never an implicit adoption of a revision. */
export function cardsForBulkEnrollment(cards: ContentRecord[], state: LearnerState): ContentRecord[] {
  const enrolledIds = new Set(state.reviewProgress?.cards.map(card => card.contentRef.id) ?? []);
  return cards.filter(card => !enrolledIds.has(card.id));
}
/** Unknown historical revisions stay in the scheduler and backup, never silently use today's answer. */
export function availableCard(bundle: ContentBundle, ref: { id: string; version: number }): ContentRecord | undefined {
  const record = findContent(bundle, ref);
  return record?.kind === 'card' && typeof record.payload.prompt === 'string' && typeof record.payload.answer === 'string' ? record : undefined;
}
export function todayPlan(bundle: ContentBundle, state: LearnerState, now: string, timeZone?: string) {
  const queue = dueQueue(state, now, timeZone);
  const due = queue.due.filter(card => availableCard(bundle, card.contentRef));
  const newCards = queue.newCards.filter(card => availableCard(bundle, card.contentRef));
  const lessons = latestRecords(bundle, 'lesson');
  const firstCard = availableCard(bundle, [...due, ...newCards][0]?.contentRef ?? { id: '', version: 0 });
  const related = (record: ContentRecord) => firstCard?.taskIds.some(id => record.taskIds.includes(id));
  const unread = lessons.filter(record => !isRead(state, record));
  const lesson = lessons.find(related) ?? unread.find(record => (record.payload.prerequisiteRefs ?? []).every(ref => isRead(state, ref))) ?? unread[0] ?? lessons[0];
  const practice = (lesson?.payload.practiceRefs ?? []).flatMap(ref => findContent(bundle, ref) ?? []);
  const pinnedQuestions = practice.filter(record => record.kind === 'question');
  const questions = pinnedQuestions.length ? pinnedQuestions : latestRecords(bundle, 'question').filter(record => record.taskIds.some(id => lesson?.taskIds.includes(id)));
  const question = questions.find(record => !state.questionAttempts?.attempts.some(attempt => contentKey(attempt.contentRef) === contentKey(record))) ?? questions[0];
  const scenario = practice.find(record => record.kind === 'scenario') ?? latestRecords(bundle, 'scenario').find(record => record.taskIds.some(id => lesson?.taskIds.includes(id)));
  const readingMinutes = lesson && !isRead(state, lesson) && typeof lesson.payload.estimatedMinutes === 'number' ? lesson.payload.estimatedMinutes : 0;
  return { queue, due, newCards, lesson, question, scenario,
    unavailable: [...queue.due, ...queue.newCards].length - due.length - newCards.length,
    reviewMinutes: due.length + newCards.length, readingMinutes, questionMinutes: question ? 3 : 0,
    caseMinutes: scenario ? 15 : 0 };
}
