# Readability and Today: design proposal

2026-10-28 · [Issue #46](https://github.com/tomthemaker/ciso-journey/issues/46) · Design increment approved at `e0292f6`; runtime implementation is pending fresh independent review. [Implementation and evidence](../product/UX_READABILITY.md). This brief records the approved design, not an educator/legal review.

## Assessment: synthetic baseline

At base `f084fc272b5ec2931c17c04fa77df90bdeecbbe6`, a fresh Playwright context with empty synthetic storage was inspected at 1440×900 and 390×844. Full-page screenshots are local, uncommitted evidence: `/private/tmp/ciso-ux-evidence/{today,reading}-{desktop,mobile}.png`. The development server was already running; these are observations, not tests of a frozen deployed artifact. No learner data was used.

1. **P1: task selection is buried.** Global hero, progress tiles and six long participation/assessment lines precede recall; on mobile the first review block begins well below the first viewport. The user must scroll past both the overview and explanations to find reading. Open tasks are only a generic roadmap link, and unread lesson count is not a list.
2. **P1: reading rhythm is cramped.** Computed lesson prose is 15px/22.5px at both sizes; its paragraph is 704px wide on desktop and 326px on mobile. Long uninterrupted paragraphs and closely packed section buttons compound the load. Existing `80ch` includes card padding, and visual line length varies with font. Current prose ink `#172437` on white is approximately 15:1; text contrast is strong, so size, measure and spacing matter more than darkening it. Muted `#66758a` on white is approximately 4.6:1; 13px metadata needs care. Browser/system font fallback can differ.
3. **P2: supporting material competes with study.** Repeated amber provenance blocks, plan arithmetic, metrics and settings compete with the next action. Draft status must remain visible, with authorship and source details still accessible; do not hide stale/retired warnings or imply independent review. Reader catalog appears before the selected article, delaying the actual reading.
4. **P2: preserve interaction contracts.** A review answer is revealed before ratings; failed saves retain answer and retry. Exact unavailable revisions are reported, never substituted. Task completion, reading, resources, observed recall, questions and applied assessment are independent. These are functional constraints, not visual details.

## Two-pass design direction

**Pass 1.** A compact daily worklist: due recall first, followed by unread lessons and open tasks; one prominent next action. An editorial reading column uses larger text and more breathing room. Left-align headings, content and actions; never justify prose. Use the existing system sans stack (no network font) and the established blue as a restrained action cue.

**Critique and revision.** A dashboard of equal cards and large counters would repeat the current metric-heavy shell and push study below the fold. Instead, make the ordered worklist the visual anchor, keep counts on the same line as their categories, and use spacing and a single quiet divider instead of decorative cards. On Today and the reader, compress the global hero/tiles to a small route-appropriate identity/navigation area while preserving backup and recovery access. This is specific to a recurring study session, not a marketing landing page. Avoid unnecessary motion, badges, uppercase labels and ornamental numbering.

### Proposed tokens

- Canvas `#f5f7fb`, surface `#ffffff`, text `#172437`, secondary text `#526176`, action `#2354a5`, divider `#d9e1eb`. Verify actual foreground/background pairs at implementation; normal text and links target at least 4.5:1, focus indicators and control boundaries at least 3:1 against adjacent colors. Do not use color alone for state.
- System sans stack already in use; prose 17–18px, line-height 1.6–1.7, maximum text measure 60–70ch (excluding padding). Body/UI 16px/1.5; secondary text at least 14px/1.5. Section headings 20–22px/1.3, page heading 26–30px/1.2; sentence case, weight 600–700. Respect user font scaling and avoid fixed heights.
- Spacing scale 4, 8, 12, 16, 24, 32px; paragraphs separated by ~1em, sections 32px, content gutters 16px mobile and 24–32px desktop. Long words/URLs wrap; controls have comfortable target sizes and visible focus.

### Today structure

```text
Desktop (left aligned, single primary work column)
CISO Journey                         backup / navigation
Today
Due reviews  [count]                 [Reveal answer]  <-- primary when eligible
  current prompt, due/new distinction; unavailable revision warning if needed
Unfinished reading  [count]
  unread lesson titles with links, draft status
Open tasks  [count of 37]
  open task titles with links to Roadmap
More study: related question / optional case
Details: progress signals | card settings | content provenance
```

```text
390px / 200% zoom (one column, no horizontal page scroll)
CISO Journey   navigation / backup
Today
Due reviews  [count]
  prompt
  [Reveal answer]
Unfinished reading  [count]
  lesson links
Open tasks  [count]
  task links
More study
Details and settings
```

Counts must describe their exact set: due/overdue scheduled reviews separately from allowed new cards; unread latest lesson revisions; incomplete canonical tasks among the actual 37. Do not conflate unavailable card revisions with actionable cards. Show all relevant items or a clearly labeled expandable list, not a misleading truncated count. Link tasks to their existing Roadmap context without changing completion. Preserve `todayPlan`'s related-lesson selection and queue ordering; separately list unread latest revisions rather than silently redefining that selection. When reviews are unavailable or absent, use the first available unread lesson as the primary action; if no unread lesson, offer open tasks; if nothing is actionable, explain the empty state. New card enrollment remains explicit; when enrolled new cards are eligible preserve existing due-before-new ordering. The primary action changes with state; other links remain visually secondary. After reveal, rating choices are equally presented with their existing meanings, not a preselected rating.

Reader: move the selected lesson to the top of its route; keep the lesson catalog available in a labeled disclosure or Lessons index. Keep the draft/stale/retired status and its meaning visible near the title. Put detailed author, exact revision and references in clearly labeled accessible disclosures while retaining all information. Use a compact section navigation disclosure on small screens. Maintain objectives, prerequisites, original prose, practice, completion and source links without editing content or implying mastery.

### States and accessibility

- Loading: say progress is loading; do not show false zero counts or enable persistence actions. Storage error: retain the existing recovery/download/retry paths and meaningful error text; do not suggest a successful save. Save failure retains drafts and revealed answer, and offers the existing same-rating retry.
- Empty queue: say no available reviews are due; distinguish future reviews, eligible new cards and explicit enrollment. Empty unread/tasks: say all current revisions are marked read or all tasks marked complete, respectively; offer a useful existing destination. Unavailable exact revisions remain visible with management access and retained history.
- Semantic headings, lists, links, buttons, fieldsets and labels; keyboard order follows visual order. Maintain focus after route changes, reveal, rating and save failure; `aria-live` status remains useful. Disclosures must work with keyboard and screen readers. Preserve focus visibility, reduced-motion preferences and text contrast. At 390px and 200% zoom, reflow without clipped content or horizontal page scrolling, and do not obscure controls.

## Acceptance and validation plan

Implementation must capture comparable synthetic before/after desktop and 390px screenshots, plus 200% zoom, including empty and populated due/unread/open states and a long lesson; inspect actual text measure, computed type, contrast and overflow. Check due-before-new, overdue carryover, unavailable revision, reveal-before-rating, failed-save retry, reading/task independence, navigation, keyboard focus, labels, settings and recovery. Run fast unit/type/build checks and the critical local desktop/mobile browser flows, including Pages subpath, with no browser installation in CI. Confirm all 37 IDs, six legacy scores and v1/full backups remain compatible. Record candidate SHA and checks in the implementation PR and obtain a fresh independent task review. The initial design-only candidate did not provide after screenshots; the linked implementation evidence records the subsequent runtime validation.
