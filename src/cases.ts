import { byId, node } from './dom';
import { contentKey, findContent, safeHttps } from './content';
import type { ContentBundle, ContentRecord } from './content';
import { effectiveStatus } from './content-status';
import { resolveRubric } from './question-attempts';
import type { Rubric } from './question-attempts';
import { appendCaseSelfAssessment, appendScenarioResponse, caseHash, caseRoute, createScenarioResponse, resolveScenario, responseFields } from './scenario-responses';
import type { DecisionResponse, ScenarioResponse } from './scenario-responses';
import type { Change, LearnerState } from './types';

type Objectives = { id: string; statement: string }[];
const p = (parent: HTMLElement, text: string): void => { parent.append(node('p', {}, text)); };
function metadata(parent: HTMLElement, bundle: ContentBundle, record: ContentRecord): void {
  p(parent, `Status: ${effectiveStatus(bundle, record, new Date().toISOString().slice(0, 10))} · ${contentKey(record)} · Bundle ${bundle.contentVersion}.`);
  p(parent, `Authored ${record.authoredAt} by ${record.authorIds.map(id => { const actor = bundle.actors.find(a => a.id === id); return `${id} (${actor?.kind}; ${actor?.role})`; }).join(', ')}.`);
  p(parent, 'Provisional AI-authored teaching. No independent educator or legal approval is claimed. Agent implementation review does not approve the teaching.');
}
function showRubric(parent: HTMLElement, rubric: Rubric): void {
  parent.append(node('h3', {}, `Self-assessment rubric · ${contentKey(rubric)}`));
  p(parent, 'Read each descriptive anchor against the work you actually show. There is no total, pass threshold or automatic grade. These criterion anchors are separate from the six legacy 0–4 competency self-ratings.');
  for (const criterion of rubric.payload.criteria) {
    p(parent, criterion.description);
    const list = node('ul');
    for (const level of criterion.levels) list.append(node('li', {}, level.descriptor));
    parent.append(list);
  }
}
function showResponse(parent: HTMLElement, saved: ScenarioResponse): void {
  p(parent, `Submitted ${saved.submittedAt} · ${contentKey(saved.contentRef)} · ${saved.contentVersion} · ${saved.curriculumVersion}. Provenance: ${saved.provenance}.`);
  p(parent, `Objectives: ${saved.objectiveIds.join(', ')}. Sources: ${saved.sourceRefs.map(contentKey).join(', ')}. Rubric: ${contentKey(saved.rubricRef)}.`);
  for (const [key, label] of responseFields) { parent.append(node('h4', {}, label)); p(parent, saved.response[key]); }
  parent.append(node('h4', {}, 'Evidence metadata · self-reported, not independently reviewed'));
  p(parent, saved.response.evidence.title); p(parent, saved.response.evidence.notes);
  const href = safeHttps(saved.response.evidence.url);
  if (href) parent.append(node('a', { href, target: '_blank', rel: 'noopener noreferrer' }, 'Open private evidence reference'));
  p(parent, 'Independent review: none recorded in this workflow. A saved link or a learner-selected anchor does not prove an independent reviewer inspected the evidence.');
}
/** Local drafts survive failed transactions; every retry saves a new immutable response. */
export function bindCases(bundle: ContentBundle, objectives: Objectives, change: Change): (state: LearnerState | undefined) => void {
  const root = byId('caseBank', 'div');
  let state: LearnerState | undefined;
  let pending = false;
  const drafts = new Map<string, DecisionResponse>();
  const ratingDrafts = new Map<string, Map<string, string>>();
  function render(): void {
    const focused = root.contains(document.activeElement) ? document.activeElement?.id : undefined;
    root.replaceChildren();
    const catalog = node('div', { class: 'card' });
    catalog.append(node('h2', {}, 'Executive decision cases'));
    p(catalog, 'Practice business decisions with original provisional teaching. Applied responses and explicit rubric self-assessments stay separate from task completion, resource consumption, reading, questions, recall and legacy ratings. No mastery, professional readiness or certification is inferred.');
    const list = node('ul', { class: 'lesson-catalog' });
    for (const scenario of bundle.records.filter(r => r.kind === 'scenario' && !bundle.records.some(other => other.id === r.id && other.version > r.version))) {
      const li = node('li'); li.append(node('a', { href: caseHash(scenario) }, `${scenario.title} · v${scenario.version}`)); list.append(li);
    }
    catalog.append(list);
    const historyRefs = new Map(state?.scenarioResponses?.responses.map(r => [contentKey(r.contentRef), r.contentRef]));
    if (historyRefs.size) {
      const history = node('ul'); p(catalog, 'Saved case revisions (including unavailable history):');
      for (const [key, ref] of historyRefs) { const li = node('li'); li.append(node('a', { href: caseHash(ref) }, key)); history.append(li); }
      catalog.append(history);
    }
    root.append(catalog);
    const reference = caseRoute(location.hash); if (!reference) return;
    const scenario = resolveScenario(bundle, reference);
    const article = node('article', { class: 'card lesson-body case-body', 'aria-labelledby': 'caseHeading' });
    article.append(node('h2', { id: 'caseHeading', tabindex: '-1' }, scenario?.title ?? 'Case revision unavailable'));
    root.append(article);
    if (scenario) {
      metadata(article, bundle, scenario);
      const newer = bundle.records.filter(r => r.id === scenario.id && r.kind === 'scenario' && r.version > scenario.version).sort((a, b) => b.version - a.version)[0];
      if (newer) article.append(node('a', { href: caseHash(newer) }, `Optional newer case revision v${newer.version}; saved history keeps its original version`));
      p(article, `Tasks: ${scenario.taskIds.join(', ')}.`);
      for (const id of scenario.objectiveIds) p(article, `${id}: ${objectives.find(o => o.id === id)?.statement ?? id}`);
      article.append(node('h3', {}, 'Fictional brief')); p(article, scenario.payload.brief);
      article.append(node('h3', {}, 'Your executive deliverable')); p(article, scenario.payload.deliverable);
      const constraints = node('ul'); for (const constraint of scenario.payload.constraints) constraints.append(node('li', {}, constraint)); article.append(constraints);
      const rubric = resolveRubric(bundle, scenario.payload.rubricRef);
      if (rubric) { showRubric(article, rubric); metadata(article, bundle, rubric); }
      const worked = node('details', { class: 'case-example' });
      worked.append(node('summary', {}, `Complete worked response · ${contentKey(scenario)}`)); p(worked, scenario.payload.annotatedExample); article.append(worked);
      const retired = effectiveStatus(bundle, scenario, new Date().toISOString().slice(0, 10)) === 'retired';
      const key = contentKey(scenario);
      const draft = drafts.get(key) ?? { impact: '', options: '', accountableOwner: '', recommendation: '', residualRisk: '', evidence: { title: '', url: '', notes: '' } };
      drafts.set(key, draft);
      const form = node('form', { 'aria-label': 'Executive decision response' });
      const fields = node('fieldset', { class: 'question-answer' }); fields.append(node('legend', {}, 'Your decision response'));
      p(fields, 'Use fictional practice evidence. Notes and links are stored only in this browser and full backups. No binary upload or public evidence storage exists. Opening a reference visits its host; exports contain your private notes and links.');
      for (const [name, label] of responseFields) {
        const field = node('div', { class: 'field' });
        const input = node('textarea', { id: `case-${name}`, name, required: '', rows: '5' }); input.value = draft[name];
        input.addEventListener('input', () => { draft[name] = input.value; });
        field.append(node('label', { for: input.id }, label), input); fields.append(field);
      }
      for (const [name, label] of [['title', 'Evidence title'], ['url', 'Private evidence link (optional HTTPS)'], ['notes', 'Private evidence notes and limitations']] as const) {
        const field = node('div', { class: 'field' });
        const input = name === 'notes' ? node('textarea', { rows: '5' }) : node('input', { type: name === 'url' ? 'url' : 'text' });
        input.id = `case-evidence-${name}`; input.name = name; input.required = name === 'title'; input.value = draft.evidence[name];
        input.addEventListener('input', () => { draft.evidence[name] = input.value; });
        field.append(node('label', { for: input.id }, label), input); fields.append(field);
      }
      fields.disabled = pending || !state || retired; fields.dataset.retired = String(retired);
      const submit = node('button', { class: 'btn primary', type: 'submit', id: 'saveCaseResponse' }, 'Save new case response');
      submit.disabled = fields.disabled; submit.dataset.retired = String(retired);
      const message = node('p', { role: 'status' }); form.append(fields, submit, message); article.append(form);
      form.addEventListener('submit', event => {
        event.preventDefault(); if (pending || !state || retired) return;
        try {
          const response = createScenarioResponse(bundle, scenario, draft, crypto.randomUUID(), new Date().toISOString());
          pending = true;
          void change(candidate => appendScenarioResponse(candidate, response)).then(saved => {
            pending = false; if (saved) drafts.delete(key); render();
            root.querySelector<HTMLElement>(saved ? '#caseHistoryHeading' : '#saveCaseResponse')?.focus();
          });
        } catch (error) { message.textContent = error instanceof Error ? error.message : 'Check all response fields and the HTTPS evidence link.'; }
      });
      article.append(node('h3', {}, 'Sources and currentness'));
      for (const ref of scenario.sourceRefs) {
        const source = findContent(bundle, ref); if (!source) continue;
        const href = safeHttps(source.payload.url);
        article.append(href ? node('a', { href, target: '_blank', rel: 'noopener noreferrer' }, source.title) : node('span', {}, source.title));
        p(article, `${contentKey(source)} · ${effectiveStatus(bundle, source, new Date().toISOString().slice(0, 10))} · Verification: ${String(source.payload.verification)} · Check recorded: ${String(source.payload.checkedAt)} · Review due: ${String(source.payload.reviewDueAt)}.`);
      }
    } else p(article, 'The exact scenario revision is unavailable or incompatible. Its saved response and provenance remain below; a newer revision cannot supply its feedback.');
    article.append(node('h3', { id: 'caseHistoryHeading', tabindex: '-1' }, 'Case response and assessment history'));
    const responses = state?.scenarioResponses?.responses.filter(r => r.contentRef.id === reference.id) ?? [];
    if (!responses.length) p(article, 'No saved responses for this case. Saving a response does not assess it.');
    for (const [index, response] of [...responses].reverse().entries()) {
      const details = node('details', { class: 'case-result' }); details.open = index === 0;
      details.append(node('summary', {}, `Response ${responses.length - index} · ${contentKey(response.contentRef)} · ${response.submittedAt}`));
      showResponse(details, response);
      const exactScenario = resolveScenario(bundle, response.contentRef);
      if (exactScenario) { const example = node('details'); example.append(node('summary', {}, 'Worked response for this exact saved revision')); p(example, exactScenario.payload.annotatedExample); details.append(example); }
      else p(details, 'The exact scenario revision is unavailable or incompatible; worked feedback is unavailable.');
      const pinned = resolveRubric(bundle, response.rubricRef);
      const assessment = state?.scenarioResponses?.selfAssessments.find(a => a.responseId === response.id);
      if (!pinned) p(details, `Exact rubric ${contentKey(response.rubricRef)} is unavailable or incompatible. Saved anchors are retained; new self-assessment requires the exact rubric.`);
      if (assessment) {
        p(details, `Self-assessment · ${assessment.assessedAt} · ${contentKey(assessment.rubricRef)}. Learner-selected anchors; no independent review or automatic mastery.`);
        for (const rating of assessment.ratings) {
          const criterion = pinned?.payload.criteria.find(c => c.id === rating.criterionId);
          p(details, `${criterion?.description ?? rating.criterionId}: ${rating.score} — ${criterion?.levels.find(l => l.score === rating.score)?.descriptor ?? 'Exact anchor unavailable'}`);
        }
      } else if (pinned) {
        const ratings = ratingDrafts.get(response.id) ?? new Map<string, string>(); ratingDrafts.set(response.id, ratings);
        const form = node('form', { 'aria-label': `Self-assess case response ${responses.length - index}` });
        p(form, 'Explicit self-assessment: select only anchors supported by your response. If a criterion is not evidenced, leave this response unassessed and save a revised response. An independent review requires an actual separate reviewer and evidence; this form cannot record one.');
        for (const criterion of pinned.payload.criteria) {
          const id = `case-rating-${response.id}-${criterion.id}`;
          const field = node('div', { class: 'field' }); const select = node('select', { id, required: '' });
          select.append(node('option', { value: '' }, 'Choose an anchor'));
          for (const level of criterion.levels) select.append(node('option', { value: String(level.score) }, level.descriptor));
          select.value = ratings.get(criterion.id) ?? ''; select.addEventListener('change', () => ratings.set(criterion.id, select.value));
          field.append(node('label', { for: id }, criterion.description), select); form.append(field);
        }
        form.append(node('button', { class: 'btn', type: 'submit' }, 'Save case self-assessment'));
        for (const control of form.querySelectorAll<HTMLSelectElement | HTMLButtonElement>('select, button')) control.disabled = pending || !state;
        form.addEventListener('submit', event => {
          event.preventDefault(); if (pending || !state || pinned.payload.criteria.some(c => !ratings.get(c.id))) return;
          const chosen = pinned.payload.criteria.map(c => ({ criterionId: c.id, score: Number(ratings.get(c.id)) }));
          pending = true;
          void change(candidate => appendCaseSelfAssessment(candidate, bundle, response.id, chosen, crypto.randomUUID(), new Date().toISOString())).then(saved => {
            pending = false; if (saved) ratingDrafts.delete(response.id); render(); root.querySelector<HTMLElement>('#caseHistoryHeading')?.focus();
          });
        });
        details.append(form);
      }
      article.append(details);
    }
    if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', () => { render(); if (location.hash.startsWith('#cases/')) root.querySelector<HTMLElement>('#caseHeading')?.focus(); });
  return next => { state = next; render(); };
}
