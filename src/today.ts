import { contentHash, contentKey, safeHttps } from './content';
import type { ContentBundle, ContentRecord, ContentRef } from './content';
import { effectiveStatus } from './content-status';
import { byId, node } from './dom';
import { isRead } from './reading-progress';
import { questionHash } from './question-attempts';
import { caseHash } from './scenario-responses';
import { createReviewActions, enrollCard, estimatedRecall, ratingMeaning, setCardStatus, setNewCardLimit } from './reviews';
import type { RecallRating, ReviewInput } from './reviews';
import { availableCard, latestRecords, todayPlan } from './today-plan';
import type { Change, LearnerState } from './types';
import { phases } from './data';

interface Presentation { ref: ContentRef; signature: string; eventId: string; revealed: boolean; retry?: ReviewInput }
const signature = (card: { schedule: { reps: number; due: string } }): string => `${card.schedule.reps}:${card.schedule.due}`;
const button = (id: string, label: string, action: () => void): HTMLButtonElement => {
  const control = node('button', { id, type: 'button', class: 'btn' }, label);
  control.addEventListener('click', action); return control;
};
export function bindToday(bundle: ContentBundle, change: Change): (state: LearnerState | undefined) => void {
  const root = byId('todayStudy', 'div'), actions = createReviewActions(change);
  let state: LearnerState | undefined, presentation: Presentation | undefined, pending = false, message = '', capDraft: string | undefined;
  function provenance(parent: HTMLElement, record: ContentRecord): void {
    parent.append(node('p', { class: 'warn' }, `${effectiveStatus(bundle, record, new Date().toISOString().slice(0, 10))} · ${contentKey(record)} · Authored ${record.authoredAt} by ${record.authorIds.join(', ')}. No independent educator or legal approval is claimed.`));
  }
  async function mutate(edit: (candidate: LearnerState) => void): Promise<void> {
    if (pending) return;
    pending = true; render();
    try { if (!await change(edit)) message = 'Save failed. Committed progress is unchanged; retry when storage is available.'; else message = ''; }
    catch (error) { message = error instanceof Error ? error.message : 'Could not save.'; }
    finally { pending = false; render(); }
  }
  async function rate(rating: RecallRating): Promise<void> {
    if (pending || !presentation?.revealed) return;
    const current = presentation;
    current.retry ??= { eventId: current.eventId, contentRef: current.ref, rating, now: new Date().toISOString() };
    pending = true; message = ''; render();
    let saved = false;
    try { saved = await actions.submit(current.retry); }
    catch (error) { message = error instanceof Error ? error.message : 'Could not save this review.'; }
    finally {
      pending = false;
      if (saved) { presentation = undefined; message = `${rating} saved. Review history and schedule committed together.`; }
      else message ||= 'Review not saved. Your revealed answer remains here; retry the same rating. Committed history is unchanged.';
      render();
      root.querySelector<HTMLElement>(saved ? '#todayPrompt, #todayQueueHeading' : `#todayRate${rating}`)?.focus({ preventScroll: true });
    }
  }
  function render(): void {
    const focusId = root.contains(document.activeElement) ? document.activeElement?.id : undefined;
    const deckWasOpen = root.querySelector<HTMLDetailsElement>('#todayDeck')?.open ?? false;
    root.replaceChildren();
    const intro = node('div', { class: 'card' });
    intro.append(node('h2', {}, 'Today'), node('p', {}, 'Start with due recall, then read an original lesson, try a question and optionally apply it in a case. Stop when you need to; missed days keep overdue work. Paid resources are optional.'));
    root.append(intro);
    if (!state) { intro.append(node('p', {}, 'Load or recover saved progress to study.')); return; }
    const now = new Date().toISOString(), plan = todayPlan(bundle, state, now);
    intro.append(node('p', { id: 'todayTime' }, `Rough plan: ${plan.reviewMinutes + plan.readingMinutes + plan.questionMinutes} minutes = ${plan.reviewMinutes} queued cards × 1 minute + ${plan.readingMinutes} minutes unread lesson + ${plan.questionMinutes} minutes one question. Optional case: about ${plan.caseMinutes} minutes. These are planning assumptions, excluding retries, pauses and optional resources; no mastery or readiness prediction.`));
    const signals = node('ul', { id: 'todaySignals' });
    const reviews = state.reviewProgress?.events ?? [];
    for (const text of [
      `Reading: ${latestRecords(bundle, 'lesson').filter(record => isRead(state, record)).length}/${latestRecords(bundle, 'lesson').length} current lesson revisions marked read.`,
      `Resources: ${state.resourceProgress?.entries.filter(entry => entry.progress.at(-1)?.status === 'completed').length ?? 0} marked completed, including archived resources.`,
      `Tasks: ${phases.flatMap(phase => phase.tasks).filter(([id]) => state!.completed[id]).length}/37 marked complete.`,
      `Recall: ${reviews.length} saved ratings; ${reviews.filter(event => event.rating === 'Again').length} Again (failed recall), ${reviews.filter(event => event.rating === 'Hard').length} Hard (successful with effort).`,
      `Questions: ${state.questionAttempts?.attempts.length ?? 0} attempts; ${state.questionAttempts?.selfAssessments.length ?? 0} rubric self-assessments.`,
      `Applied assessment: ${state.scenarioResponses?.responses.length ?? 0} case responses; ${state.scenarioResponses?.selfAssessments.length ?? 0} case rubric self-assessments.`,
    ]) signals.append(node('li', {}, text));
    intro.append(signals, node('p', { class: 'side-note' }, 'Participation, observed recall ratings, question attempts and applied self-assessment are separate signals. The six legacy self-ratings remain in Competencies. No completion implies competency.'));
    const study = node('section', { class: 'card', 'aria-labelledby': 'todayQueueHeading' });
    const h = node('h2', { id: 'todayQueueHeading', tabindex: '-1' }, '1 · Recall first');
    study.append(h, node('p', { id: 'todayQueue' }, `${plan.queue.due.length} due or overdue reviews before ${plan.queue.newCards.length} allowed new cards. ${plan.queue.remainingNew} new introductions remaining today in ${Intl.DateTimeFormat().resolvedOptions().timeZone}.`));
    study.append(node('p', { id: 'todayMessage', role: 'status' }, message));
    root.append(study);
    const eligible = [...plan.due, ...plan.newCards];
    // Keep a revealed prompt on failed saves; reset on imported/reset/changed schedules or committed events.
    if (presentation && (!eligible.some(card => contentKey(card.contentRef) === contentKey(presentation!.ref) && signature(card) === presentation!.signature) || reviews.some(event => event.id === presentation!.eventId))) presentation = undefined;
    const first = eligible[0];
    if (!presentation && first) presentation = { ref: { ...first.contentRef }, signature: signature(first), eventId: crypto.randomUUID(), revealed: false };
    const card = presentation ? availableCard(bundle, presentation.ref) : undefined;
    const controls = node('fieldset', { class: 'today-controls' }); controls.disabled = pending; controls.dataset.pending = String(pending);
    study.append(controls);
    if (card && presentation) {
      controls.append(node('legend', {}, card.title)); provenance(controls, card);
      controls.append(node('h3', { id: 'todayPrompt', tabindex: '-1' }, String(card.payload.prompt)));
      const scheduled = eligible.find(item => contentKey(item.contentRef) === contentKey(card))!;
      controls.append(node('p', {}, `${scheduled.schedule.reps ? 'Due review' : 'New card'} · Due ${new Date(scheduled.schedule.due).toLocaleString()}`));
      if (!presentation.revealed) {
        controls.append(button('todayReveal', 'Reveal answer', () => { presentation!.revealed = true; render(); root.querySelector<HTMLElement>('#todayAnswer')?.focus(); }));
      } else {
        controls.append(node('p', { id: 'todayAnswer', tabindex: '-1' }, String(card.payload.answer)));
        const ratings = node('div', { class: 'today-actions' });
        for (const rating of ['Again', 'Hard', 'Good', 'Easy'] as const) {
          const control = button(`todayRate${rating}`, presentation.retry ? `Retry ${rating}` : rating, () => { void rate(rating); });
          control.setAttribute('aria-label', `${presentation.retry ? 'Retry ' : ''}${rating} — ${ratingMeaning[rating]}`);
          control.disabled = !!presentation.retry && presentation.retry.rating !== rating;
          ratings.append(control);
        }
        controls.append(node('p', {}, 'Again: failed recall. Hard: successful with effort. Good: successful. Easy: easy successful recall. Judge what you recalled before revealing this answer.'), ratings);
        const probability = estimatedRecall(scheduled, now);
        controls.append(node('p', { class: 'side-note' }, probability === undefined ? 'No recall estimate before the first saved rating.' : `FSRS model-estimated recall before this rating: ${Math.round(probability * 100)}%. This is a model probability, separate from observed ratings and competency.`));
        const refs = node('ul');
        for (const ref of card.sourceRefs) {
          const source = bundle.records.find(item => contentKey(item) === contentKey(ref));
          const url = safeHttps(source?.payload.url); const item = node('li');
          if (source && url) item.append(node('a', { href: url, target: '_blank', rel: 'noopener noreferrer' }, `${source.title} · v${source.version}`));
          if (source) item.append(node('span', {}, ` · ${effectiveStatus(bundle, source, now.slice(0, 10))}; checked ${source.payload.checkedAt}; review due ${source.payload.reviewDueAt}.`));
          refs.append(item);
        }
        controls.append(refs);
      }
    } else controls.append(node('p', {}, 'No available cards due now. Enroll cards below, or continue with the lesson. Future reviews return at their due time; no overdue history is erased.'));
    if (plan.unavailable) study.append(node('p', { class: 'warn' }, `${plan.unavailable} eligible exact card revisions are unavailable in this bundle. History and due dates are retained. Manage them below; no newer answer is substituted.`));
    study.append(button('todayRefresh', 'Refresh due queue', () => render()));
    const next = node('section', { class: 'card' });
    next.append(node('h2', {}, '2 · Read, question, apply'));
    const links = node('ol');
    for (const [record, label, href] of [
      [plan.lesson, 'Original lesson', plan.lesson ? contentHash(plan.lesson) : ''],
      [plan.question, 'Related question', plan.question ? questionHash(plan.question) : ''],
      [plan.scenario, 'Optional executive case', plan.scenario ? caseHash(plan.scenario) : ''],
    ] as const) if (record) {
      const li = node('li'); li.append(node('a', { href }, `${label}: ${record.title} · v${record.version}`)); provenance(li, record); links.append(li);
    }
    next.append(links, node('a', { href: '#roadmap' }, 'Task progress and optional resource tracking'), node('p', { class: 'side-note' }, 'Return to Today using its tab. Links and progress stay local; export a full backup to carry all five learning namespaces to another browser.'));
    root.append(next);
    const settings = node('details', { class: 'card', id: 'todayDeck' }); settings.open = deckWasOpen;
    settings.append(node('summary', {}, 'Manage cards and daily new-card limit'));
    const deck = node('fieldset', { class: 'today-controls' }); deck.disabled = pending; deck.dataset.pending = String(pending);
    settings.append(deck); deck.append(node('legend', {}, 'Explicit enrollment and settings'));
    const form = node('form'), input = node('input', { id: 'todayCap', type: 'number', min: '0', max: '100', step: '1', required: '' });
    input.value = capDraft ?? String(state.reviewProgress?.settings.newCardsPerDay ?? 5);
    input.addEventListener('input', () => { capDraft = input.value; });
    form.append(node('label', { for: 'todayCap' }, 'Maximum new cards per local day (0–100)'), input, node('button', { type: 'submit', class: 'btn' }, 'Save new-card limit'));
    form.addEventListener('submit', event => { event.preventDefault(); const limit = Number(input.value); void mutate(candidate => setNewCardLimit(candidate, limit)).then(() => { if (state?.reviewProgress?.settings.newCardsPerDay === limit) capDraft = undefined; }); });
    deck.append(form, node('p', {}, 'Limits apply only to first ratings of new cards. Due and overdue reviews remain available even at zero. Suspending or archiving keeps exact schedules and history; restoring keeps the original due date.'));
    const cards = latestRecords(bundle, 'card').filter(record => effectiveStatus(bundle, record, now.slice(0, 10)) !== 'retired');
    const missing = cards.filter(record => !state!.reviewProgress?.cards.some(item => contentKey(item.contentRef) === contentKey(record)));
    if (missing.length) deck.append(button('todayEnrollAll', `Enroll ${missing.length} foundation draft cards`, () => { const at = new Date().toISOString(); void mutate(candidate => { for (const record of missing) enrollCard(candidate, { id: record.id, version: record.version }, at); }); }));
    const list = node('ul', { class: 'today-deck' });
    const all = [...cards.map(record => ({ ref: { id: record.id, version: record.version }, title: record.title })), ...(state.reviewProgress?.cards ?? []).filter(item => !cards.some(record => contentKey(record) === contentKey(item.contentRef))).map(item => ({ ref: item.contentRef, title: availableCard(bundle, item.contentRef)?.title ?? 'Unavailable exact revision' }))];
    for (const { ref, title } of all) {
      const enrolled = state.reviewProgress?.cards.find(item => contentKey(item.contentRef) === contentKey(ref)), li = node('li');
      li.append(node('span', {}, `${title} · ${contentKey(ref)} · ${enrolled?.status ?? 'not enrolled'} `));
      if (!enrolled) li.append(button(`enroll-${ref.id}-${ref.version}`, 'Enroll', () => { void mutate(candidate => enrollCard(candidate, ref, new Date().toISOString())); }));
      else {
        for (const [status, label] of [['active', 'Restore'], ['suspended', 'Suspend'], ['archived', 'Archive']] as const) if (enrolled.status !== status)
          li.append(button(`${status}-${ref.id}-${ref.version}`, label, () => { void mutate(candidate => setCardStatus(candidate, ref, status)); }));
      }
      list.append(li);
    }
    deck.append(list); root.append(settings);
    if (focusId?.startsWith('today') || focusId?.includes('-card-')) {
      settings.open ||= focusId.startsWith('todayCap') || focusId.startsWith('todayEnroll') || focusId.includes('-card-');
      document.getElementById(focusId)?.focus({ preventScroll: true });
    }
  }
  window.addEventListener('hashchange', () => { if (location.hash === '#today') render(); });
  // Recheck newly due cards and local midnight without disrupting typing or a revealed answer.
  window.setInterval(() => { if (location.hash === '#today' && !root.contains(document.activeElement) && !pending) render(); }, 30000);
  return next => { state = next; render(); };
}
