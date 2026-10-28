import { phases } from "./data";
import { byId, node } from "./dom";
import { renderTaskResources } from "./resource-view";
import { resourceCompletionCount } from "./resource-progress";
import type { Change, LearnerState } from "./types";

let previousState: LearnerState | undefined;
export function renderRoadmap(state: LearnerState, changed: Change) {
  const root = byId("phaseList", "div");
  const firstRender = previousState === undefined;
  const open = new Set(Array.from(root.querySelectorAll<HTMLDetailsElement>('details[open]')).map(details => details.id));
  const drafts = previousState === state ? Array.from(root.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('form input, form select, form textarea')).map(control => ({ id: control.id, value: control.value })) : [];
  // Custom-add form IDs are generated per render; retain the old forms on a failed save.
  const addDrafts = previousState === state ? Array.from(root.querySelectorAll<HTMLDetailsElement>('details[id$="-add-resource"]')).map(details => ({ id: details.id, form: details.querySelector('form')! })) : [];
  previousState = state;
  root.replaceChildren();
  root.append(node('p', { id: 'resourceCompletionCount', role: 'status' }, `${resourceCompletionCount(state)} resources completed (including archived history). Task completion and legacy ratings are separate.`));
  const onlyIncomplete = byId("phaseFilter", "select").value === "incomplete";
  for (const phase of phases) {
    const count = phase.tasks.filter((t) => state.completed[t[0]]).length;
    if (onlyIncomplete && count === phase.tasks.length) continue;
    const card = node("article", { class: "card phase" }),
      head = node("div", { class: "phasehead" }),
      badge = node("div", { class: "phasebadge" }, "MONTHS " + phase.months),
      desc = node("div");
    desc.append(node("h3", {}, phase.name), node("p", {}, phase.desc));
    head.append(badge, desc);
    card.append(head);
    const progress = node("div", { class: "progress" }),
      fill = node("div");
    fill.style.width = Math.round((count / phase.tasks.length) * 100) + "%";
    progress.append(fill);
    const progressLabel = node("div", { class: "progress-label" });
    card.append(progress, progressLabel);
    progressLabel.append(
      node("span", {}, count + " of " + phase.tasks.length + " tasks"),
      node(
        "span",
        {},
        Math.round((count / phase.tasks.length) * 100) + "% complete",
      ),
    );
    for (const task of phase.tasks) {
      if (onlyIncomplete && state.completed[task[0]]) continue;
      const row = node("label", {
          id: `task-${task[0]}`, tabindex: "-1", class: "task" + (state.completed[task[0]] ? " done" : ""),
        }),
        check = node("input", { type: "checkbox" });
      check.checked = !!state.completed[task[0]];
      check.addEventListener("change", () => {
        const completed = check.checked;
        void changed(candidate => { candidate.completed[task[0]] = completed; });
      });
      const label = node("span", {}, task[1]);
      label.append(node("small", {}, task[2]));
      row.append(check, label);
      const block = node("div", { class: "task-block" });
      block.append(row);
      block.append(renderTaskResources(state, task[0], changed));
      card.append(block);
    }
    root.append(card);
  }
  for (const draft of addDrafts) document.getElementById(draft.id)?.querySelector('form')?.replaceWith(draft.form);
  for (const draft of drafts) {
    const control = document.getElementById(draft.id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
    if (control) control.value = draft.value;
  }
  for (const id of open) {
    const details = document.getElementById(id);
    if (details instanceof HTMLDetailsElement) details.open = true;
  }
  if (firstRender && location.hash.startsWith('#roadmap/')) {
    const target = document.getElementById(`task-${location.hash.split('/')[1]}`);
    target?.focus(); target?.scrollIntoView({ block: 'center' });
  }
  if (root.children.length === 1)
    root.append(
      node(
        "p",
        { class: "empty" },
        "All roadmap tasks completed. Excellent work!",
      ),
    );
}
