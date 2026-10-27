# CISO Journey 2.0

Original teaching, questions, FSRS retrieval, practical decisions and evidence. LinkedIn Learning supplements the curriculum.

Links: [initiative #2](https://github.com/tomthemaker/ciso-journey/issues/2) · [memory](https://github.com/tomthemaker/ciso-journey/blob/main/docs/product/MEMORY.md) · [release gates](https://github.com/tomthemaker/ciso-journey/blob/main/docs/product/PLAN.md) · [instructions](https://github.com/tomthemaker/ciso-journey/blob/main/AGENTS.md).

Workflow: Todo → In Progress → In Review → Done. Issues hold acceptance/dependencies; memory holds decisions. R0 gates R1 integration; R4 may follow R2; optional R5 follows stable local data.

One orchestrator scopes/distributes/tracks work and arranges reviews; it never implements or approves. Each implementation/fix run uses a fresh agent with `fork_turns="none"`, compact handoff and isolated worktree/branch. Each task receives a separate fresh reviewer and read-only worktree at the exact candidate; no self-approval or batch-only sign-off.

After implementation/checks, link the PR/deliverable and keep the issue open In Review. Record reviewer ID, candidate SHA/version, acceptance coverage, checks, findings/limits and explicit Approve or Changes requested. Below the cap, fix in In Progress and re-review in In Review; changes after approval need updated review.

At two Changes requested verdicts per PR across revisions/agents: stop automated fixes/reviews, assign `tomthemaker`, flag concise findings/blocker/evidence and leave the issue open In Review pending explicit owner direction to resume. Commits, agents, CI reruns or splitting the same work do not reset/bypass the count. CI failures alone are not verdicts.

Done/closure requires final-candidate approval, passing checks and applicable delivery/merge requirements. Respect branch protections; agent approval does not replace required GitHub reviews or educator/legal validation. Missing review leaves In Review. This process is documented, not automatically enforced.

Keep new issue/PR/review text brief and factual for LLM consumption: relevant task/outcome, SHA/version, checks, findings, verdict/limits and links. Link necessary detail in files/artifacts; humans can request more. Preserve historical records. Policy: D013/D014/D019; [#32](https://github.com/tomthemaker/ciso-journey/issues/32).
