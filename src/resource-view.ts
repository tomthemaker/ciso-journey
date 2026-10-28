import { safeHttps } from './content.ts';
import { node } from './dom.ts';
import { taskLearningResources } from './data.ts';
import { taskResources } from './resource-catalog.ts';
import { editResource, latestProgress, latestResource, saveResourceProgress, trackedResource } from './resource-progress.ts';
import type { ResourceDefinition, ResourceEntry, ResourceStatus } from './resource-progress.ts';
import type { Change, LearnerState } from './types.ts';

const names: Record<ResourceStatus, string> = { 'not-started': 'Not started', 'in-progress': 'In progress', completed: 'Completed' };
function link(title: string, url: string): HTMLElement {
  const safe = safeHttps(url);
  return safe ? node('a', { href: safe, target: '_blank', rel: 'noopener noreferrer' }, title + ' ↗') : node('span', {}, title + ' (link unavailable)');
}
function field<T extends HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(form: HTMLFormElement, title: string, control: T, id: string): T {
  control.id = id;
  const wrapper = node('div', { class: 'field' });
  wrapper.append(node('label', { for: id }, title), control);
  form.append(wrapper);
  return control;
}
function urlField(form: HTMLFormElement, title: string, id: string, value = '', required = false): HTMLInputElement {
  const input = field(form, title, node('input', { type: 'url', ...(required ? { required: '' } : {}) }), id);
  input.value = value;
  input.addEventListener('input', () => input.setCustomValidity(''));
  return input;
}
function validUrl(input: HTMLInputElement): boolean {
  input.setCustomValidity(input.value && !safeHttps(input.value) ? 'Use an HTTPS URL without a username or password.' : '');
  return input.reportValidity();
}
const localDate = (): string => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; };
function metadataForm(resource: ResourceDefinition, changed: Change, archived = false): HTMLFormElement {
  const form = node('form', { class: 'resource-edit' });
  const title = field(form, 'Resource title', node('input', { required: '' }), resource.id + '-title');
  title.value = resource.title;
  const platform = field(form, 'Platform or publisher', node('input', { required: '' }), resource.id + '-platform');
  platform.value = resource.platform;
  const url = urlField(form, 'Resource HTTPS URL', resource.id + '-url', resource.url, true);
  const type = field(form, 'Resource type', node('select'), resource.id + '-type');
  for (const [value, label] of [['course', 'Course'], ['reference', 'Reference / reading']]) type.append(node('option', { value }, label));
  type.value = resource.type;
  form.append(node('button', { class: 'btn', type: 'submit' }, resource.url ? 'Save resource details' : 'Add custom resource'));
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!validUrl(url)) return;
    const values = { title: title.value.trim(), platform: platform.value.trim(), url: url.value, type: type.value as 'course' | 'reference', archived };
    if (!values.title || !values.platform) return;
    void changed(candidate => {
      if (resource.url) editResource(candidate, resource, values);
      else trackedResource(candidate, { ...resource, ...values });
    });
  });
  return form;
}
function renderHistory(entry: ResourceEntry): HTMLDetailsElement {
  const history = node('details', { id: entry.id + '-history', class: 'resource-history' });
  history.append(node('summary', {}, 'Saved resource history'));
  const list = node('ol');
  for (const revision of entry.revisions) {
    const item = node('li', {}, `Details v${revision.version} · ${revision.changedAt} · ${revision.archived ? 'Archived' : 'Active'} · ${revision.platform} · `);
    item.append(link(revision.title, revision.url));
    list.append(item);
  }
  for (const progress of entry.progress) {
    const revision = entry.revisions[progress.resourceVersion - 1];
    const item = node('li', {}, `${names[progress.status]} · ${progress.recordedAt} · ${revision.title} (details v${revision.version})${progress.completedAt ? ' · Completed ' + progress.completedAt : ''}`);
    item.append(node('p', { class: 'resource-notes' }, progress.notes));
    if (progress.evidenceUrl) item.append(link('Evidence', progress.evidenceUrl));
    list.append(item);
  }
  history.append(list);
  return history;
}
function resourceCard(resource: ResourceDefinition, entry: ResourceEntry | undefined, changed: Change): HTMLElement {
  const revision = entry && latestResource(entry);
  // Once tracked, keep the saved metadata until an explicit edit; catalog changes cannot erase history.
  if (revision) resource = { ...resource, title: revision.title, platform: revision.platform, url: revision.url, type: revision.type };
  const progress = latestProgress(entry);
  const card = node('article', { class: 'resource-card', 'data-resource-id': resource.id });
  card.append(node('p', { class: 'resource-kind' }, `${resource.platform} · ${resource.type}${resource.isCustom ? ' · Custom' : ''}${revision?.archived ? ' · Archived' : ''}`), link(resource.title, resource.url));
  card.append(node('p', { class: 'resource-status' }, `Resource status: ${names[progress?.status ?? 'not-started']}${progress?.completedAt ? ' · ' + progress.completedAt : ''}`));
  if (!revision?.archived) {
    const form = node('form', { class: 'resource-progress-form' });
    const status = field(form, 'Resource status', node('select'), resource.id + '-status');
    for (const [value, name] of Object.entries(names)) status.append(node('option', { value }, name));
    status.value = progress?.status ?? 'not-started';
    const date = field(form, 'Completion date', node('input', { type: 'date' }), resource.id + '-date');
    date.value = progress?.completedAt ?? '';
    const syncDate = () => { date.required = status.value === 'completed'; if (date.required && !date.value) date.value = localDate(); };
    syncDate(); status.addEventListener('change', syncDate);
    const notes = field(form, 'Notes / what I understood', node('textarea'), resource.id + '-notes');
    notes.value = progress?.notes ?? '';
    const evidence = urlField(form, 'Evidence HTTPS URL (optional)', resource.id + '-evidence', progress?.evidenceUrl);
    const save = node('button', { class: 'btn', type: 'submit', id: resource.id + '-save' }, 'Save resource progress');
    form.append(save);
    form.addEventListener('submit', event => {
      event.preventDefault();
      if (!validUrl(evidence)) return;
      const values = { status: status.value as ResourceStatus, completedAt: status.value === 'completed' ? date.value : null, notes: notes.value, evidenceUrl: evidence.value };
      void changed(candidate => saveResourceProgress(candidate, resource, values)).then(() => document.getElementById(save.id)?.focus({ preventScroll: true }));
    });
    card.append(form);
    if (resource.isCustom) {
      const edit = node('details', { id: resource.id + '-edit' });
      edit.append(node('summary', {}, 'Edit custom resource'), metadataForm(resource, changed));
      card.append(edit);
    }
  }
  const archive = node('button', { class: 'btn', type: 'button' }, revision?.archived ? 'Restore resource' : 'Archive resource');
  archive.addEventListener('click', () => { void changed(candidate => editResource(candidate, resource, { title: resource.title, platform: resource.platform, url: resource.url, type: resource.type, archived: !revision?.archived })); });
  card.append(archive);
  if (entry) card.append(renderHistory(entry));
  return card;
}
export function renderTaskResources(state: LearnerState, taskId: string, changed: Change): HTMLDetailsElement {
  const source = taskLearningResources[taskId];
  const details = node('details', { class: 'task-resources resource-panel', id: taskId + '-resources' });
  details.append(node('summary', {}, 'Learning resources · Supplementary courses and references'), node('p', {}, 'Original lessons are the core teaching. Saving resource progress does not complete a task, reading, recall, question practice or competency assessment.'));
  if (source) details.append(node('p', {}, 'Study focus: ' + source.focus));
  const catalog = taskResources(taskId);
  const entries = state.resourceProgress?.entries.filter(entry => entry.taskId === taskId) ?? [];
  for (const resource of catalog) details.append(resourceCard(resource, entries.find(entry => entry.id === resource.id), changed));
  for (const entry of entries.filter(entry => !catalog.some(resource => resource.id === entry.id))) {
    const revision = latestResource(entry);
    details.append(resourceCard({ id: entry.id, taskId: entry.taskId, isCustom: entry.isCustom, title: revision.title, platform: revision.platform, url: revision.url, type: revision.type }, entry, changed));
  }
  if (source) {
    const discovery = node('div', { class: 'resource-discovery' });
    discovery.append(node('p', {}, 'Discovery searches · Suggestions only; no completion tracking. Add a specific course as a custom resource to track it.'), link('LinkedIn Learning discovery search: ' + source.searchTerms, 'https://www.linkedin.com/learning/search?keywords=' + encodeURIComponent(source.searchTerms)), node('br'), link('Coursera discovery search: ' + source.searchTerms, 'https://www.coursera.org/search?query=' + encodeURIComponent(source.searchTerms)));
    details.append(discovery);
  }
  const add = node('details', { id: taskId + '-add-resource' });
  add.append(node('summary', {}, 'Add custom resource'));
  // Stable while a failed-save draft is on screen; generated again only after a successful render.
  add.append(metadataForm({ id: `custom-${crypto.randomUUID()}`, taskId, isCustom: true, title: '', platform: '', url: '', type: 'course' }, changed));
  details.append(add);
  return details;
}
