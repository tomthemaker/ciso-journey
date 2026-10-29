# UI harmonization — #86

2026-10-29. The approved D031/D033 reader supplies the palette and type: paper `#eae6dd` / `#f6f3ec`, ink `#252b30`, action `#234f69`, with dark canvas `#182126` / surface `#222d32` and action `#9acde0`. Source Serif 4 carries reading and headings; system sans carries controls. This extends the existing theme rather than introducing a new visual identity.

The shared header is compact across routes. The previous dashboard stays available as “Study overview”; navigation, storage status and backup controls remain available. Roadmap retains its phase/task sequence, with quieter resource disclosures and a naturally sized supporting sidebar. Questions and cases share the reader's measure and spacing; forms, borders and controls use the same theme variables. On narrow screens navigation wraps so the selected section remains visible. All content and progress signals remain distinct.

```text
Desktop:  identity / appearance / backups
          storage status / overview disclosure
          navigation
          primary work column        supporting context
Mobile:   identity / controls
          status / overview / wrapped navigation
          work column
          supporting context
```

Synthetic empty-storage screenshots captured locally in Chromium before and after (viewport crops): [desktop Roadmap before](ui-harmonization/before-desktop.png), [after](ui-harmonization/after-desktop.png); [dark mobile Questions before](ui-harmonization/before-mobile.png), [after](ui-harmonization/after-mobile.png). Additional full-page captures for all ten routes at 1440×900 and 390×844 in both color schemes, and 390px plus 200% CSS zoom at 720px, were captured locally in `/private/tmp/ciso-ui-evidence/`; representative views were visually inspected and contain no learner data. Page scroll width equaled viewport width for each route, theme and reflow size. The zoom check simulates 200% using CSS zoom rather than browser UI zoom; the existing browser suite also tests reader reflow at 200%.

Validation: `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:browser` locally with Node 24 and cached Chromium. The first browser run passed 87/90; three tests timed out under full parallel load. A two-worker rerun of preservation and storage passed 22/22, including all three timed-out tests. The suite covers desktop/mobile Pages subpath, keyboard, review, storage/backup and progress separation flows; see PR for the exact candidate. CI remains fast. An independent task review is still required; this is not an educator/legal review.
