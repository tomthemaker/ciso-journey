import { node, byId } from './dom';
import { contentKey, findContent, safeHttps } from './content';
import type { ContentBundle, ContentRecord } from './content';
import { effectiveStatus } from './content-status';
import { appendAttempt, appendSelfAssessment, createAttempt, questionHash, questionRoute } from './question-attempts';
import type { Question, QuestionAttempt, Rubric } from './question-attempts';
import type { Change, LearnerState } from './types';

type Objectives = { id: string; statement: string }[];
const paragraph = (parent: HTMLElement, text: string): void => { parent.append(node('p', {}, text)); };
function status(parent: HTMLElement, bundle: ContentBundle, record: ContentRecord): void {
  paragraph(parent, `Status: ${effectiveStatus(bundle, record, new Date().toISOString().slice(0, 10))} · ${contentKey(record)} · Bundle ${bundle.contentVersion}.`);
  paragraph(parent, `Authored ${record.authoredAt} by ${record.authorIds.map(id => { const actor = bundle.actors.find(item => item.id === id); return `${id} (${actor?.kind}; ${actor?.role})`; }).join(', ')}.`);
  paragraph(parent, 'Provisional teaching retains its declared review status. No independent educator or legal approval is claimed for AI-authored drafts.');
}
function rubricView(parent: HTMLElement, rubric: Rubric): void {
  parent.append(node('h3', {}, `Response rubric · ${contentKey(rubric)}`));
  for (const criterion of rubric.payload.criteria) {
    paragraph(parent, criterion.description);
    const list = node('ul');
    for (const level of criterion.levels) list.append(node('li', {}, `${level.score}: ${level.descriptor}`));
    parent.append(list);
  }
}
function feedback(parent: HTMLElement, bundle: ContentBundle, attempt: QuestionAttempt): void {
  const question = findContent(bundle, attempt.contentRef) as Question | undefined;
  paragraph(parent, `Submitted ${attempt.submittedAt} · ${contentKey(attempt.contentRef)} · ${attempt.contentVersion} · ${attempt.curriculumVersion}`);
  paragraph(parent, `Objectives: ${attempt.objectiveIds.join(', ')}. Provenance: ${attempt.provenance}.`);
  paragraph(parent, `Your answer: ${attempt.response}`);
  if (!question || question.kind !== 'question') {
    paragraph(parent, 'The exact question revision is unavailable in this bundle. Its answer and provenance are retained; feedback cannot use a newer revision.');
    return;
  }
  if (attempt.format === 'mcq') {
    paragraph(parent, attempt.correct ? 'Correct keyed answer. This question result does not confer applied mastery.' : 'Different from the keyed answer. Read each explanation before retrying.');
    const list = node('ul', { class: 'option-feedback' });
    for (const option of question.payload.options) list.append(node('li', {}, `${option.id}: ${option.text}${option.id === question.payload.correctOptionId ? ' (keyed answer)' : ''} — ${option.explanation}`));
    parent.append(list);
  } else {
    parent.append(node('h3', {}, 'Annotated example'));
    paragraph(parent, question.payload.annotatedExample ?? 'Example unavailable for this exact revision.');
    paragraph(parent, 'Compare the reasoning with your response. No text matching or AI grading is used; this response has no automatic score.');
  }
}
/** Forms retain unsaved drafts across failed F03 transactions and unrelated rerenders. */
export function bindQuestions(bundle: ContentBundle, objectives: Objectives, change: Change): (state: LearnerState | undefined) => void {
  const root = byId('questionBank', 'div');
  let state: LearnerState | undefined;
  const drafts = new Map<string, string>();
  const ratingDrafts = new Map<string, Map<string, string>>();
  let pending = false;
  function render(): void {
    const focused = root.contains(document.activeElement) ? document.activeElement?.id : undefined;
    root.replaceChildren();
    const catalog = node('div', { class: 'card' });
    catalog.append(node('h2', {}, 'Foundation questions'));
    paragraph(catalog, 'Practice against original learning objectives. Attempts and explicit rubric self-assessments are separate from reading, resources, task completion, recall, applied assessment and legacy ratings. Use fictional responses; keep employer information out of practice.');
    const list = node('ol', { class: 'lesson-catalog' });
    for (const question of bundle.records.filter(record => record.kind === 'question' && !bundle.records.some(other => other.id === record.id && other.version > record.version))) {
      const item = node('li');
      item.append(node('a', { href: questionHash(question) }, `${question.title} · v${question.version} · ${String(question.payload.format)}`));
      list.append(item);
    }
    catalog.append(list); root.append(catalog);
    const ref = questionRoute(location.hash);
    if (!ref) return;
    const question = findContent(bundle, ref) as Question | undefined;
    const article = node('article', { class: 'card lesson-body question-body', 'aria-labelledby': 'questionHeading' });
    article.append(node('h2', { id: 'questionHeading', tabindex: '-1' }, question?.kind === 'question' ? question.title : 'Revision unavailable'));
    root.append(article);
    if (!question || question.kind !== 'question') { paragraph(article, 'This exact question revision is unavailable. Historical attempts remain retained in your backup.'); return; }
    status(article, bundle, question);
    paragraph(article, `Tasks: ${question.taskIds.join(', ')} · ${question.payload.format} · ${question.payload.difficulty}`);
    article.append(node('h3', {}, 'Learning objectives'));
    for (const id of question.objectiveIds) paragraph(article, `${id}: ${objectives.find(item => item.id === id)?.statement ?? id}`);
    paragraph(article, question.payload.prompt);
    const rubric = question.payload.rubricRef ? findContent(bundle, question.payload.rubricRef) as Rubric | undefined : undefined;
    if (rubric?.kind === 'rubric') { rubricView(article, rubric); status(article, bundle, rubric); }
    const retired = effectiveStatus(bundle, question, new Date().toISOString().slice(0, 10)) === 'retired';
    const key = contentKey(question);
    const form = node('form', { 'aria-label': 'Attempt question' });
    const fieldset = node('fieldset', { class: 'question-answer' });
    fieldset.append(node('legend', {}, 'Your attempted answer'));
    if (question.payload.format === 'mcq') {
      for (const option of question.payload.options) {
        const label = node('label', { class: 'question-option' });
        const input = node('input', { type: 'radio', name: 'answer', id: `answer-${option.id}`, value: option.id, required: '' });
        input.checked = drafts.get(key) === option.id;
        input.addEventListener('change', () => drafts.set(key, input.value));
        label.append(input, node('span', {}, option.text)); fieldset.append(label);
      }
    } else {
      const input = node('textarea', { id: 'questionResponse', name: 'answer', required: '', rows: '7' });
      input.value = drafts.get(key) ?? '';
      input.addEventListener('input', () => drafts.set(key, input.value));
      fieldset.append(node('label', { for: 'questionResponse' }, 'Write your response'), input);
    }
    fieldset.disabled = pending || !state || retired;
    fieldset.dataset.retired = String(retired);
    form.append(fieldset, node('button', { class: 'btn primary', id: 'submitAttempt', type: 'submit' }, 'Submit new attempt'));
    const submit = form.querySelector('button')!;
    submit.disabled = fieldset.disabled;
    submit.dataset.retired = String(retired);
    const message = node('p', { role: 'status', id: 'attemptMessage' });
    form.append(message); article.append(form);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (pending || !state || retired) return;
      const response = drafts.get(key) ?? '';
      if (!response.trim()) { message.textContent = 'Attempt an answer first.'; return; }
      const attempt = createAttempt(bundle, question, response, crypto.randomUUID(), new Date().toISOString());
      pending = true;
      void change(candidate => appendAttempt(candidate, attempt)).then(saved => {
        pending = false;
        if (saved) drafts.delete(key);
        render();
        if (saved) root.querySelector<HTMLElement>('#attemptHistoryHeading')?.focus();
        else root.querySelector<HTMLElement>('#submitAttempt')?.focus();
      });
    });
    article.append(node('h3', { id: 'attemptHistoryHeading', tabindex: '-1' }, 'Attempt history and feedback'));
    const attempts = state?.questionAttempts?.attempts.filter(attempt => attempt.contentRef.id === question.id) ?? [];
    if (!attempts.length) paragraph(article, 'Submit an attempted answer to reveal feedback and an annotated example where applicable.');
    else paragraph(article, 'Retry by submitting a new answer above. Every saved attempt and self-assessment is retained.');
    for (const [index, attempt] of [...attempts].reverse().entries()) {
      const details = node('details', { class: 'attempt-result' });
      details.open = index === 0;
      details.append(node('summary', {}, `Attempt ${attempts.length - index} · ${contentKey(attempt.contentRef)} · ${attempt.submittedAt}`));
      feedback(details, bundle, attempt);
      const assessment = state?.questionAttempts?.selfAssessments.find(item => item.attemptId === attempt.id);
      const pinnedRubric = attempt.rubricRef ? findContent(bundle, attempt.rubricRef) as Rubric | undefined : undefined;
      if (assessment) {
        paragraph(details, `Self-assessment · ${assessment.assessedAt} · ${contentKey(assessment.rubricRef)}. Learner-selected rubric anchors; no independent review or applied mastery.`);
        for (const rating of assessment.ratings) {
          const criterion = pinnedRubric?.payload.criteria.find(item => item.id === rating.criterionId);
          paragraph(details, `${criterion?.description ?? rating.criterionId}: ${rating.score} — ${criterion?.levels.find(level => level.score === rating.score)?.descriptor ?? 'Exact anchor unavailable'}`);
        }
      } else if (pinnedRubric?.kind === 'rubric' && attempt.format !== 'mcq') {
        const ratings = ratingDrafts.get(attempt.id) ?? new Map<string, string>();
        ratingDrafts.set(attempt.id, ratings);
        const assessmentForm = node('form', { 'aria-label': `Self-assess attempt ${attempts.length - index}` });
        paragraph(assessmentForm, 'Explicit self-assessment: choose the rubric anchor that describes your response. These selections are personal judgments, not an independently graded result.');
        for (const criterion of pinnedRubric.payload.criteria) {
          const id = `rating-${attempt.id}-${criterion.id}`;
          const field = node('div', { class: 'field' });
          const select = node('select', { id, required: '', name: criterion.id });
          select.append(node('option', { value: '' }, 'Choose an anchor'));
          for (const level of criterion.levels) select.append(node('option', { value: String(level.score) }, `${level.score}: ${level.descriptor}`));
          select.value = ratings.get(criterion.id) ?? '';
          select.addEventListener('change', () => ratings.set(criterion.id, select.value));
          field.append(node('label', { for: id }, criterion.description), select); assessmentForm.append(field);
        }
        assessmentForm.append(node('button', { class: 'btn', type: 'submit' }, 'Save rubric self-assessment'));
        for (const control of assessmentForm.querySelectorAll<HTMLSelectElement | HTMLButtonElement>('select, button')) control.disabled = pending || !state;
        assessmentForm.addEventListener('submit', event => {
          event.preventDefault(); if (pending || !state) return;
          const chosen = pinnedRubric.payload.criteria.map(criterion => ({ criterionId: criterion.id, score: Number(ratings.get(criterion.id)) }));
          if (pinnedRubric.payload.criteria.some(criterion => !ratings.get(criterion.id))) return;
          pending = true;
          void change(candidate => appendSelfAssessment(candidate, bundle, attempt.id, chosen, crypto.randomUUID(), new Date().toISOString())).then(saved => {
            pending = false; if (saved) ratingDrafts.delete(attempt.id); render();
            root.querySelector<HTMLElement>('#attemptHistoryHeading')?.focus();
          });
        });
        details.append(assessmentForm);
      }
      article.append(details);
    }
    article.append(node('h3', {}, 'Sources and currentness'));
    for (const sourceRef of question.sourceRefs) {
      const source = findContent(bundle, sourceRef); if (!source) continue;
      const href = safeHttps(source.payload.url);
      article.append(href ? node('a', { href, target: '_blank', rel: 'noopener noreferrer' }, source.title) : node('span', {}, source.title));
      paragraph(article, `${contentKey(source)} · ${effectiveStatus(bundle, source, new Date().toISOString().slice(0, 10))} · Verification: ${String(source.payload.verification)} · Check recorded: ${String(source.payload.checkedAt)} · Review due: ${String(source.payload.reviewDueAt)}.`);
    }
    if (focused) document.getElementById(focused)?.focus({ preventScroll: true });
  }
  window.addEventListener('hashchange', () => { render(); if (location.hash.startsWith('#questions/')) root.querySelector<HTMLElement>('#questionHeading')?.focus(); });
  return next => { state = next; render(); };
}
