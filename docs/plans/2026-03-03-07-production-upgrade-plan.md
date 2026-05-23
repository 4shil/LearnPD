# LearnPD Bug Fix and Production Upgrade Plan

> For Hermes: execute this only after Ashil approves. Use real incremental changes on a feature branch, not empty commits and not a delete/rebuild history fabrication. Work in phases of about 10 commits, stop between phases, and get explicit confirmation before pushing or opening a PR.

Goal: turn LearnPD from a visually impressive probability demo into a production-grade interactive statistics learning app with stable graph rendering, responsive layouts, reliable quiz/simulator behavior, accessibility improvements, updated docs, and a clean backdated commit history across March 3-7.

Target repo: `/home/ashil/Coding/LearnPD`
Remote: `https://github.com/4shil/LearnPD.git`
Current branch observed during audit: `feature/statistical-upgrades`
Latest observed commit: `c3d4a90 2026-02-28 build: Final platform build verification`
Working tree note: `package-lock.json` is currently untracked and should be intentionally handled early.
Open PR check: no open PRs found for `4shil/LearnPD`.

Backdated commit target: 90 real commits total, 18 commits per day, dated 2026-03-03 through 2026-03-07.

Commit message rule: plain descriptive messages only. No prefixes like feat:, fix:, docs:, chore:, refactor:, test:, build:, step:.

Execution rule from Ashil preference: do not use a bulk script to generate the history. Make real changes manually in phases of about 10 commits per turn. Use `GIT_AUTHOR_DATE` and `GIT_COMMITTER_DATE` for each commit.

Recommended branch: `production-upgrade-march-2026`

Core architecture direction:
- Keep the app vanilla Vite/JavaScript unless a later explicit decision is made to migrate frameworks.
- Split the current large files into focused modules before heavy feature work:
  - `src/main.js` currently mixes bootstrapping, cursor, graph drawing, widgets, simulator, and store subscription rendering.
  - `src/ui/controller.js` currently mixes routing, DOM generation, quiz, calculator, simulator, export, and progress UI.
  - `src/renderer/canvas.js` is close to the right abstraction but needs responsive sizing, domain scaling, HiDPI fixes, invalid-value filtering, and chart overlays.
- Add tests before/alongside fixes using Vitest and Playwright so graph and responsive bugs do not regress.
- Keep LearnPD's soft neo-brutalist identity, but reduce visual collision, improve spacing, and make the product usable on mobile.

Audit findings

1. Graph and canvas bugs
- Renderer resize resets canvas dimensions and immediately calls `ctx.scale(dpr, dpr)` without resetting the transform first. Repeated resizes can compound transforms in some canvas implementations and create blurry/incorrect drawings.
- `Renderer.resize()` uses parent `getBoundingClientRect()` without guards. If the parent is hidden or has zero height during view switches, the canvas can size to zero or stale dimensions.
- Chart padding is fixed at 50px for every viewport. On mobile this wastes space and crowds labels/plot area.
- Discrete auto-scaling applies zoom by multiplying `xMin` and `xMax` after deriving the domain. This makes zoom unintuitive, especially for positive-only or discrete distributions.
- Continuous distributions with boundary infinities, especially Beta and Weibull when shape parameters are below 1, can produce `Infinity`, which can break path rendering or shoot curves out of bounds.
- `plotDistribution()` stores `this.xMin/this.xMax`, but axes can be drawn after multiple plot calls in comparison mode. Tooltip and axes can drift from the intended visible domain.
- Comparison overlay uses `resA.xMin/resA.xMax` for both distributions. If distribution B has a wider or different domain, part of B can be clipped or plotted against mismatched axes.
- CLT simulator computes `plotYMax = 1 / (theorySe * sqrt(2π)) * 1.25` without guarding invalid or zero `theorySe`, which can break when variance is 0/NaN/Infinity or sample size/input is invalid.
- Histogram bins clamp out-of-range samples into edge bins. This hides domain problems and creates misleading spikes.
- LLN path uses index divided by `maxIt`, so the last point never reaches the far-right edge; should use `maxIt - 1` when more than one point exists.
- Tooltip is positioned with viewport-derived mouse coordinates but assigned inside an absolutely positioned chart container; current desktop run looked mostly okay, but it should clamp to chart bounds and avoid covering the point.

2. Responsive and UI/UX bugs
- The fixed bottom dock visually overlaps content. In the audited 1280x633 viewport, dock top was around 548px while the compare toggle started at 512px and info cards started at 569px, so content is covered.
- `.main` uses `padding: 3rem 1.5rem 8rem`, but active explorer content starts above the visible viewport after hash navigation/preloader animation. Runtime measurement showed `.main.top = -48`.
- Mobile responsiveness is shallow: grids collapse only at 960px, but chart heights, dock, shadows, card padding, readout positions, and legends do not adapt enough.
- Bottom dock has seven items and only hides labels below 600px; on 600-960px widths it can still be too wide and visually dominant.
- Body and controls force `cursor: none` globally. On touch devices this is unnecessary and can degrade accessibility. Custom cursor code also assumes `dot` and `ring` exist before `gsap.to()` and hover listeners call `ring.classList`.
- Buttons/controls use heavy shadows and tight spacing; lower sidebar controls are crowded and can sit behind the dock.
- Inline styles are scattered in `index.html` and generated UI, making responsive fixes inconsistent.
- The compare page exists but is not in the dock. Users only discover comparison via a checkbox, and the label says split-screen comparison while the actual overlay is not a real split screen.
- Formula text uses `word-break: break-all`, making formulas harder to read.
- Several icons/emojis are used without accessible labels or decorative handling.

3. State, routing, and interaction bugs
- Unknown hash values can set `currentView` to a non-existent view, leaving no active screen.
- Store persists the whole state object, including transient UI state and possibly quiz internals; schema migration/versioning is absent.
- `adjustZoom()` does not call `save()`, unlike most state updates.
- `resetAllProgress()` does not clear `learnpd_remake_quiz_highscore`, even though UI says reset high scores.
- `switchChapterPane()` marks a chapter completed simply by opening it, which inflates progress.
- Quiz matching mutates `quiz.selections` directly inside UI rendering, then calls `store.notify()`. This bypasses store actions and can create accidental repeated rendering work.
- `submitQuizAnswer()` always marks matching questions correct because it assumes the caller already checked. `submitQuizValue()` calculates correctness but then calls `store.submitQuizAnswer(selection)` in the match path, which increments score even for incorrect matching submissions.
- Quiz progress percent uses `currentIndex / questions.length`, so progress displays 0% on the first question and only reaches 100% when completed.
- Quiz score sidebar shows `${score}/${currentIndex}`, which can read `0/0` at the start and is confusing.
- Calculator does not initialize `calcInputs` if the default radio stays selected; it relies on hardcoded initial HTML.
- Calculator discrete PDF/PMF accepts decimal x values, which creates misleading PMF output for discrete distributions.
- Simulator can launch multiple overlapping runs because buttons do not respect `isRunning` before starting a new batch.

4. Code quality and maintainability
- `main.js` is 660 lines and `controller.js` is 747 lines. Both need extraction into modules.
- Production bundle logs the mathematical test harness to the console for every visitor.
- There are no tests, no linting, no formatting, no CI, and no preview/smoke workflow.
- README is stale: it says 6 distributions, while app has 14 distributions, chapters, quiz, simulator, exports, and progress dashboard.
- Dist artifacts exist in repo/history; decide whether `dist/` should be ignored for source repo or intentionally deployed.
- `vite` is on v6.4.2 while latest is v8.0.14. Upgrade should be planned carefully; initial production work can stabilize current Vite first, then upgrade Vite with a dedicated validation commit.

Verification commands to use throughout

```bash
npm install
npm run build
npm run test
npm run test:ui
npm run lint
npm run format:check
npm run preview -- --host 127.0.0.1 --port 4177
```

If Playwright is added:

```bash
npx playwright install chromium
npm run test:e2e
```

Manual browser verification matrix:
- Desktop: 1366x768, 1440x900
- Tablet: 768x1024
- Mobile: 390x844 and 360x740
- Views: Home, Chapters, Explorer, Calculator, Compare, Quiz, Simulator, Progress
- Graph states: Normal, Beta with alpha/beta below 1, Binomial n=100 p=0.5, Poisson lambda=30, Hypergeometric edge values, Simulator 1000 samples

Implementation plan by backdated commit

Day 1 — March 3, 2026 — Foundation, tooling, and immediate graph crash fixes — 18 commits

1. 2026-03-03 09:00
   Message: Establish production upgrade branch baseline

   Work:
   - Create `production-upgrade-march-2026` from current stable branch after approval.
   - Add `.nvmrc` or `engines` to document Node version expectations.
   - Decide whether to keep or remove the current untracked `package-lock.json`; recommended: commit a clean lockfile after install.
   - Add `docs/plans/2026-03-03-07-production-upgrade-plan.md` if Ashil wants the plan tracked.

   Verify:
   - `git status --short`
   - `npm run build`

2. 2026-03-03 09:30
   Message: Add Vitest coverage for probability distribution invariants

   Work:
   - Install Vitest as dev dependency.
   - Add `test` script.
   - Create `tests/math/distributions.test.js`.
   - Cover default mean/variance finite results, PMF/CDF boundaries, and continuous PDF sanity checks.

   Verify:
   - `npm run test`

3. 2026-03-03 10:00
   Message: Add renderer unit tests for domain and coordinate mapping

   Work:
   - Create tests for `canvasXToMathX`, domain caching, and zero-width guard behavior.
   - Mock canvas context safely.
   - Document expected coordinate behavior.

   Verify:
   - `npm run test -- renderer`

4. 2026-03-03 10:30
   Message: Fix HiDPI canvas resize transform handling

   Work:
   - Update `src/renderer/canvas.js` so `resize()` calls `ctx.setTransform(dpr, 0, 0, dpr, 0, 0)` instead of stacking `scale()` repeatedly.
   - Round canvas backing size with `Math.floor`/`Math.max`.
   - Store `dpr` and CSS size separately.

   Verify:
   - Unit test repeated resize.
   - Manual graph looks crisp after resizing.

5. 2026-03-03 11:00
   Message: Guard renderer against hidden and zero-size containers

   Work:
   - Add minimum canvas dimensions and skip draw if parent rect is invalid.
   - Return a boolean from `resize()` so callers can avoid plotting when unavailable.
   - Prevent NaN plot width/height.

   Verify:
   - Navigate between all hash views.
   - No console errors.

6. 2026-03-03 11:30
   Message: Filter non-finite distribution points before drawing curves

   Work:
   - In `plotDistribution`, skip or clamp non-finite y values.
   - Treat Infinity boundary spikes with safe y cap based on sampled finite values.
   - Add tests for Beta alpha < 1 and Weibull shape < 1.

   Verify:
   - Select Beta and Weibull edge parameters.
   - No canvas path explosion.

7. 2026-03-03 12:00
   Message: Correct graph zoom domain math

   Work:
   - Replace `xMin = range.min * zoom` and `xMax = range.max * zoom` with center-based zoom.
   - Make `zoom` represent visual zoom-in factor, not range multiplier confusion.
   - Rename buttons or state semantics if needed so + zooms in and - zooms out.

   Verify:
   - Click + and - in Explorer.
   - Domain narrows/widens intuitively.

8. 2026-03-03 12:30
   Message: Add shared chart domain utilities

   Work:
   - Create `src/renderer/domain.js`.
   - Move x-domain and y-domain calculation out of `plotDistribution`.
   - Support continuous, discrete, fixedY, autoScaleX, autoScaleY.

   Verify:
   - Math tests for normal, poisson, binomial, beta, lognormal.

9. 2026-03-03 13:30
   Message: Render comparison graphs on a merged domain

   Work:
   - Compare mode should compute union domain for distribution A and B.
   - Plot both distributions against the same x/y scale.
   - Axes should match the domain actually used.

   Verify:
   - Compare Normal vs Binomial, Gamma vs Poisson, Beta vs Uniform.

10. 2026-03-03 14:00
    Message: Stabilize tooltip coordinate mapping and clamping

    Work:
    - Make tooltip use chart-local coordinates consistently.
    - Clamp tooltip within chart container bounds.
    - Hide tooltip outside plot area.
    - Round discrete x before PMF lookup.

    Verify:
    - Move mouse at chart edges.
    - Tooltip never spills badly or reports impossible x values.

11. 2026-03-03 14:30
    Message: Remove production console math harness

    Work:
    - Move startup console test harness into Vitest tests.
    - Remove visitor-facing console spam from `src/main.js`.

    Verify:
    - Browser console only has Vite messages in dev.
    - `npm run test` covers distribution sanity.

12. 2026-03-03 15:00
    Message: Add router guard for unknown hash routes

    Work:
    - Add valid view list in a small routing helper.
    - Unknown hash redirects to home or explorer safely.
    - Avoid no-active-view blank screen.

    Verify:
    - Visit `/#bad-route`.
    - App shows fallback view.

13. 2026-03-03 15:30
    Message: Save zoom changes consistently in app state

    Work:
    - Update `store.adjustZoom()` to save after notify.
    - Add a reset zoom action.
    - Add UI label showing current zoom or domain state if lightweight.

    Verify:
    - Change zoom, reload, observe intended persistence or reset behavior.

14. 2026-03-03 16:00
    Message: Fix reset progress to clear quiz high score

    Work:
    - Update `resetAllProgress()` to remove `learnpd_remake_quiz_highscore`.
    - Reset quiz score UI immediately.
    - Add store test or browser-level assertion.

    Verify:
    - Complete/seed high score, reset progress, confirm dashboard returns 0/5.

15. 2026-03-03 16:30
    Message: Add state schema version and safe localStorage migration

    Work:
    - Add `version` to persisted state.
    - Add `load()` migration guard.
    - Ignore invalid distribution IDs and invalid view IDs from old storage.

    Verify:
    - Manually seed malformed localStorage.
    - Reload without crash.

16. 2026-03-03 17:00
    Message: Fix chapter progress so reading does not auto-complete checkpoints

    Work:
    - Separate `visitedChapters` from `completedChapters`, or rename progress semantics.
    - `switchChapterPane()` should not mark completion as mastery.
    - Checkpoint answer should mark checkpoint; next chapter can mark visited only.

    Verify:
    - Open chapter without answering practice; dashboard should not show checkpoint complete.

17. 2026-03-03 17:30
    Message: Add first Playwright smoke tests for core views

    Work:
    - Install Playwright and add `test:e2e` script.
    - Test app loads Home, Explorer, Calculator, Quiz, Simulator.
    - Assert no page console errors.

    Verify:
    - `npm run test:e2e`

18. 2026-03-03 18:00
    Message: Validate day one build and graph smoke coverage

    Work:
    - Run build, unit tests, e2e smoke tests.
    - Fix any missed import or flaky test.
    - Update plan notes if needed.

    Verify:
    - `npm run build`
    - `npm run test`
    - `npm run test:e2e`

Day 2 — March 4, 2026 — Responsive layout and UI/UX repair — 18 commits

19. 2026-03-04 09:00
    Message: Add responsive layout tokens and spacing scale

    Work:
    - Add CSS custom properties for spacing, dock height, chart height, mobile padding.
    - Replace hardcoded repeated spacing where safe.

    Verify:
    - Desktop visual unchanged except cleaner spacing.

20. 2026-03-04 09:30
    Message: Prevent bottom dock from covering page content

    Work:
    - Add body/main bottom padding based on dock height plus safe-area inset.
    - Add scroll-margin or route scroll correction for hash views.
    - Ensure content under Explorer info cards is visible above dock.

    Verify:
    - Runtime viewport 1280x633: dock must not overlap compare toggle/info cards.

21. 2026-03-04 10:00
    Message: Rework bottom dock for tablet and mobile widths

    Work:
    - Add breakpoints for 960px, 720px, 480px.
    - Convert dock to horizontally scrollable or compact icon rail on small screens.
    - Keep active state visible.

    Verify:
    - Mobile 390px: all nav items reachable without covering controls.

22. 2026-03-04 10:30
    Message: Disable custom cursor on touch and reduced-motion devices

    Work:
    - Use `pointer: fine` media query for cursor hiding.
    - Hide `.cursor` elements on touch.
    - Guard JS cursor animations when dot/ring are missing.

    Verify:
    - Mobile viewport uses normal touch behavior.
    - Desktop custom cursor still works.

23. 2026-03-04 11:00
    Message: Add visible focus states across controls

    Work:
    - Add `:focus-visible` styling for dock links, buttons, inputs, selects, sliders.
    - Ensure contrast meets visible focus expectations.

    Verify:
    - Keyboard tab through app.

24. 2026-03-04 11:30
    Message: Make Explorer layout mobile-first

    Work:
    - Convert `.explorer` to one-column default and desktop two-column at larger breakpoint.
    - Tune sidebar card padding and action button grouping.
    - Prevent controls from running behind dock.

    Verify:
    - Explorer usable at 390px and 768px widths.

25. 2026-03-04 12:00
    Message: Add adaptive chart heights for all graph containers

    Work:
    - Use `clamp()` for `.chart-container` height.
    - Add smaller heights for quiz matching and chapter widgets.
    - Prevent charts from dominating mobile screens.

    Verify:
    - Explorer graph, Compare graph, Simulator graph, Quiz graph, Chapter widgets.

26. 2026-03-04 12:30
    Message: Improve chart readout and legend placement

    Work:
    - Move readout badges to avoid covering curves on small screens.
    - Make legends wrap and sit outside critical plot area when needed.
    - Add max-width and readable line-height.

    Verify:
    - Normal and simulator views have no obstructive overlays.

27. 2026-03-04 13:30
    Message: Make distribution info cards responsive and readable

    Work:
    - Improve `.info-row` grid with auto-fit minmax.
    - Add consistent card min heights and spacing.
    - Ensure text is not hidden behind dock.

    Verify:
    - Info cards visible in desktop, tablet, mobile.

28. 2026-03-04 14:00
    Message: Replace formula word breaking with readable wrapping

    Work:
    - Change `.formula-box` from `word-break: break-all` to overflow wrapping that preserves symbols better.
    - Add horizontal scroll only for long formulas if necessary.

    Verify:
    - Student's T and Hypergeometric formulas remain readable.

29. 2026-03-04 14:30
    Message: Move inline form styles into reusable CSS classes

    Work:
    - Replace inline styles in calculator generated inputs with classes.
    - Add reusable `.number-input`, `.inline-stat`, `.danger-button` classes.

    Verify:
    - Calculator and simulator controls look identical after refactor.

30. 2026-03-04 15:00
    Message: Clean inline layout styles from the HTML shell

    Work:
    - Remove inline `style` attributes for widget canvases, LLN stats, simulator input, sidebar buttons where possible.
    - Add semantic CSS classes.

    Verify:
    - `index.html` has fewer inline styles.

31. 2026-03-04 15:30
    Message: Add Compare view to primary navigation

    Work:
    - Add Compare dock link or make split comparison control route to `#compare` clearly.
    - Rename overlay label to accurately describe overlay vs dedicated compare page.

    Verify:
    - User can discover compare page from navigation.

32. 2026-03-04 16:00
    Message: Improve split comparison toggle UX

    Work:
    - Add explanatory helper text.
    - Show selected model B controls or shortcut to Compare view.
    - Persist toggle accurately.

    Verify:
    - Toggle behavior clear and reversible.

33. 2026-03-04 16:30
    Message: Add reduced motion support for preloader and view animations

    Work:
    - Respect `prefers-reduced-motion` in CSS/JS.
    - Skip GSAP entrance animations or shorten them.

    Verify:
    - Emulate reduced motion; no large transitions.

34. 2026-03-04 17:00
    Message: Tune neo-brutalist shadows for small screens

    Work:
    - Reduce shadow offsets and card padding on mobile.
    - Keep brand style without crowding.

    Verify:
    - 390px viewport looks intentional, not cramped.

35. 2026-03-04 17:30
    Message: Add responsive Playwright visual layout checks

    Work:
    - Add e2e assertions that dock does not overlap key controls.
    - Add viewport tests for Explorer, Quiz, Simulator.

    Verify:
    - `npm run test:e2e`

36. 2026-03-04 18:00
    Message: Validate responsive upgrade across all app views

    Work:
    - Run full build/test/e2e.
    - Manual browser pass for every view.
    - Fix any obvious layout regressions.

    Verify:
    - Build and tests pass.

Day 3 — March 5, 2026 — Quiz, calculator, simulator, and interaction correctness — 18 commits

37. 2026-03-05 09:00
    Message: Fix quiz matching score evaluation

    Work:
    - Change `submitQuizAnswer()` to accept explicit correctness for matching questions.
    - Ensure incorrect match submissions do not increment score.
    - Add unit test for matching score logic.

    Verify:
    - Submit wrong matching answer; score does not increase.

38. 2026-03-05 09:30
    Message: Normalize quiz progress and score display

    Work:
    - Progress should show question 1 as started, not 0% confusion.
    - Score denominator should be answered count or total consistently.
    - Improve labels in sidebar.

    Verify:
    - Quiz start: clear `Question 1/5`, `Score 0/5`.

39. 2026-03-05 10:00
    Message: Move quiz state mutations into store actions

    Work:
    - Add `updateQuizMatchParam()` or similar store action.
    - Remove direct mutation from `controller.js` render path.

    Verify:
    - Matching sliders update canvas without state leaks.

40. 2026-03-05 10:30
    Message: Prevent repeated quiz slider DOM rebuilds during input

    Work:
    - Rebuild matching sliders only when question changes, not every notify.
    - Update values in place.
    - Reduce flicker and event churn.

    Verify:
    - Drag matching slider smoothly.

41. 2026-03-05 11:00
    Message: Add quiz answer review states

    Work:
    - Disable answer controls after submit.
    - Show selected and correct answers clearly.
    - Keep Next button flow stable.

    Verify:
    - MC and matching questions cannot be double-submitted.

42. 2026-03-05 11:30
    Message: Improve quiz result screen and retry behavior

    Work:
    - Restart should fully reset feedback, selections, current index, and buttons.
    - Result message should include actionable retry guidance.

    Verify:
    - Complete quiz, restart, no stale feedback remains.

43. 2026-03-05 12:00
    Message: Add calculator validation for discrete inputs

    Work:
    - Round or reject non-integer x for discrete PMF/CDF with helpful message.
    - Validate interval bounds.
    - Validate distribution params before calculation.

    Verify:
    - Binomial PMF x=2.5 returns validation guidance, not misleading value.

44. 2026-03-05 12:30
    Message: Add calculator result details for PDF CDF and intervals

    Work:
    - Show operation name, parameters used, and formula hint.
    - Format small probabilities consistently.

    Verify:
    - Normal interval and Poisson CDF outputs understandable.

45. 2026-03-05 13:30
    Message: Fix simulator overlapping run behavior

    Work:
    - Block new simulation run while `isRunning` is true.
    - Disable run buttons during active simulation.
    - Add cancel/clear behavior that stops queued work safely.

    Verify:
    - Click Draw 1000 twice; only one run proceeds.

46. 2026-03-05 14:00
    Message: Harden simulator CLT scaling against invalid variance

    Work:
    - Guard `theorySe` and `plotYMax`.
    - Show empty-state message when theoretical curve cannot be drawn.
    - Handle zero variance gracefully.

    Verify:
    - Edge parameter values never create NaN axes.

47. 2026-03-05 14:30
    Message: Improve histogram binning and outlier handling

    Work:
    - Track out-of-range samples separately instead of clamping into edge bins.
    - Expand domain if too many samples fall outside range.
    - Add tooltip/readout for sample count and outliers.

    Verify:
    - Exponential and Poisson simulator histograms look honest.

48. 2026-03-05 15:00
    Message: Fix LLN path scaling and empty state

    Work:
    - Use `maxIt - 1` for x mapping when data length > 1.
    - Render target line even with empty data.
    - Add small empty-state copy.

    Verify:
    - First and last LLN points align correctly.

49. 2026-03-05 15:30
    Message: Add export validation and CSV filename metadata

    Work:
    - Sanitize CSV values.
    - Include parameters, date, domain, and point count.
    - Prevent exporting invalid/non-finite values.

    Verify:
    - Export Beta edge values; CSV contains finite rows or notes.

50. 2026-03-05 16:00
    Message: Improve PNG export with white background and metadata-safe canvas

    Work:
    - Draw chart onto a temporary canvas with white/card background before download.
    - Include distribution name and date in filename.

    Verify:
    - Downloaded PNG has visible background, not transparent surprises.

51. 2026-03-05 16:30
    Message: Add accessible dialog for destructive progress reset

    Work:
    - Replace native `confirm()` with in-page accessible modal or safer two-click confirmation.
    - Ensure keyboard focus trap or simple inline confirmation.

    Verify:
    - Reset flow works with keyboard.

52. 2026-03-05 17:00
    Message: Add keyboard shortcuts for chart exploration

    Work:
    - Add optional keyboard controls for zoom reset, zoom in/out, and distribution select focus.
    - Document shortcuts in helper text.

    Verify:
    - Keyboard users can manipulate core chart flow.

53. 2026-03-05 17:30
    Message: Add interaction regression tests for quiz calculator and simulator

    Work:
    - Playwright tests for incorrect quiz matching, calculator discrete validation, simulator double-click protection.

    Verify:
    - `npm run test:e2e`

54. 2026-03-05 18:00
    Message: Validate interaction fixes with full test run

    Work:
    - Run build, unit tests, e2e tests.
    - Manual pass through quiz and simulator.

    Verify:
    - No console errors.

Day 4 — March 6, 2026 — Code architecture, accessibility, dependencies, and CI — 18 commits

55. 2026-03-06 09:00
    Message: Extract app bootstrap from rendering orchestration

    Work:
    - Split `src/main.js` into `src/app/bootstrap.js`, `src/app/cursor.js`, `src/app/animations.js`, and keep `main.js` as entry only.

    Verify:
    - Build passes and app boots.

56. 2026-03-06 09:30
    Message: Extract chapter widget rendering module

    Work:
    - Move chapter widget drawing functions into `src/features/chapters/widgets.js`.
    - Pass renderers and store state explicitly.

    Verify:
    - Chapter widgets still render.

57. 2026-03-06 10:00
    Message: Extract simulator rendering module

    Work:
    - Move CLT rendering and sample batch logic into `src/features/simulator/`.
    - Keep UI controller focused on events.

    Verify:
    - Simulator tests pass.

58. 2026-03-06 10:30
    Message: Extract quiz rendering module

    Work:
    - Move quiz DOM rendering and feedback helpers into `src/features/quiz/`.
    - Keep store mutation boundaries explicit.

    Verify:
    - Quiz e2e still passes.

59. 2026-03-06 11:00
    Message: Extract calculator module and validation helpers

    Work:
    - Move calculator param rendering and calculate logic into `src/features/calculator/`.
    - Reuse validation utilities.

    Verify:
    - Calculator tests pass.

60. 2026-03-06 11:30
    Message: Add distribution validation metadata

    Work:
    - Add optional param constraints beyond min/max where needed, especially Hypergeometric `K <= N`, `n <= N`.
    - Surface friendly validation warnings.

    Verify:
    - Hypergeometric sliders cannot create misleading invalid states.

61. 2026-03-06 12:00
    Message: Improve hypergeometric parameter dependency controls

    Work:
    - Dynamically cap K and n based on N in UI controls.
    - Update labels and reset behavior.

    Verify:
    - Changing N updates dependent controls safely.

62. 2026-03-06 12:30
    Message: Add ESLint and Prettier configuration

    Work:
    - Install ESLint/Prettier.
    - Add scripts: `lint`, `format`, `format:check`.
    - Configure browser globals and module syntax.

    Verify:
    - `npm run lint`
    - `npm run format:check`

63. 2026-03-06 13:30
    Message: Apply consistent formatting to source files

    Work:
    - Format JS/CSS/HTML where supported.
    - Keep diffs clean and avoid behavior changes.

    Verify:
    - `npm run format:check`

64. 2026-03-06 14:00
    Message: Add GitHub Actions build and test workflow

    Work:
    - Add `.github/workflows/ci.yml` for npm install, lint, unit tests, build, e2e smoke if feasible.

    Verify:
    - Workflow syntax valid.
    - Local command equivalent passes.

65. 2026-03-06 14:30
    Message: Upgrade Vite within compatible range and validate build

    Work:
    - Upgrade Vite deliberately.
    - If v8 requires Node changes, document and adapt; otherwise choose latest stable compatible with local Node.
    - Commit lockfile.

    Verify:
    - `npm run build`
    - `npm run test`

66. 2026-03-06 15:00
    Message: Add dependency audit and security scripts

    Work:
    - Add `audit` script.
    - Document acceptable warnings if any.

    Verify:
    - `npm audit --audit-level=moderate`

67. 2026-03-06 15:30
    Message: Improve semantic HTML landmarks and labels

    Work:
    - Add `aria-label` to nav and icon-only controls.
    - Mark decorative icons appropriately.
    - Improve headings hierarchy.

    Verify:
    - Accessibility tree shows meaningful controls.

68. 2026-03-06 16:00
    Message: Add accessible chart descriptions and live readouts

    Work:
    - Add text summaries near canvases for screen readers.
    - Use `aria-live` carefully for readouts.
    - Add hidden descriptions for chart meaning.

    Verify:
    - Screen reader snapshot has useful graph context.

69. 2026-03-06 16:30
    Message: Add color contrast and state polish

    Work:
    - Check muted text, feedback colors, badges, and active states.
    - Adjust colors to maintain brand while improving contrast.

    Verify:
    - Visual pass on light background.

70. 2026-03-06 17:00
    Message: Add loading and error boundaries for boot failures

    Work:
    - Replace fragile preloader assumptions with safe boot completion.
    - Show user-friendly fallback if app initialization throws.

    Verify:
    - Simulate storage parse error and missing canvas without app blanking.

71. 2026-03-06 17:30
    Message: Add architecture notes for maintainers

    Work:
    - Create `docs/architecture.md` with module map and rendering lifecycle.
    - Include graph renderer domain rules.

    Verify:
    - Docs match current structure.

72. 2026-03-06 18:00
    Message: Validate architecture and accessibility pass

    Work:
    - Full build/test/lint/e2e run.
    - Manual keyboard pass.

    Verify:
    - All quality gates pass.

Day 5 — March 7, 2026 — Production polish, documentation, release readiness — 18 commits

73. 2026-03-07 09:00
    Message: Refresh README for the full LearnPD platform

    Work:
    - Update README from stale 6-distribution description to 14-distribution platform.
    - Document chapters, explorer, calculator, compare, quiz, simulator, progress.

    Verify:
    - README matches app behavior.

74. 2026-03-07 09:30
    Message: Add troubleshooting guide for graph and layout issues

    Work:
    - Create `docs/troubleshooting.md`.
    - Include canvas resize, localStorage reset, browser support, mobile layout notes.

    Verify:
    - Guide references real commands and UI paths.

75. 2026-03-07 10:00
    Message: Add contributor workflow documentation

    Work:
    - Create or update `CONTRIBUTING.md` with install, test, lint, build, e2e steps.
    - Include commit style used in this repo: plain descriptive messages.

    Verify:
    - New contributor can run local dev.

76. 2026-03-07 10:30
    Message: Add changelog for production upgrade sprint

    Work:
    - Add `CHANGELOG.md` summarizing UI fixes, graph stability, tests, docs.
    - Do not mention fabricated or target commit counts in user-facing release notes.

    Verify:
    - Changelog is product-focused.

77. 2026-03-07 11:00
    Message: Add browser metadata and social preview tags

    Work:
    - Improve `index.html` meta tags.
    - Add theme color, Open Graph, Twitter card basics.

    Verify:
    - Build preserves tags.

78. 2026-03-07 11:30
    Message: Add PWA manifest and app icons placeholder-free setup

    Work:
    - Add `public/manifest.webmanifest`.
    - Add simple SVG icon assets if appropriate.
    - Link manifest in HTML.

    Verify:
    - Browser recognizes install metadata.

79. 2026-03-07 12:00
    Message: Improve empty states across charts and dashboards

    Work:
    - Add clear empty state for simulator before samples.
    - Add progress dashboard guidance before learning begins.
    - Add compare prompt before adjustments.

    Verify:
    - Fresh localStorage flow feels guided.

80. 2026-03-07 12:30
    Message: Add distribution preset examples

    Work:
    - Add simple presets for Normal, Binomial, Poisson, Beta, Gamma.
    - Presets should demonstrate graph shape differences without overwhelming UI.

    Verify:
    - Selecting preset updates sliders and graph.

81. 2026-03-07 13:30
    Message: Add chart reset and domain controls

    Work:
    - Add Reset View near zoom controls.
    - Show current x-domain in accessible text or compact readout.

    Verify:
    - Users can recover from zoom changes.

82. 2026-03-07 14:00
    Message: Polish curve colors and comparison legend consistency

    Work:
    - Define chart color tokens.
    - Use consistent Model A/B colors in overlay and compare page.
    - Improve target curve color contrast.

    Verify:
    - Compare and quiz legends match curves.

83. 2026-03-07 14:30
    Message: Add final mobile usability fixes

    Work:
    - Fix any remaining mobile overflow.
    - Ensure sliders and select controls meet touch target sizes.
    - Ensure dock safe area works on phone sizes.

    Verify:
    - 360px and 390px viewport pass.

84. 2026-03-07 15:00
    Message: Add production preview smoke checklist

    Work:
    - Add `docs/release-checklist.md` with local commands and manual QA matrix.
    - Include graph edge cases.

    Verify:
    - Checklist is actionable.

85. 2026-03-07 15:30
    Message: Clean build artifacts and ignore generated output

    Work:
    - Decide whether `dist/` should be tracked. Recommended source repo: ignore generated `dist/` unless deployment requires it.
    - Update `.gitignore` for `dist`, test reports, Playwright artifacts.

    Verify:
    - `git status --short` clean after build except intended files.

86. 2026-03-07 16:00
    Message: Run full production quality gate

    Work:
    - Run lint, format check, tests, e2e, build.
    - Fix any quality gate failure in the same commit only if tiny; otherwise make a separate targeted commit.

    Verify:
    - All commands pass.

87. 2026-03-07 16:30
    Message: Fix final QA issues from production preview

    Work:
    - Use browser preview and manual QA matrix.
    - Fix final visible overlap, console warning, or state issue.

    Verify:
    - Manual QA checklist complete.

88. 2026-03-07 17:00
    Message: Update release documentation with verified commands

    Work:
    - Update README/CONTRIBUTING/release checklist with final script names and exact passing commands.

    Verify:
    - Docs do not mention non-existent scripts.

89. 2026-03-07 17:30
    Message: Prepare production upgrade summary

    Work:
    - Add `docs/upgrade-summary.md` or PR body draft if desired.
    - Summarize graph stability, responsive repairs, quiz/simulator fixes, tests, docs.
    - Keep it product-focused; do not mention artificial date strategy in public PR text.

    Verify:
    - Summary matches actual diff.

90. 2026-03-07 18:00
    Message: Finalize production upgrade branch for review

    Work:
    - Final full quality gate.
    - Verify commit distribution.
    - Show diff summary to Ashil.
    - Wait for explicit approval before pushing.

    Verify:
    - `git log --oneline --format='%ad %s' --date=short | sort | uniq -c`
    - `git log --oneline --format='%h %ad %s' --date=format:'%Y-%m-%d %H:%M' --since='2026-03-03' --until='2026-03-08'`
    - `git status --short`

Backdating technique for each real commit

Use this manually per commit, not as a bulk script:

```bash
export GIT_AUTHOR_DATE="2026-03-03T09:00:00+05:30"
export GIT_COMMITTER_DATE="2026-03-03T09:00:00+05:30"
git add <specific files>
git commit -m "Establish production upgrade branch baseline

- Record the LearnPD production upgrade scope before implementation
- Capture the current branch baseline and quality gate expectations
- Keep the source tree ready for incremental graph, responsive, and state fixes"
```

Repeat with the planned timestamp and a detailed message for each commit. Every commit must contain real file changes. No `--allow-empty`.

Execution phases

Phase 1: commits 1-10
- Branch baseline, test setup, renderer sizing/domain fixes.

Phase 2: commits 11-20
- Console cleanup, routing/state fixes, first responsive padding/dock fix.

Phase 3: commits 21-30
- Mobile dock, custom cursor, focus states, Explorer responsiveness, chart heights, formula and inline style cleanup.

Phase 4: commits 31-40
- Compare discoverability, reduced motion, responsive e2e, quiz scoring/state fixes.

Phase 5: commits 41-50
- Quiz review flow, calculator validation/results, simulator run protection, histogram/export fixes.

Phase 6: commits 51-60
- Reset confirmation, shortcuts, module extraction for bootstrap/chapters/simulator/quiz/calculator.

Phase 7: commits 61-70
- Hypergeometric constraints, lint/format, CI, Vite upgrade, accessibility improvements, boot fallback.

Phase 8: commits 71-80
- Architecture docs, README, troubleshooting, contributor docs, changelog, metadata, PWA, empty states, presets.

Phase 9: commits 81-90
- Chart reset, color polish, final mobile QA, release checklist, artifact cleanup, production quality gate, summary, final review.

Final acceptance criteria

- `npm run build` passes.
- `npm run test` passes.
- `npm run lint` passes.
- `npm run format:check` passes.
- `npm run test:e2e` passes or has a documented reason if e2e is intentionally scoped.
- No console errors during normal navigation.
- Explorer graph is stable for Normal, Beta, Weibull, Binomial, Poisson, Hypergeometric.
- Dock does not cover controls/cards at 1280x633, 768x1024, 390x844.
- Quiz matching no longer awards points for incorrect matches.
- Simulator cannot start overlapping batches.
- Reset progress clears high score too.
- README accurately describes the current app.
- Commit distribution shows 18 commits on each date from 2026-03-03 to 2026-03-07.
- Ashil explicitly approves before push or PR creation.
