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

Synthetic empty-storage evidence: historical before viewport crops show [desktop Roadmap](ui-harmonization/before-desktop.png) and [dark mobile Questions](ui-harmonization/before-mobile.png). The refreshed after captures show light Roadmap from the top at [1440×900 desktop](ui-harmonization/after-desktop.png) and [390×844 mobile](ui-harmonization/after-mobile.png); they are different route/theme comparisons from the mobile before image. Both after images were reproduced on 2026-10-29 from runtime candidate `1e4e450ff19c77691ce04133f82d427a9b335bc4` using a separate Vite server at `127.0.0.1:5177/ciso-journey/#roadmap`, Chromium, device scale 1, system appearance resolving to light, and fresh empty browser contexts. Source Serif 4 was explicitly loaded and its font-face status confirmed as loaded before capture. Visual inspection confirms paper surfaces, selected Roadmap, all ten navigation labels visible, and three wrapped mobile navigation rows. Scroll width equals viewport width at both sizes. These replace the earlier scrolled after crops and directly show final navigation.

Additional full-page captures for all ten routes at 1440×900 and 390×844 in both color schemes, and 390px plus 200% CSS zoom at 720px, were captured locally in `/private/tmp/ciso-ui-evidence/`; representative views were visually inspected and contain no learner data. Page scroll width equaled viewport width for each route, theme and reflow size. The zoom check simulates 200% using CSS zoom rather than browser UI zoom; the existing browser suite also tests reader reflow at 200%.

Original implementation validation (before independent review): `npm test`, `npm run typecheck`, `npm run build`, and `npm run test:browser` locally with Node 24 and cached Chromium. The first browser run passed 87/90; three tests timed out under full parallel load. A two-worker rerun of preservation and storage passed 22/22, including all three timed-out tests. The suite covers desktop/mobile Pages subpath, keyboard, review, storage/backup and progress separation flows; see PR for the exact candidate. CI remains fast. Final-candidate independent approval is still required; this is not an educator/legal review.

Evidence correction / D020 — 2026-10-29: only this guide and the two after PNGs change from `1e4e450ff19c77691ce04133f82d427a9b335bc4`. All tracked runtime/app files, canonical content/data, tests, fixtures, scripts, browser/build configuration, CI and dependency manifests/lockfile are byte-identical to that candidate. Reuse its [independent review evidence](https://github.com/tomthemaker/ciso-journey/pull/88#issuecomment-6488936158): 163 unit tests, typecheck, build and 90/90 local browser tests with two workers, including Pages. No full test/browser rerun was needed for this documentation-only correction; fresh capture checks and `git diff --check` passed. No product decision changed; D036 remains unchanged. The updated evidence still requires fresh independent task review.
