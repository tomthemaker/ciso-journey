import { caseHash } from './scenario-responses';
import { byId, node } from './dom';
import { contentHash, contentKey, contentRoute, findContent, safeHttps } from './content';
import type { ContentBundle, ContentRecord, ContentRef, Lesson } from './content';
import { effectiveStatus } from './content-status';
import { questionHash } from './question-attempts';
import { isRead, setRead } from './reading-progress';
import type { Change, LearnerState } from './types';

interface Objective { id: string; statement: string; entryRequirement: string | null }
const text = (value: unknown): string => typeof value === 'string' ? value : '';
const list = (values: string[]): HTMLUListElement => {
  const ul = node('ul');
  ul.append(...values.map(value => node('li', {}, value)));
  return ul;
};
const heading = (parent: HTMLElement, title: string): void => { parent.append(node('h3', {}, title)); };
function referenceLink(bundle: ContentBundle, ref: ContentRef): HTMLAnchorElement {
  const record = findContent(bundle, ref);
  return node('a', { href: contentHash(ref) }, `${record?.title ?? ref.id} · v${ref.version}`);
}
function references(parent: HTMLElement, bundle: ContentBundle, record: ContentRecord, asOf: string): void {
  heading(parent, 'References and source currentness');
  const sources = node('ul');
  for (const ref of record.sourceRefs) {
    const source = findContent(bundle, ref);
    if (!source) continue;
    const p = source.payload, item = node('li');
    const href = safeHttps(p.url);
    item.append(href ? node('a', { href, target: '_blank', rel: 'noopener noreferrer' }, source.title) : node('span', {}, source.title));
    item.append(node('p', {}, `${text(p.publisher)} · ${text(p.edition)} · ${text(p.jurisdiction)} · v${source.version}`));
    item.append(node('p', {}, `Source status: ${effectiveStatus(bundle, source, asOf)}. Check recorded: ${text(p.checkedAt)}. Review due: ${text(p.reviewDueAt)}${text(p.reviewDueAt) <= asOf ? ' (overdue)' : ''}. Verification: ${text(p.verification)}.`));
    item.append(node('p', {}, text(p.verificationEvidence)), node('p', {}, text(p.copyright)));
    sources.append(item);
  }
  parent.append(sources);
}
function provenance(parent: HTMLElement, bundle: ContentBundle, record: ContentRecord, asOf: string): void {
  const status = effectiveStatus(bundle, record, asOf);
  parent.append(node('p', { class: 'pill' }, `Status: ${status} · revision ${record.version}`));
  const authors = record.authorIds.map(id => {
    const actor = bundle.actors.find(item => item.id === id);
    return `${id} (${actor?.kind ?? 'unknown'}; ${actor?.role ?? 'unknown role'})`;
  });
  parent.append(node('p', { class: 'side-note' }, `Authored ${record.authoredAt} by ${authors.join(', ')}. Bundle ${bundle.contentVersion}.`));
  if (status === 'draft') parent.append(node('p', { class: 'warn' }, 'Provisional draft. No independent educator or legal approval is claimed. Source metadata and automated checks do not validate teaching.'));
  if (status === 'stale' || status === 'retired') parent.append(node('p', { class: 'warn' }, `${status === 'retired' ? 'Retired: withdrawn from new study.' : 'Stale: review is required before relying on this material.'} This exact revision remains available for history.`));
}
/** All authored text uses textContent. Only validated HTTPS source URLs become external links. */
export function renderReader(
  root: HTMLElement, bundle: ContentBundle, objectives: Objective[], state: LearnerState | undefined,
  change: Change, hash = location.hash, asOf = new Date().toISOString().slice(0, 10),
): void {
  const focusId = root.contains(document.activeElement) ? document.activeElement?.id : undefined;
  root.replaceChildren();
  const intro = node('div', { class: 'card' });
  intro.append(node('h2', {}, 'Foundation reading'), node('p', {}, 'Original reading is self-contained. External courses are optional supplements. Reading completion records participation only; task completion, resource use, recall, question attempts and applied assessment remain separate.'));
  const lessons = bundle.records.filter(record => record.kind === 'lesson' &&
    !bundle.records.some(other => other.id === record.id && other.version > record.version));
  const catalog = node('ol', { class: 'lesson-catalog' });
  for (const lesson of lessons) {
    const item = node('li');
    item.append(referenceLink(bundle, lesson), node('span', { class: 'side-note' }, ` · ${isRead(state, lesson) ? 'Read' : 'Unread'} · ${effectiveStatus(bundle, lesson, asOf)}`));
    catalog.append(item);
  }
  intro.append(catalog);
  root.append(intro);
  const ref = contentRoute(hash);
  if (!ref) return;
  const record = findContent(bundle, ref);
  const article = node('article', { class: 'card lesson-body', 'aria-labelledby': 'readerHeading' });
  const title = node('h2', { id: 'readerHeading', tabindex: '-1' }, record?.title ?? 'Revision unavailable');
  article.append(title);
  root.append(article);
  if (!record || !['lesson', 'concept'].includes(record.kind)) {
    article.append(node('p', {}, 'This exact lesson or concept revision is unavailable in the installed bundle. Reading history has been retained.'));
    return;
  }
  provenance(article, bundle, record, asOf);
  if (record.kind === 'concept') {
    heading(article, 'Definition');
    article.append(node('p', {}, text(record.payload.definition)));
    heading(article, 'Misconception');
    article.append(node('p', {}, text(record.payload.misconception)));
    heading(article, 'Lessons using this revision');
    const links = node('ul');
    for (const lesson of bundle.records.filter(item => item.kind === 'lesson' && item.payload.conceptRefs?.some(target => contentKey(target) === contentKey(record)))) {
      const item = node('li'); item.append(referenceLink(bundle, lesson)); links.append(item);
    }
    article.append(links);
  } else {
    const lesson = record as Lesson, p = lesson.payload;
    article.append(node('p', { class: 'side-note' }, `${p.estimatedMinutes} minutes · Tasks: ${lesson.taskIds.join(', ')} · Exact revision ${contentKey(lesson)}`));
    heading(article, 'Learning objectives');
    article.append(list(lesson.objectiveIds.map(id => objectives.find(objective => objective.id === id)?.statement ?? id)));
    const entry = lesson.objectiveIds.flatMap(id => objectives.find(objective => objective.id === id)?.entryRequirement ?? []);
    if (entry.length) article.append(list(entry));
    heading(article, 'Prerequisites');
    if (!p.prerequisiteRefs.length) article.append(node('p', {}, 'No prior lesson required.'));
    else {
      const links = node('ul');
      for (const target of p.prerequisiteRefs) { const item = node('li'); item.append(referenceLink(bundle, target)); links.append(item); }
      article.append(links);
    }
    const contents = node('nav', { 'aria-label': 'Reading sections', class: 'reading-sections' });
    p.sections.forEach((section, index) => {
      const link = node('button', { class: 'btn', type: 'button' }, section.heading);
      link.addEventListener('click', () => {
        const target = root.querySelector<HTMLElement>(`#reading-section-${index}`);
        target?.focus(); target?.scrollIntoView({ block: 'start' });
      });
      contents.append(link);
    });
    article.append(contents);
    p.sections.forEach((section, index) => {
      const block = node('section');
      block.append(node('h3', { id: `reading-section-${index}`, tabindex: '-1' }, section.heading), node('p', {}, section.body));
      article.append(block);
    });
    heading(article, 'Worked example'); article.append(node('p', {}, p.workedExample));
    heading(article, 'Misconceptions'); article.append(list(p.misconceptions));
    heading(article, 'Concepts');
    const concepts = node('ul');
    for (const target of p.conceptRefs) { const item = node('li'); item.append(referenceLink(bundle, target)); concepts.append(item); }
    article.append(concepts);
    heading(article, 'Practice preview');
    article.append(node('p', { class: 'side-note' }, 'Use these prompts for reflection. This reader does not record answers or assess performance.'));
    for (const target of p.practiceRefs) {
      const practice = findContent(bundle, target);
      if (!practice) continue;
      const preview = node('details');
      preview.append(node('summary', {}, `${practice.title} · v${practice.version} · ${effectiveStatus(bundle, practice, asOf)}`),
        node('p', {}, text(practice.payload.prompt ?? practice.payload.brief)), node('p', {}, text(practice.payload.deliverable)));
      if (practice.kind === 'scenario') preview.append(node('a', { href: caseHash(practice) }, 'Attempt this executive case'));
      if (practice.kind === 'question') preview.append(node('a', { href: questionHash(practice) }, 'Attempt this question'));
      article.append(preview);
    }
    const complete = isRead(state, lesson);
    const button = node('button', { class: 'btn primary', id: 'readingComplete', type: 'button', 'aria-pressed': String(complete) }, complete ? 'Mark reading unread' : 'Mark reading complete');
    button.dataset.retired = String(effectiveStatus(bundle, lesson, asOf) === 'retired');
    button.disabled = !state || button.dataset.retired === 'true';
    button.addEventListener('click', () => { void change(candidate => setRead(candidate, lesson, !complete)); });
    const progress = node('div', { class: 'reading-progress' });
    progress.append(node('p', { id: 'readingStatus', role: 'status' }, complete ? 'Reading complete for this revision. No mastery or task completion is implied.' : 'Reading not yet marked complete for this revision.'), button);
    article.append(progress);
  }
  references(article, bundle, record, asOf);
  if (focusId) root.querySelector<HTMLElement>(`#${focusId}`)?.focus({ preventScroll: true });
}
export function bindReader(bundle: ContentBundle, objectives: Objective[], change: Change): (state: LearnerState | undefined) => void {
  const root = byId('lessonReader', 'div');
  let state: LearnerState | undefined;
  const render = (next: LearnerState | undefined): void => { state = next; renderReader(root, bundle, objectives, state, change); };
  window.addEventListener('hashchange', () => {
    render(state);
    if (location.hash.startsWith('#lessons/')) root.querySelector<HTMLElement>('#readerHeading')?.focus();
  });
  return render;
}
