import { byId, node } from "./dom";
import type { Change, HistoryKind, LearnerState } from "./types";

export function renderEntries(
  state: LearnerState,
  kind: HistoryKind,
  changed: Change,
): void {
  const root = byId(
    kind === "journal" ? "journalList" : "achievementList",
    "div",
  );
  root.replaceChildren();
  const entries = [...state[kind]].sort((a, b) => b.date.localeCompare(a.date));
  if (!entries.length) {
    root.append(
      node(
        "div",
        { class: "empty" },
        kind === "journal"
          ? "No learning entries yet. Capture your first insight."
          : "No achievements yet. Record your first milestone.",
      ),
    );
    return;
  }
  for (const entry of entries) {
    const item = node("div", { class: "log" });
    const del = node("button", { type: "button" }, "Delete");
    del.addEventListener("click", () => {
      if (confirm("Delete this entry?")) {
        void changed(candidate => { candidate[kind] = candidate[kind].filter((value) => value.id !== entry.id); });
      }
    });
    item.append(
      node("strong", {}, entry.title),
      node("time", {}, entry.date),
      node("p", {}, entry.body),
      del,
    );
    root.append(item);
  }
}

function makeId(): string {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random();
}

export function bindHistoryForms(
  changed: Change,
): void {
  const today = new Date().toLocaleDateString("en-CA");
  const forms = [
    {
      kind: "journal",
      form: "journalForm",
      date: "journalDate",
      title: "journalTopic",
      body: "journalLearned",
    },
    {
      kind: "achievements",
      form: "achievementForm",
      date: "achievementDate",
      title: "achievementTitle",
      body: "achievementEvidence",
    },
  ] as const;
  for (const fields of forms) {
    const form = byId(fields.form, "form");
    const date = byId(fields.date, "input");
    date.value = today;
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const entry = {
        id: makeId(),
        date: date.value,
        title: byId(fields.title, "input").value.trim(),
        body: byId(fields.body, "textarea").value.trim(),
      };
      if (await changed(candidate => { candidate[fields.kind].push(entry); })) {
        form.reset();
        date.value = today;
      }
    });
  }
}
