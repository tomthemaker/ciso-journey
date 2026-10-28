import { createEmptyCard, fsrs, Rating } from 'ts-fsrs';
import type { Card, FSRSParameters, ReviewLog } from 'ts-fsrs';
import { contentKey } from './content.ts';
import type { ContentRef } from './content.ts';
import type { Change, LearnerState } from './types.ts';

export type RecallRating = 'Again' | 'Hard' | 'Good' | 'Easy';
export type CardStatus = 'active' | 'suspended' | 'archived';
export type Schedule = Omit<Card, 'due' | 'last_review'> & { due: string; last_review: string | null; [key: string]: unknown };
export type StoredReviewLog = Omit<ReviewLog, 'due' | 'review'> & { due: string; review: string; [key: string]: unknown };
export interface ScheduledCard { contentRef: ContentRef; status: CardStatus; schedule: Schedule; [key: string]: unknown }
export interface ReviewEvent {
  id: string;
  contentRef: ContentRef;
  rating: RecallRating;
  reviewedAt: string;
  timeZone: string;
  provenance: typeof PROVENANCE;
  before: Schedule;
  after: Schedule;
  log: StoredReviewLog;
  [key: string]: unknown;
}
export interface ReviewProgress {
  schemaVersion: 1;
  settings: { newCardsPerDay: number; [key: string]: unknown };
  cards: ScheduledCard[];
  events: ReviewEvent[];
  [key: string]: unknown;
}
/** Explicit preset: no fitted personal parameters, random seed or fuzz. Library upgrades need a new adapter version. */
const PARAMETERS: FSRSParameters = {
  request_retention: 0.90, maximum_interval: 36500,
  w: [0.212, 1.2931, 2.3065, 8.2956, 6.4133, 0.8334, 3.0194, 0.001, 1.8722, 0.1666, 0.796, 1.4835, 0.0614, 0.2629, 1.6483, 0.6014, 1.8729, 0.5425, 0.0912, 0.0658, 0.1542],
  enable_fuzz: false, enable_short_term: true, learning_steps: ['1m', '10m'], relearning_steps: ['10m'],
};
export const PROVENANCE = { adapterVersion: 1, library: 'ts-fsrs', libraryVersion: '5.4.2', schedulerVersion: 'FSRS-6.0', parameters: PARAMETERS } as const;
Object.freeze(PARAMETERS.w);
Object.freeze(PARAMETERS.learning_steps);
Object.freeze(PARAMETERS.relearning_steps);
Object.freeze(PARAMETERS);
Object.freeze(PROVENANCE);
const scheduler = fsrs(PARAMETERS);
export const ratingMeaning: Readonly<Record<RecallRating, string>> = {
  Again: 'Failed recall', Hard: 'Successful recall with effort', Good: 'Successful recall', Easy: 'Easy successful recall',
};
const ratings: RecallRating[] = ['Again', 'Hard', 'Good', 'Easy'];
const statuses: CardStatus[] = ['active', 'suspended', 'archived'];
const stringEnum = <T extends string>(value: unknown, values: readonly T[]): value is T => typeof value === 'string' && values.includes(value as T);
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
function invalid(): never { throw new Error('Invalid or unsupported review progress. Current progress has not changed.'); }
function instant(v: unknown): v is string { return typeof v === 'string' && Number.isFinite(Date.parse(v)) && new Date(v).toISOString() === v; }
function refValid(v: unknown): v is ContentRef { return object(v) && typeof v.id === 'string' && /^[a-z][a-z0-9-]*$/.test(v.id) && Number.isSafeInteger(v.version) && Number(v.version) > 0; }
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
function scheduleValid(v: unknown): v is Schedule {
  if (!object(v) || !instant(v.due) || !(v.last_review === null || instant(v.last_review))) return false;
  if (!['stability', 'difficulty', 'elapsed_days', 'scheduled_days'].every(k => typeof v[k] === 'number' && Number.isFinite(v[k]) && Number(v[k]) >= 0)) return false;
  return ['reps', 'lapses', 'learning_steps', 'state'].every(k => integer(v[k])) && Number(v.state) <= 3 && Number(v.difficulty) <= 10 && Number(v.lapses) <= Number(v.reps);
}
function toStored(card: Card): Schedule { return { ...card, due: card.due.toISOString(), last_review: card.last_review?.toISOString() ?? null }; }
function toCard(card: Schedule): Card { return { ...card, due: new Date(card.due), last_review: card.last_review === null ? undefined : new Date(card.last_review) }; }
function calculate(before: Schedule, rating: RecallRating, now: string): { after: Schedule; log: StoredReviewLog } {
  const result = scheduler.next(toCard(before), new Date(now), Rating[rating]);
  return { after: toStored(result.card), log: { ...result.log, due: result.log.due.toISOString(), review: result.log.review.toISOString() } };
}
// Compare owned fields only, preserving compatible extension fields at every level.
function contains(actual: Record<string, unknown>, expected: Record<string, unknown>): boolean {
  return Object.entries(expected).every(([key, value]) => {
    const candidate = actual[key];
    if (Array.isArray(value)) return Array.isArray(candidate) && candidate.length === value.length && value.every((item, index) => Object.is(item, candidate[index]));
    if (object(value)) return object(candidate) && contains(candidate, value);
    return Object.is(candidate, value);
  });
}
function sameSchedule(actual: Schedule, expected: Schedule): boolean {
  const keys = ['due', 'last_review', 'stability', 'difficulty', 'elapsed_days', 'scheduled_days', 'learning_steps', 'reps', 'lapses', 'state'];
  return keys.every(key => Object.is(actual[key], expected[key]));
}
/** Calendar day in the learner's timezone, including DST; UTC instants remain authoritative for due times. */
export function localDay(now: string, timeZone: string = Intl.DateTimeFormat().resolvedOptions().timeZone): string {
  if (!instant(now)) throw new Error('Review time must be a UTC ISO instant.');
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(now));
  return ['year', 'month', 'day'].map(type => parts.find(part => part.type === type)!.value).join('-');
}
/** Full validation is shared by import, migration, refresh and the atomic storage boundary. */
export function validateReviewProgress(value: unknown): asserts value is ReviewProgress {
  if (!object(value) || value.schemaVersion !== 1 || !object(value.settings) || !integer(value.settings.newCardsPerDay) || Number(value.settings.newCardsPerDay) > 100 || !Array.isArray(value.cards) || !Array.isArray(value.events)) invalid();
  const cards = new Map<string, ScheduledCard>();
  for (const card of value.cards) {
    if (!object(card) || !refValid(card.contentRef) || !stringEnum(card.status, statuses) || !scheduleValid(card.schedule)) invalid();
    const key = contentKey(card.contentRef);
    if (cards.has(key)) invalid();
    cards.set(key, card as unknown as ScheduledCard);
  }
  const ids = new Set<string>();
  const previous = new Map<string, Schedule>();
  for (const event of value.events) {
    if (!object(event) || typeof event.id !== 'string' || !event.id || ids.has(event.id) || !refValid(event.contentRef) || !stringEnum(event.rating, ratings) || !instant(event.reviewedAt) || typeof event.timeZone !== 'string' || !object(event.provenance) || !contains(event.provenance, PROVENANCE) || !scheduleValid(event.before) || !scheduleValid(event.after) || !object(event.log)) invalid();
    try { localDay(event.reviewedAt, event.timeZone); } catch { invalid(); }
    const key = contentKey(event.contentRef);
    if (!cards.has(key) || Date.parse(event.before.due) > Date.parse(event.reviewedAt)) invalid();
    const prior = previous.get(key);
    if (prior ? !sameSchedule(event.before, prior) : !sameSchedule(event.before, toStored(createEmptyCard(event.before.due)))) invalid();
    const calculated = calculate(event.before, event.rating, event.reviewedAt);
    if (!sameSchedule(event.after, calculated.after) || !contains(event.log, calculated.log)) invalid();
    ids.add(event.id);
    previous.set(key, event.after);
  }
  for (const [key, card] of cards) {
    const last = previous.get(key) ?? toStored(createEmptyCard(card.schedule.due));
    if (!sameSchedule(card.schedule, last)) invalid();
  }
}
function progress(state: LearnerState): ReviewProgress {
  return state.reviewProgress ??= { schemaVersion: 1, settings: { newCardsPerDay: 5 }, cards: [], events: [] };
}
/** A corrected content revision is a separate schedule; enrolling never deletes or retargets old history. */
export function enrollCard(state: LearnerState, contentRef: ContentRef, now: string): void {
  if (!refValid(contentRef) || !instant(now)) throw new Error('Invalid card revision or enrollment time.');
  const reviews = progress(state);
  if (!reviews.cards.some(card => contentKey(card.contentRef) === contentKey(contentRef)))
    reviews.cards.push({ contentRef: { ...contentRef }, status: 'active', schedule: toStored(createEmptyCard(now)) });
}
export function setCardStatus(state: LearnerState, ref: ContentRef, status: CardStatus): void {
  if (!stringEnum(status, statuses)) throw new Error('Invalid card status.');
  const card = state.reviewProgress?.cards.find(card => contentKey(card.contentRef) === contentKey(ref));
  if (!card) throw new Error('Card revision is not enrolled.');
  card.status = status;
}
export function setNewCardLimit(state: LearnerState, limit: number): void {
  if (!integer(limit) || limit > 100) throw new Error('New-card limit must be an integer from 0 to 100.');
  progress(state).settings.newCardsPerDay = limit;
}
export function dueQueue(state: LearnerState, now: string, timeZone?: string): { due: ScheduledCard[]; newCards: ScheduledCard[]; remainingNew: number } {
  const day = localDay(now, timeZone);
  const reviews = state.reviewProgress;
  const introduced = new Set(reviews?.events.filter(event => event.before.reps === 0 && localDay(event.reviewedAt, timeZone) === day).map(event => contentKey(event.contentRef)));
  const remainingNew = Math.max(0, (reviews?.settings.newCardsPerDay ?? 5) - introduced.size);
  const eligible = reviews?.cards.filter(card => card.status === 'active' && Date.parse(card.schedule.due) <= Date.parse(now)) ?? [];
  const sort = (a: ScheduledCard, b: ScheduledCard) => Date.parse(a.schedule.due) - Date.parse(b.schedule.due) || contentKey(a.contentRef).localeCompare(contentKey(b.contentRef));
  return { due: eligible.filter(card => card.schedule.reps > 0).sort(sort), newCards: eligible.filter(card => card.schedule.reps === 0).sort(sort).slice(0, remainingNew), remainingNew };
}
export interface ReviewInput { eventId: string; contentRef: ContentRef; rating: RecallRating; now: string; timeZone?: string }
/** Append on a private candidate, then persist the entire candidate once via Change/F03. Never changes task or competency state. */
export function applyReview(state: LearnerState, input: ReviewInput): ReviewEvent {
  if (!input.eventId || typeof input.eventId !== 'string' || !refValid(input.contentRef) || !stringEnum(input.rating, ratings) || !instant(input.now)) throw new Error('Invalid review submission.');
  const reviews = progress(state);
  const existing = reviews.events.find(event => event.id === input.eventId);
  if (existing) {
    if (contentKey(existing.contentRef) !== contentKey(input.contentRef) || existing.rating !== input.rating) throw new Error('Review event ID was already used for another answer.');
    return structuredClone(existing);
  }
  const queue = dueQueue(state, input.now, input.timeZone);
  const card = [...queue.due, ...queue.newCards].find(card => contentKey(card.contentRef) === contentKey(input.contentRef));
  if (!card) throw new Error('Card is not due, is suspended/archived, or the daily new-card limit is reached.');
  const before = structuredClone(card.schedule);
  const { after, log } = calculate(before, input.rating, input.now);
  const event: ReviewEvent = { id: input.eventId, contentRef: { ...input.contentRef }, rating: input.rating, reviewedAt: input.now, timeZone: input.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone, provenance: structuredClone(PROVENANCE), before, after: structuredClone(after), log };
  reviews.events.push(event);
  card.schedule = { ...card.schedule, ...after };
  return structuredClone(event);
}
/** UI integration hook: keep one eventId per displayed answer/retry. Duplicate concurrent submissions share a promise. */
export function createReviewActions(change: Change): { submit: (input: ReviewInput) => Promise<boolean> } {
  const pending = new Map<string, { signature: string; result: Promise<boolean> }>();
  return { submit(input) {
    const signature = `${contentKey(input.contentRef)}:${input.rating}`;
    const existing = pending.get(input.eventId);
    if (existing) return existing.signature === signature ? existing.result : Promise.reject(new Error('Review event ID was already used for another answer.'));
    const result = change(candidate => { applyReview(candidate, input); });
    pending.set(input.eventId, { signature, result });
    void result.finally(() => { pending.delete(input.eventId); }).catch(() => {});
    return result;
  } };
}
/** A model estimate of recall probability, never a competency/assessment result. */
export function estimatedRecall(card: ScheduledCard, now: string): number | undefined {
  if (!instant(now)) throw new Error('Invalid estimate time.');
  if (!card.schedule.last_review) return undefined;
  return scheduler.get_retrievability(toCard(card.schedule), now, false);
}
