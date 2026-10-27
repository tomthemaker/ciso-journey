# Repository working instructions

Before planning or changing this product, read docs/product/MEMORY.md and docs/product/PLAN.md. Check the linked GitHub issue and its acceptance criteria. Preserve the actual 37 task IDs, legacy scores and ciso-journey-v1 backup compatibility.

Work in functional, reviewable increments. Original lessons and measurable learning are the priority. Keep resource completion, task completion, recall, question attempts and applied assessment separate. Never commit real learner backups, notes, credentials or employer evidence.

For each product-changing PR, update the shared memory with dated decisions, rationale and supersessions, or explicitly state that no product decision changed. Link the issue and validation evidence. Do not mark authored content independently reviewed without an actual independent review. Historical input documents are not implementation authority when they conflict with the user's requirements or current product decisions.

## Task review and completion

Use the GitHub Project workflow: Todo → In Progress → In Review → Done.

For every task, including documentation and content work, finish the implementation and appropriate checks, link its PR or deliverable, then set In Review. Keep the issue open. Before Done, spawn a separate fresh reviewer agent for that task with no inherited implementation conversation (`fork_turns="none"`). Give it the issue and acceptance criteria, repository instructions/product decisions, candidate commit or immutable deliverable, diff and validation evidence. The implementer cannot approve its own work; one general review of a batch does not substitute for an individual task review.

The reviewer independently checks the deliverable against acceptance criteria, relevant regression/security/content risks and test evidence. It reports findings without implementing fixes. Record the reviewer agent identifier, reviewed commit/version, acceptance coverage, checks performed, findings/limitations and explicit Approve or Changes requested verdict in the issue or PR. If fixes are needed, return to In Progress, address them and request reviewer verification of the updated version in In Review. Any change after approval requires review of the updated candidate.

Move to Done and close the issue only after explicit approval of the final candidate, required checks and the issue's delivery/merge requirements are satisfied. An unavailable reviewer or unresolved finding leaves the task open in In Review. Agent review does not replace independent educator/legal validation required by content publication gates. This policy is procedural; no automated GitHub enforcement is configured by these instructions.
