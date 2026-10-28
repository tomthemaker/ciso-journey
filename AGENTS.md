# Repository working instructions

Before planning or changing this product, read docs/product/MEMORY.md and docs/product/PLAN.md. Check the linked GitHub issue and its acceptance criteria. Preserve the actual 37 task IDs, legacy scores and ciso-journey-v1 backup compatibility.

Work in functional, reviewable increments. Original lessons and measurable learning are the priority. Keep resource completion, task completion, recall, question attempts and applied assessment separate. Never commit real learner backups, notes, credentials or employer evidence.

For each product-changing PR, update the shared memory with dated decisions, rationale and supersessions, or explicitly state that no product decision changed. Link the issue and validation evidence. Do not mark authored content independently reviewed without an actual independent review. Historical input documents are not implementation authority when they conflict with the user's requirements or current product decisions.

## Validation policy

Keep CI fast: run unit tests and type/build checks when present. Run critical browser flows locally during implementation and independent review of runtime/test changes, and before release, including the Pages subpath smoke check when available. Record the candidate and results in the PR. Workflow/docs-only changes may reuse recorded browser evidence when the app, tests, fixtures, browser configuration and dependency lockfile are unchanged; record that comparison. `npm test` runs fast unit checks; `npm run test:browser` explicitly runs local browser checks. Browser installation and execution do not belong in CI at this stage. See D020 in docs/product/MEMORY.md.

## Task orchestration

Use one orchestrator agent only to distribute tasks and oversee the process: scope work, manage dependencies, hand off context, track GitHub status and arrange reviews. The orchestrator does not implement tasks or approve deliverables.

For each task, the orchestrator explicitly selects the implementation model and reasoning effort from task scope and risk, and records a brief rationale in the handoff. Defaults: routine triage or small documentation edits use `gpt-6-luna` at medium effort; standard implementation uses `gpt-6.1-sol` at medium; substantial UI/UX, migrations or reviews use `gpt-6.1-terra` at high; difficult security/architecture work or explicitly requested deep content review uses `gpt-6-astra` at high. A user's explicit model request takes precedence; reasoned escalation is allowed. Use only exact model IDs currently available in the tool catalog; do not invent availability, pricing or guarantees. See D030 and [#48](https://github.com/tomthemaker/ciso-journey/issues/48).

For every task, including documentation and content, the orchestrator spawns a fresh implementation agent with `fork_turns="none"`. Keep context small through a compact handoff containing the issue and acceptance criteria, relevant repository/product instructions, base commit, isolated task worktree/branch and required validation. Each implementation run uses its own fresh agent; never reuse an agent for unrelated tasks. A later fix run also uses a new fresh implementation agent with the findings and current candidate in its compact handoff.

Keep handoffs and outputs concise and task-specific. When a remaining-context metric is observable, checkpoint near 50% remaining; use only supported compaction controls and never claim compaction or control that is unavailable.

Implementation and review use separate fresh agents and isolated worktrees. Reviewers inspect the exact candidate in a separate read-only worktree; they report findings without implementing fixes. The orchestrator coordinates the transitions and evidence below.

## Task review and completion

Use the GitHub Project workflow: Todo → In Progress → In Review → Done.

For every task, including documentation and content work, finish the implementation and appropriate checks, link its PR or deliverable, then set In Review. Keep the issue open. Before Done, the orchestrator spawns a separate fresh reviewer agent for that task with no inherited implementation conversation (`fork_turns="none"`). Give it the issue and acceptance criteria, repository instructions/product decisions, candidate commit or immutable deliverable, diff and validation evidence. The implementer cannot approve its own work; one general review of a batch does not substitute for an individual task review.

The reviewer independently checks the deliverable against acceptance criteria, relevant regression/security/content risks and test evidence. It reports findings without implementing fixes. Record the reviewer agent identifier, reviewed commit/version, acceptance coverage, checks performed, findings/limitations and explicit Approve or Changes requested verdict in the issue or PR. If fixes are needed and the review cap below has not been reached, return to In Progress, address them and request reviewer verification of the updated version in In Review. Any change after approval requires review of the updated candidate.

Move to Done and close the issue only after explicit approval of the final candidate, required checks and the issue's delivery/merge requirements are satisfied. Respect branch protections and required GitHub reviews/checks; user or agent approval does not waive them. An unavailable reviewer or unresolved finding leaves the task open in In Review. Agent review does not replace independent educator/legal validation required by content publication gates. This policy is procedural; no automated GitHub enforcement is configured by these instructions.

## Review cap and GitHub text

Count explicit **Changes requested** review verdicts per PR across all revisions and agents. At the second verdict, stop automated fix/review cycles, assign the PR to `tomthemaker`, and flag the owner with a brief findings/blocker summary and evidence links. Keep the issue open in **In Review** pending owner direction. Resume the capped PR only on explicit owner direction. New commits, new agents, CI reruns or splitting the same work do not reset or bypass the count. CI failures alone are not review verdicts. The cap does not waive fresh task review, required checks or merge gates.

Keep all new issue, PR and review text brief and factual; the primary consumer is an LLM, and humans can request details. Use only relevant compact fields: task/outcome, candidate SHA/version, checks, findings, verdict/limitations and links. Put necessary detail in linked files/artifacts instead of long GitHub prose. Do not rewrite historical records solely to shorten them.
