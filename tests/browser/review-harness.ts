// Built only by the local browser-test command, after the production build.
import { LearnerStorage } from '../../src/storage.ts';
import { createReviewActions, enrollCard, setNewCardLimit, setCardStatus, dueQueue } from '../../src/reviews.ts';
import type { ReviewInput, CardStatus } from '../../src/reviews.ts';
import type { ContentRef } from '../../src/content.ts';
import type { LearnerState } from '../../src/types.ts';
export async function openReviews() {
  const storage = new LearnerStorage();
  let state = await storage.load();
  let error = '';
  const change = async (edit: (candidate: LearnerState) => void): Promise<boolean> => {
    const candidate = structuredClone(state);
    try {
      edit(candidate);
      await storage.save(candidate);
      state = candidate;
      error = '';
      return true;
    } catch (failure) { error = String(failure); return false; }
  };
  const actions = createReviewActions(change);
  return {
    enroll: (ref: ContentRef, now: string) => change(candidate => enrollCard(candidate, ref, now)),
    limit: (limit: number) => change(candidate => setNewCardLimit(candidate, limit)),
    status: (ref: ContentRef, status: CardStatus) => change(candidate => setCardStatus(candidate, ref, status)),
    submit: (input: ReviewInput) => actions.submit(input),
    queue: (now: string, timeZone: string) => dueQueue(state, now, timeZone),
    state: () => structuredClone(state),
    error: () => error,
  };
}
