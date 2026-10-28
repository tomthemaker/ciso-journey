# Foundation English revision

Refs [#47](https://github.com/tomthemaker/ciso-journey/issues/47), D032 and the [C02 contract](CONTENT_CONTRACT.md). The candidate is AI-authored draft teaching. Neither this editorial pass nor agent review is independent educator or legal approval.

## Scope and history

The language audit covered all 66 latest teaching IDs, six sources and retained case history. The revision appends 65 new teaching revisions, including dependency-only revisions where exact references now point to revised teaching. `concept-cia` was inspected and remains unchanged. Sources were not rewritten. Field-level change notes identify the edited payload paths; exact earlier revisions, editorial entries and author provenance remain available. The new lesson practice links to the new case and rubric, while old lesson links continue to resolve to their original versions.

The rewrites define identity, architecture and recovery vocabulary in context; explain mechanisms and evidence; turn model answers and rubric anchors into observable reasoning; and preserve both case options and the decision constraints. The questions retain their keys and rubric IDs and scores. The four weekly exercises explicitly identify what their top anchors add. A new card revision needs an explicit separate enrollment: the earlier revision's schedule and events are not reset or retargeted, including when it is suspended or archived. Earlier reading, answers and self-assessments retain their pinned revisions and are not automatically regraded.

## Separately resolved concerns

| Audit ID | Decision and impact |
|---|---|
| T01 | Recovery time and recovery-point age are observations compared with the four-hour RTO and one-hour RPO. The 3-hour-15-minute time meets its target; the 90-minute age misses its target by 30 minutes. This corrects terminology, not the figures or the old assessment. NIST describes [RTO](https://csrc.nist.gov/glossary/term/Recovery_Time_Objective) and [RPO](https://csrc.nist.gov/glossary/term/recovery_point_objective) as objectives. |
| T02 | Successful authentication checks control of an authenticator associated with the account; it does not establish a person's real-world identity or continuing authorisation. See [NIST SP 800-63B-4 introduction](https://pages.nist.gov/800-63-4/sp800-63b.html#introduction). The title, examples and question rubric use this distinction. |
| T03 | The architecture question permits justified stopping of dispatch when restoring it is not feasible. The new score-2 test anchor accepts a synthetic dispatch denial in that branch, while still requiring denial of unrelated management access. The response must explain the tradeoff, decision scope and review time. This is an assessment-scope correction; old attempts and old rubric remain unchanged. |
| T04 | Weekly practice now states the additional work needed for the top anchors, including extensions beyond the basic exercise. Anchor levels and scores remain distinct; question-specific rubrics do not become weekly rubrics. |
| T05 | The card still asks for one human-administrator and one unattended-job safeguard. Its answer states a short residual-risk explanation rather than adding an unasked recall instruction. Existing schedules are untouched. |
| T06 | A payment loss is a possible consequence of changed bank details, not a stated event. The stock-edit question explicitly states its approval-rule premise. The case labels the compromised clerk and excessive export access as assumptions and distinguishes the known baseline recovery point from the untested next one. No answer key or case measurement changes. |

NIST pages were inspected on 2026-10-28 for the specific T01 and T02 terminology; the remaining choices address the fictional exercise's premises and assessment alignment, not an assertion of NIST conformance. These checks do not establish that every source claim or instructional choice is independently validated. A fresh independent language review and the separate human educator/legal publication gates remain outstanding.

## Verification

The previous delivered bundle is kept as a synthetic compatibility fixture. Tests compare every earlier record, editorial entry and actor, validate synthetic references for every old revision, reject an altered old record, and check latest question keys and rubric IDs/scores. Tests of historical routes, attempts, backup round trips, card enrollment and rendered browser flows complement these checks. Structural validation is not a factual or educational review. Exact-candidate commands and review evidence belong in the PR.
