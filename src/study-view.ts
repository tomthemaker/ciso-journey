import { contentHash, contentKey } from './content.ts';
import type { ContentBundle } from './content.ts';
import { latestRecords } from './content-catalog.ts';
import { node } from './dom.ts';
import { phases } from './data.ts';
import { questionHash } from './question-attempts.ts';
import { caseHash } from './scenario-responses.ts';
import { personalizedPlan } from './study-plan.ts';
import type { StudyTask } from './study-plan.ts';
import type { StudyPreferences } from './study-preferences.ts';
import type { LearnerState } from './types.ts';

export function createStudyView(bundle: ContentBundle, tasks: StudyTask[], save: (preferences: StudyPreferences) => Promise<boolean>) {
  let draft: { minutes: string; goals: string[]; choice: string } | undefined;
  return (state: LearnerState, pending: boolean, now: string): HTMLElement => {
    const plan = personalizedPlan(bundle, state, now, tasks);
    const section = node('section', { id: 'todayPersonalized', class: 'today-section' });
    section.append(node('h2', {}, 'Your next study'), node('p', { id: 'todayBudget' }, `Daily session budget: ${plan.budget} minutes. Reserve roughly ${plan.queue.due.length} minutes for all due reviews; ${plan.remaining} minutes remain for an activity. Estimates are planning assumptions, not timers or completion evidence.`));
    const href = (record: { id: string; version: number; kind: string }) => record.kind === 'question' ? questionHash(record) : record.kind === 'scenario' ? caseHash(record) : contentHash(record);
    if (plan.selected) {
      const selected = plan.selected;
      section.append(node('a', { id: 'todaySuggested', href: href(selected.record), class: 'btn primary' }, `${selected.override ? 'Your choice' : 'Suggested'}: ${selected.record.title}`));
      section.append(node('p', {}, `About ${selected.minutes} minutes for this ${selected.record.kind}${selected.fits ? '' : '; exceeds the remaining budget'}. Exact revision: ${contentKey(selected.record)}.`));
      const why = node('ul', { id: 'todayReasons' });
      for (const text of [...selected.reasons, ...selected.warnings]) why.append(node('li', {}, text));
      section.append(why);
    } else section.append(node('p', { id: 'todayNoSuggestion' }, 'No full automatic activity fits now. Your reading and tasks remain available below; choose a shorter session or adjust your budget.'));
    for (const warning of plan.warnings) section.append(node('p', { class: 'side-note' }, warning));
    if (plan.taskGaps.length) {
      const list = node('ul');
      for (const id of plan.taskGaps) {
        const item = node('li'); item.append(node('a', { href: `#roadmap/${id}` }, `Open goal path task: ${id}`)); list.append(item);
      }
      section.append(node('p', { class: 'side-note' }, 'Task prerequisites use the draft C01 task graph and explicit task completion. Reading a lesson does not complete a task. Task work has no reliable time estimate and is outside this session estimate.'), list);
    }
    const alternatives = node('details', { id: 'todayAlternatives' });
    alternatives.append(node('summary', {}, `Why these alternatives (${plan.suggestions.length})`));
    const alternativesList = node('ul', { class: 'worklist' });
    for (const item of plan.suggestions) {
      const li = node('li'); li.append(node('a', { href: href(item.record) }, item.record.title), node('p', { class: 'side-note' }, `About ${item.minutes} minutes · ${item.fits ? 'fits remaining budget' : 'exceeds remaining budget'} · ${[...item.reasons, ...item.warnings].join(' ')}`)); alternativesList.append(li);
    }
    alternatives.append(alternativesList); section.append(alternatives);
    const details = node('details', { id: 'todayStudySettings', class: 'study-details' });
    details.append(node('summary', {}, 'Study goals, time budget and override'));
    const fieldset = node('fieldset', { class: 'today-controls' }); fieldset.disabled = pending; fieldset.dataset.pending = String(pending);
    fieldset.append(node('legend', {}, 'Private study preferences'));
    const form = node('form', { id: 'todayStudyForm', class: 'field' });
    const minutes = node('input', { id: 'todayMinutes', type: 'number', min: '1', max: '480', step: '1', required: '' });
    const goals = node('select', { id: 'todayGoals', multiple: '', size: '6' });
    const selectedGoals = draft?.goals ?? state.studyPreferences?.goalTaskIds ?? [];
    for (const phase of phases) for (const [id, title] of phase.tasks) {
      const option = node('option', { value: id }, `${id}: ${title}`); option.selected = selectedGoals.includes(id); goals.append(option);
    }
    const choice = node('select', { id: 'todayStudyChoice' }); choice.append(node('option', { value: '' }, 'Use automatic suggestions'));
    const currentChoices = [...latestRecords(bundle, 'lesson'), ...latestRecords(bundle, 'question'), ...latestRecords(bundle, 'scenario')];
    const override = state.studyPreferences?.overrideRef;
    // Preserve a deliberate historical choice even if no longer current or unavailable.
    if (override && !currentChoices.some(record => contentKey(record) === contentKey(override))) choice.append(node('option', { value: contentKey(override) }, `Saved exact choice: ${contentKey(override)}`));
    for (const record of currentChoices) choice.append(node('option', { value: contentKey(record) }, `${record.kind}: ${record.title} · v${record.version}`));
    minutes.value = draft?.minutes ?? String(plan.budget);
    choice.value = draft?.choice ?? (override ? contentKey(override) : '');
    function remember() { draft = { minutes: minutes.value, goals: Array.from(goals.selectedOptions).map(option => option.value), choice: choice.value }; }
    for (const control of [minutes, goals, choice]) control.addEventListener('input', remember);
    form.append(node('label', { for: 'todayMinutes' }, 'Daily study minutes (1–480)'), minutes,
      node('label', { for: 'todayGoals' }, 'Task goals (optional; select any that matter now)'), goals,
      node('p', { class: 'side-note' }, 'All selected goals have equal priority. Use your device’s multiple-selection controls; clear all for roadmap order.'),
      node('label', { for: 'todayStudyChoice' }, 'Choose an exact activity instead'), choice,
      node('p', { class: 'side-note' }, 'An override stays selected until you clear it, even after participation. It may exceed your budget or bypass reading prerequisites; warnings remain visible. Reviews remain due and cards are never enrolled automatically.'),
      node('button', { class: 'btn', type: 'submit', id: 'todaySaveStudy' }, 'Save study preferences'));
    form.addEventListener('submit', event => {
      event.preventDefault(); remember();
      const [id, version] = choice.value.split('@');
      const preferences: StudyPreferences = { schemaVersion: 1, dailyMinutes: Number(minutes.value), goalTaskIds: Array.from(goals.selectedOptions).map(option => option.value), updatedAt: new Date().toISOString(), ...(choice.value ? { overrideRef: { id, version: Number(version) } } : {}) };
      void save(preferences).then(saved => { if (saved) draft = undefined; });
    });
    fieldset.append(form); details.append(fieldset); section.append(details,
      node('p', { class: 'side-note' }, 'Suggestions use participation prerequisites, actual due reviews, latest incorrect keyed answers and explicit low rubric self-ratings. Legacy ratings, resource completion and flashcard success do not establish professional competency or readiness. Provisional content remains AI-authored draft.'));
    return section;
  };
}
