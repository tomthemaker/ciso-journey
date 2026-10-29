import { byId, node } from './dom.ts';
import { projectProgress } from './progress.ts';
import { competencies } from './data.ts';
import type { ContentBundle } from './content.ts';
import type { LearnerState } from './types.ts';

let selectedDays = 30;
export function renderProgress(state: LearnerState | undefined, bundle: ContentBundle): void {
  const root = byId('progressReport', 'div'); root.replaceChildren();
  root.append(node('h1', {}, 'Progress'), node('p', {}, 'Your study signals are separate. None is a measure of readiness or competency.'));
  if (!state) { root.append(node('p', {}, 'Progress is unavailable until local storage can be loaded.')); return; }
  const controls = node('div', { class: 'field progress-controls' });
  const label = node('label', { for: 'progressDays' }, 'Event window');
  const select = node('select', { id: 'progressDays', 'aria-label': 'Event window' });
  for (const days of [30, 90, 365]) select.append(node('option', { value: String(days) }, `Last ${days} local days`));
  select.value = String(selectedDays);
  select.addEventListener('change', () => { selectedDays = Number(select.value); renderProgress(state, bundle); byId('progressDays', 'select').focus(); });
  controls.append(label, select); root.append(controls);
  const p = projectProgress(state, bundle, new Date().toISOString(), Intl.DateTimeFormat().resolvedOptions().timeZone, selectedDays);
  root.append(node('p', { class: 'progress-window' }, `Events: ${p.start} through ${p.end} inclusive, local dates (${p.timeZone}); as of ${p.now}. Future-dated events excluded: ${p.future}.`));
  const section = (title: string, text: string) => { const el = node('section', { class: 'progress-section' }); el.append(node('h2', {}, title), node('p', {}, text)); root.append(el); return el; };
  section('Observed recall', p.reviews.total ? `${p.reviews.successful} successful (Hard, Good or Easy) and ${p.reviews.failed} failed (Again) self-ratings across ${p.reviews.total} reviews of ${p.reviews.unique} exact card revisions in this window.` : 'No review self-ratings in this window.');
  section('Estimated recall', p.estimates.length ? `FSRS-6.0, ts-fsrs 5.4.2, adapter 1: mean estimated recall ${(100 * p.estimates.reduce((a, b) => a + b, 0) / p.estimates.length).toFixed(1)}% across ${p.estimates.length} active reviewed card revisions as of the instant above. This model estimate is not observed performance.` : 'No active reviewed card revisions available for an FSRS-6.0 estimate (ts-fsrs 5.4.2, adapter 1).');
  section('Question practice', p.mcq.total ? `${p.mcq.correct} correct of ${p.mcq.total} keyed MCQ attempts, including ${p.mcq.retries} retries, across ${p.mcq.unique} exact question revisions in this window.` : 'No keyed MCQ attempts in this window.');
  const timeline = section('Activity by day', `Local dates with review or MCQ activity. ${p.missingReviews} reviews and ${p.missingQuestions} MCQ attempts reference unavailable historical content; their recorded outcomes remain included.`);
  if (!p.days.length) timeline.append(node('p', {}, 'No dated review or MCQ activity in this window.'));
  const days = node('ul'); for (const [date, value] of p.days) days.append(node('li', {}, `${date}: ${value.successful}/${value.reviews} successful reviews; ${value.correct}/${value.mcq} correct MCQ attempts`)); timeline.append(days);
  section('Ungraded responses', `${p.responses.questions} scenario or open question responses and ${p.responses.cases} case responses in this window. Responses are not automatically graded.`);
  const rubric = section('Rubric self-assessment', `${p.assessments.count} self-assessments in this window. Ratings are learner judgments, grouped by exact rubric revision and criterion. ${p.assessments.unavailable} rating entries have unavailable historical anchors.`);
  if (!p.assessments.groups.length) rubric.append(node('p', {}, 'No resolvable rubric ratings in this window.'));
  for (const group of p.assessments.groups) {
    const block = node('div', { class: 'progress-rubric' });
    block.append(node('h3', {}, `${group.rubric} / ${group.criterion}`), node('p', {}, group.description));
    const list = node('ul'); for (const [label, count] of [...group.anchors].sort(([a], [b]) => a.localeCompare(b))) list.append(node('li', {}, `${label} — ${count}`));
    block.append(list); rubric.append(block);
  }
  const portfolio = section('Quarterly competency self-reports', `${p.portfolio.inWindow} dated appraisals in the ${p.start}–${p.end} local-date window; ${p.portfolio.total} dated appraisals through ${p.end} across all quarters. ${p.portfolio.evidence} portfolio evidence metadata records in the current snapshot have no creation dates and cannot form a trend. Levels are scoped learner judgments, not independent assessments; linked case rubric ratings remain separate.`);
  for (const [competency] of competencies) {
    const history = p.portfolio.history.filter(a => a.competency === competency);
    const block = node('div', { class: 'progress-competency' });
    block.append(node('h3', {}, `${competency} · ${history.length} self-report${history.length === 1 ? '' : 's'} across ${new Set(history.map(a => a.quarter)).size} quarter${new Set(history.map(a => a.quarter)).size === 1 ? '' : 's'}`));
    if (!history.length) { block.append(node('p', {}, 'No dated self-report through the as-of local day.')); portfolio.append(block); continue; }
    const list = node('ol', { class: 'progress-history' });
    for (const a of [...history].reverse()) {
      const item = node('li');
      item.append(node('strong', {}, `${a.quarter} · ${a.date} · ${a.level} · ${a.provenance}${a.inWindow ? ' · in current window' : ''}`),
        node('p', {}, `Scope: ${a.scope}`), node('p', {}, `Rationale: ${a.rationale}`));
      if (a.priorSameScope) item.append(node('p', {}, `Prior self-report for this exact scope and provenance: ${a.priorSameScope.date} · ${a.priorSameScope.level}. Compare these reported levels only within the stated scope.`));
      else item.append(node('p', {}, 'No earlier self-report with this exact scope and provenance.'));
      item.append(node('p', {}, `References: ${a.evidence.length} portfolio evidence record${a.evidence.length === 1 ? '' : 's'}; ${a.responses.length} saved case response${a.responses.length === 1 ? '' : 's'}. References support context, not the reported level automatically.`));
      const refs = node('ul');
      for (const e of a.evidence) refs.append(node('li', {}, `Portfolio evidence ${e.id}: ${e.available ? e.title : 'unavailable historical reference'}`));
      for (const r of a.responses) refs.append(node('li', {}, r.scenario
        ? `Case response ${r.id} (${r.submittedAt}): scenario ${r.scenario}${r.scenarioAvailable ? '' : ' [content unavailable]'}; rubric ${r.rubric}${r.rubricAvailable ? '' : ' [anchors unavailable]'}`
        : `Case response ${r.id}: unavailable historical reference`));
      if (refs.childElementCount) item.append(refs);
      list.append(item);
    }
    block.append(list); portfolio.append(block);
  }
  portfolio.append(node('p', {}, 'Date-only appraisals are grouped by calendar quarter, not by a precise submission instant. Different scopes, rubric criteria and provenance have no shared scale; future-dated appraisals are excluded above.'));
  section('Participation and evidence', `${p.tasks.done} of ${p.tasks.total} roadmap tasks marked complete; ${p.reading} exact reading revisions marked read. These are current snapshots without historical timestamps. ${p.resources.tracked} resources tracked; ${p.resources.completed} marked completed and ${p.resources.inProgress} in progress as of the instant above. ${p.resources.evidence} latest resource records contain notes or an evidence link; ${p.caseEvidence} case responses contain evidence metadata. Counts do not assess evidence quality.`);
  const legacy = section('Legacy self-ratings', 'Current 0–4 scores may include app defaults and are independent of rubric assessments. Historical trends are unavailable because these scores have no timestamps.');
  const list = node('ul'); for (const [label, value] of p.scores) list.append(node('li', {}, `${label}: ${value}`)); legacy.append(list);
}
