import { byId, node } from './dom';
import { competencies } from './data';
import { safeHttps, contentKey } from './content';
import { appendAppraisal, appendEvidence, quarter } from './portfolio';
import type { Appraisal, Evidence } from './portfolio';
import type { Change, LearnerState } from './types';

export function bindPortfolio(change: Change): (state: LearnerState | undefined) => void {
  const root = byId('portfolio', 'div'); let state: LearnerState | undefined; let pending = false;
  const evidenceDraft = { title: '', url: '', notes: '' };
  const draft = { date: new Date().toISOString().slice(0, 10), competency: '', level: '', scope: '', rationale: '', evidenceId: '', responseId: '' };
  function render(): void {
    root.replaceChildren();
    const intro = node('div', { class: 'card' }); intro.append(node('h2', {}, 'Quarterly self-assessments and portfolio'), node('p', {}, 'Record a judgment for a specific scope and evidence. Recognize, Explain, Apply and Lead are self-assessed descriptions, not proof of overall mastery or readiness. Case rubric anchors are not averaged. Append a new entry to correct an earlier one.'), node('p', {}, 'Portfolio titles, links and notes stay in this browser and full backups. Use HTTPS references; opening one visits its host. No files are uploaded.')); root.append(intro);
    const evidenceForm = node('form', { class: 'card', 'aria-label': 'Add portfolio evidence' }); evidenceForm.append(node('h3', {}, 'Add evidence metadata'));
    for (const [key, label] of [['title', 'Portfolio evidence title'], ['url', 'Evidence HTTPS link (optional)'], ['notes', 'Private notes and limitations']] as const) {
      const field = node('div', { class: 'field' }); const input = key === 'notes' ? node('textarea', { rows: '3' }) : node('input', { type: key === 'url' ? 'url' : 'text' }); input.id = `portfolio-${key}`; input.value = evidenceDraft[key]; input.required = key === 'title'; input.addEventListener('input', () => { evidenceDraft[key] = input.value; }); field.append(node('label', { for: input.id }, label), input); evidenceForm.append(field);
    }
    const evidenceStatus = node('p', { role: 'status' }); const evidenceButton = node('button', { class: 'btn', type: 'submit' }, 'Save evidence'); evidenceButton.disabled = pending || !state; evidenceForm.append(evidenceButton, evidenceStatus); root.append(evidenceForm);
    evidenceForm.addEventListener('submit', event => {
      event.preventDefault(); if (!state || pending) return;
      const item: Evidence = { id: crypto.randomUUID(), ...evidenceDraft };
      try { appendEvidence(structuredClone(state), item); } catch (error) { evidenceStatus.textContent = (error as Error).message; return; }
      pending = true; void change(candidate => appendEvidence(candidate, item)).then(saved => { pending = false; if (saved) Object.assign(evidenceDraft, { title: '', url: '', notes: '' }); render(); root.querySelector<HTMLElement>(saved ? '#evidenceHistory' : '#portfolio-title')?.focus(); });
    });
    const evidenceHistory = node('div', { class: 'card' }); evidenceHistory.append(node('h3', { id: 'evidenceHistory', tabindex: '-1' }, 'Portfolio evidence'));
    for (const e of state?.portfolio?.evidence ?? []) { const item = node('div', { class: 'log' }); item.append(node('strong', {}, e.title), node('p', {}, e.notes)); const href = safeHttps(e.url); if (href) item.append(node('a', { href, target: '_blank', rel: 'noopener noreferrer' }, 'Open evidence reference')); evidenceHistory.append(item); }
    if (!state?.portfolio?.evidence.length) evidenceHistory.append(node('p', {}, 'No evidence metadata saved yet.')); root.append(evidenceHistory);
    const form = node('form', { class: 'card', 'aria-label': 'Add quarterly self-assessment' }); form.append(node('h3', {}, 'Add quarterly self-assessment'), node('p', {}, 'Choose the level supported within the stated scope: Recognize identifies a concept; Explain describes it; Apply uses it in context; Lead directs decisions and accountability in context. Evidence references are optional; explain limitations in the rationale.'));
    function field(key: keyof typeof draft, label: string, kind: 'input' | 'textarea' | 'select', options: [string, string][] = [], required = true): void {
      const wrapper = node('div', { class: 'field' }); const input = kind === 'select' ? node('select') : kind === 'textarea' ? node('textarea', { rows: '3' }) : node('input', { type: 'date' }); input.id = `appraisal-${key}`; input.required = required;
      if (input instanceof HTMLSelectElement) for (const [value, name] of options) input.append(node('option', { value }, name));
      input.value = draft[key]; input.addEventListener('input', () => { draft[key] = input.value; }); wrapper.append(node('label', { for: input.id }, label), input); form.append(wrapper);
    }
    field('date', 'Assessment date', 'input'); field('competency', 'Competency', 'select', [['', 'Choose a competency'], ...competencies.map(([name]): [string, string] => [name, name])]);
    field('level', 'Evidence-scoped level', 'select', [['', 'Choose a level'], ...['Recognize', 'Explain', 'Apply', 'Lead'].map((name): [string, string] => [name, name])]);
    field('scope', 'Scope of this judgment', 'textarea'); field('rationale', 'Rationale and evidence limitations', 'textarea');
    field('evidenceId', 'Portfolio evidence (optional)', 'select', [['', 'None'], ...(state?.portfolio?.evidence ?? []).map((e): [string, string] => [e.id, e.title])], false);
    field('responseId', 'Saved case response (optional)', 'select', [['', 'None'], ...(state?.scenarioResponses?.responses ?? []).map((r): [string, string] => [r.id, `${contentKey(r.contentRef)} · ${r.submittedAt}`])], false);
    const status = node('p', { role: 'status' }); const button = node('button', { class: 'btn primary', type: 'submit' }, 'Save self-assessment'); button.disabled = pending || !state; form.append(button, status); root.append(form);
    form.addEventListener('submit', event => {
      event.preventDefault(); if (!state || pending) return;
      const item: Appraisal = { id: crypto.randomUUID(), date: draft.date, competency: draft.competency, level: draft.level as Appraisal['level'], provenance: 'self-assessment', scope: draft.scope, rationale: draft.rationale, evidenceIds: draft.evidenceId ? [draft.evidenceId] : [], responseIds: draft.responseId ? [draft.responseId] : [] };
      try { appendAppraisal(structuredClone(state), item); } catch (error) { status.textContent = (error as Error).message; return; }
      pending = true; void change(candidate => appendAppraisal(candidate, item)).then(saved => { pending = false; if (saved) Object.assign(draft, { competency: '', level: '', scope: '', rationale: '', evidenceId: '', responseId: '' }); render(); root.querySelector<HTMLElement>(saved ? '#appraisalHistory' : '#appraisal-date')?.focus(); });
    });
    const history = node('div', { class: 'card' }); history.append(node('h3', { id: 'appraisalHistory', tabindex: '-1' }, 'Assessment history'));
    const records = state?.portfolio?.appraisals ?? []; if (!records.length) history.append(node('p', {}, 'No quarterly self-assessments saved yet.'));
    for (const a of [...records].reverse()) {
      const details = node('details', { class: 'portfolio-result' }); details.append(node('summary', {}, `${quarter(a.date)} · ${a.date} · ${a.competency} · ${a.level}`), node('p', {}, 'Provenance: self-assessment; no independent review recorded.'), node('p', {}, `Scope: ${a.scope}`), node('p', {}, `Rationale: ${a.rationale}`));
      for (const id of a.evidenceIds) { const e = state?.portfolio?.evidence.find(e => e.id === id); details.append(node('p', {}, `Evidence: ${e?.title ?? id}`)); }
      for (const id of a.responseIds) { const response = state?.scenarioResponses?.responses.find(r => r.id === id); if (response) { details.append(node('p', {}, `Case response ${id} · ${contentKey(response.contentRef)} · pinned rubric ${contentKey(response.rubricRef)} · ${response.submittedAt}`)); details.append(node('a', { href: `#cases/${response.contentRef.id}/${response.contentRef.version}` }, 'View case response')); } }
      history.append(details);
    } root.append(history);
  }
  return next => { state = next; render(); };
}
