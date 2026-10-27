import { phases, taskLearningResources } from "./data";
import { byId, node } from "./dom";
import type { LearnerState } from "./types";

export function renderRoadmap(state: LearnerState, changed: () => void) {
  const root = byId("phaseList", "div");
  root.replaceChildren();
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
          class: "task" + (state.completed[task[0]] ? " done" : ""),
        }),
        check = node("input", { type: "checkbox" });
      check.checked = !!state.completed[task[0]];
      check.addEventListener("change", () => {
        state.completed[task[0]] = check.checked;
        changed();
        renderRoadmap(state, changed);
      });
      const label = node("span", {}, task[1]);
      label.append(node("small", {}, task[2]));
      row.append(check, label);
      const block = node("div", { class: "task-block" });
      block.append(row);
      const r = taskLearningResources[task[0]];
      if (r) {
        const details = node("details", { class: "task-resources" }),
          summary = node(
            "summary",
            {},
            "Learning resources · LinkedIn Learning first",
          ),
          links = node("div", { class: "resource-links" });
        const addLink = (kind: string, title: string, url: string) => {
          const a = node("a", {
            class: "resource-link",
            href: url,
            target: "_blank",
            rel: "noopener noreferrer",
          });
          a.append(
            node("span", { class: "resource-kind" }, kind),
            node("span", {}, title + " ↗"),
          );
          links.append(a);
        };
        const searchUrl =
          "https://www.linkedin.com/learning/search?keywords=" +
          encodeURIComponent(r.searchTerms);
        addLink("LinkedIn Learning", r.linkedinTitle, r.linkedinUrl);
        addLink(
          "LinkedIn Learning",
          "Explore targeted courses: " + r.searchTerms,
          searchUrl,
        );
        addLink("Official", r.officialTitle, r.officialUrl);
        addLink(
          "Coursera",
          "Explore courses: " + r.searchTerms,
          "https://www.coursera.org/search?query=" +
            encodeURIComponent(r.searchTerms),
        );
        if (
          [
            "p2a",
            "p2b",
            "p2c",
            "p2d",
            "p2e",
            "p3a",
            "p3b",
            "p3c",
            "p3d",
            "p3e",
          ].includes(task[0])
        )
          addLink(
            "Coursera",
            "Cybersecurity Governance and Compliance",
            "https://www.coursera.org/learn/cybersecurity-governance-compliance",
          );
        details.append(
          summary,
          node("p", {}, "Study focus: " + r.focus),
          links,
        );
        block.append(details);
      }
      card.append(block);
    }
    root.append(card);
  }
  if (!root.children.length)
    root.append(
      node(
        "p",
        { class: "empty" },
        "All roadmap tasks completed. Excellent work!",
      ),
    );
}
