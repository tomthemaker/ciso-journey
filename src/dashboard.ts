import { competencies, phases, resources } from "./data";
import { byId, node } from "./dom";
import type { LearnerState } from "./types";

export function renderStats(state: LearnerState): void {
  const tasks = phases.flatMap((phase) => phase.tasks);
  const done = tasks.filter((task) => state.completed[task[0]]).length;
  const percentage = Math.round((done / tasks.length) * 100);
  byId("overallBar", "div").style.width = percentage + "%";
  byId("overallText", "strong").textContent =
    `${percentage}% (${done}/${tasks.length})`;
  byId("statTasks", "strong").textContent = String(done);
  byId("statLogs", "strong").textContent = String(state.journal.length);
  byId("statAchievements", "strong").textContent = String(
    state.achievements.length,
  );
  byId("statCompetency", "strong").textContent =
    (
      competencies.reduce(
        (sum, [name]) => sum + (Number(state.scores[name]) || 0),
        0,
      ) / competencies.length
    ).toFixed(1) + "/4";
}

export function renderScores(state: LearnerState, changed: () => void): void {
  const root = byId("scores", "div");
  root.replaceChildren();
  for (const [name] of competencies) {
    const row = node("div", { class: "score" });
    const label = node("strong", {}, name);
    const select = node("select", { "aria-label": "Rating for " + name });
    for (let i = 0; i <= 4; i++)
      select.append(node("option", { value: String(i) }, i + "/4"));
    select.value = String(state.scores[name]);
    select.addEventListener("change", () => {
      state.scores[name] = Number(select.value);
      changed();
    });
    row.append(label, select);
    root.append(row);
  }
  byId("initialScores", "div").textContent = competencies
    .map(([name, value]) => name + ": " + value + "/4")
    .join(" · ");
}

export function renderResources(): void {
  const root = byId("resourceList", "div");
  root.replaceChildren();
  for (const [name, url, description] of resources) {
    const link = node(
      "a",
      {
        class: "resource",
        href: url,
        target: "_blank",
        rel: "noopener noreferrer",
      },
      name + " ↗",
    );
    link.append(node("small", {}, description));
    root.append(link);
  }
}
