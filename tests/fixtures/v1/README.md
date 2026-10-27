# Synthetic v1 preservation fixtures

These files contain invented test data only. Never replace them with learner backups.

- `inventory.json`: frozen baseline extracted from `index.html` at `86be75d` before runtime changes. It records the exact six phases, all 37 ID/title/output triples, six score defaults, task study suggestions and nine general links. Change it only for an explicitly reviewed product decision; regenerating it from changed code would hide regressions.
- `empty.json`: an exported-envelope shape with default scores and no progress.
- `mixed-progress.json`: explicit true/false values for every task, all score values 0–4 across six categories, two dated journal entries and two achievements (including empty evidence). Unicode, multiline text and inert HTML exercise exact preservation and safe rendering.
- `all-complete.json`: every task true and every category at 4; exercises completed phase filtering and progress boundaries.

Invalid/future payloads are derived from these synthetic fixtures in the browser test, one field at a time, plus truncated JSON and missing/wrong top-level types. Each rejected import must leave both the stored bytes and live exported state unchanged. Tests call the shipped file input/download interactions; they do not reimplement migration or import logic in a helper.
