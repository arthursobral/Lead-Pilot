# LeadPilot — Day 7 Frontend Review

**Date:** 2026-07-02
**Reviewer:** Staff Engineer (AI agent)
**Scope:** Complete Day 7 frontend — architecture, design, UX, accessibility, responsiveness, motion, maintainability, constitution compliance, technical debt, and MVP readiness verdict.

---

## Summary

The Day 7 frontend is architecturally sound, visually coherent, and strongly aligned with the Product Vision and Engineering Constitution. The service/hook/component layering is clean, design tokens are consistent, and the AI framing throughout the UI respects the constitution's coaching-first principles.

**However: three API contract mismatches are confirmed runtime bugs that prevent the timeline, observations, and insights list views from rendering data correctly.** These are the only blocking issues for user testing. They are quick fixes (three service method signatures and response handlers). Everything else in this review is medium-to-low priority for the MVP.

---

## 1. Architecture

### Strengths

**Service/Hook/Component layering is well-designed.**
Every API call goes through `services/` → invoked only from `hooks/` → consumed only by components. No component calls `api.*` directly. This makes the data layer independently testable and easy to swap.

**TanStack Query v5 used correctly.**
- Query deduplication: `queryKey: ['developers', id]` means multiple components on the same page share one in-flight request.
- Cache invalidation on mutation: observations and timeline invalidated together on CRUD, which is correct since observations create timeline entries.
- `enabled: Boolean(id)` guards prevent empty-string fetches.
- `useState` for `QueryClient` in `QueryProvider` — correct for SSR (avoids shared singleton between users).

**Client-only data fetching is appropriate.**
All data fetching lives in client components with TanStack Query. This is correct for a single-user admin tool where auth will be JWT-based (Phase 2). Switching to Server Components + RSC streaming is a valid future upgrade but not needed for the MVP.

**`lib/api.ts` is clean.**
Single fetch wrapper with typed `ApiError`. Auth header is pre-wired as a comment for Phase 2. The `NEXT_PUBLIC_API_URL` env var is used correctly.

**`ContextBuilderService` debug panel follows React rules.**
Production guard placed after all hooks. `process.env.NODE_ENV` is a webpack build-time constant — dead-code eliminated in production bundles. Correct.

### Issues

**[BLOCKING] API contract mismatches — 3 service methods return wrong type.**

All three backend endpoints return paginated envelopes (`{data: T[], total, page, limit, totalPages}`) but the frontend services declare them as flat arrays `T[]`. TypeScript does not catch this because the type is explicitly cast via `api.get<T[]>()`. The runtime effect is that the hook receives an object where it expects an array, causing `[...entries].sort()` and `.filter()` to throw TypeErrors.

| Service method | Frontend type | Backend actual type |
|---|---|---|
| `timelineService.getByDeveloper` | `Promise<TimelineEntry[]>` | `PaginatedTimelineResponseDto` |
| `insightsService.getByDeveloper` | `Promise<Insight[]>` | `PaginatedInsightsResponseDto` |
| `observationsService.getByDeveloper` | `Promise<Observation[]>` | `PaginatedObservationsResponseDto` |

**Fix:** Update all three services to call with `?limit=100` (load all items) and unwrap `.data`, or implement proper pagination in the hooks. The simplest fix for the MVP is to unwrap `.data` and use a high limit to load all items.

**No ESLint config exists.**
`next lint` fails with "ESLint couldn't find an eslint.config file." There is no `.eslintrc.*` or `eslint.config.js`. The `package.json` `lint` script exists but the config does not. No linting is being enforced.

**`/developers/[id]/observations/page.tsx` uses Next.js 15 async params syntax on Next.js 14.**
The page types `params` as `Promise<{ id: string }>` and calls `use(params)`. This is the Next.js 15 pattern. In Next.js 14, `params` is synchronously `{ id: string }`. Using `use()` on a non-Promise object would throw at runtime because `use()` in React 18 only accepts Promises and Context objects. TSC passes because of `"skipLibCheck": true`.

**No frontend ADRs.**
Eight backend ADRs are documented. Zero frontend ADRs exist despite equivalent architectural decisions being made: client-only data fetching strategy, service/hook/component separation, TanStack Query as server-state manager, and the AI disclaimer as a persistent non-dismissible element. ADR-009 should document the frontend architecture.

---

## 2. Design

### Strengths

**Design token system is consistent and well-named.**
`shadow-card`, `shadow-card-hover`, `rounded-2xl`, `ease-out-quart` — all custom tokens are defined in `tailwind.config.ts` with clear intent. Stone palette throughout avoids the "analytics dashboard" feel.

**Content cap `max-w-content: 720px` is the right call.**
Forces a prose-width column that reads like a document, not a spreadsheet. This is architecturally correct for a coaching tool.

**Linear-style sidebar is correctly implemented.**
Fixed left nav, white background, single border-r, no shadow. Active state: stone-100 fill + stone-900 text + no accent color. Correct.

**Typography hierarchy is clean.**
`h4` uses uppercase tracking for section labels (`text-xs uppercase tracking-wider`). `h1` uses semibold + tracking-tight. The scale distinguishes sections without noise.

**Insight framing is excellent.**
"Conversation starters" not "action items." "Based on observations and activity from [period]" not "AI generated on [date]." "Area to watch" not "Risk." Alignment with Article VII (insights should encourage conversation) is exemplary.

### Issues

**Talking points section in DeveloperOverview shows only from the most recent insight.**
If a developer has insights for multiple periods, only the `latestInsight.talkingPoints` are shown in the overview talking points block. Older insights' talking points are silently dropped. This is acceptable for the MVP but is worth flagging.

**Top-level nav items `/insights`, `/timeline`, `/observations` are placeholder pages.**
All three sidebar links lead to "select a developer" guidance screens instead of real content. For a user testing session, a visitor will click "Insights" in the sidebar and see... nothing useful. Consider labeling these as "per-developer" in the sidebar (`Developers` hosts everything), or build team-level feeds (Phase 2).

**Settings page is a stub.**
`settings/page.tsx` renders `<div>Settings</div>`. No Settings link exists in the sidebar, so it's not reachable. Low risk for user testing.

---

## 3. UX

### Strengths

**The 1:1 preparation flow in DeveloperOverview is well-structured.**
The single-page flow (header → metrics → timeline → observations → insights → talking points) mirrors how a team lead would prepare for a meeting. Reading order matches mental model. This is the core value proposition executed correctly.

**Two-step delete prevents accidental data loss.**
Observations are irreplaceable context. The "Remove → Yes, remove / Cancel" pattern is correct. The fade-in on the confirmation row helps the user notice the state change before acting.

**Error messages in `useGenerateInsights` are specific and actionable.**
"No activity data found for this period. Generate facts first by running the data sync." is more useful than "Something went wrong." The timeout message ("Try again in a moment") correctly frames transient LLM failures.

**GenerateInsightsForm is honest about latency.**
"Typically takes 30–90 seconds on local models" — sets the right expectation. The spinner with this message prevents users from assuming the system is frozen.

**Observation form wording is product-vision-aligned.**
"Significance" not "Severity." "Small note / Worth remembering / Significant moment" not "Low/Medium/High priority." The framing encourages context capture, not flagging.

### Issues

**No keyboard navigation for the date pickers in GenerateInsightsForm.**
The `<input type="date">` elements work with keyboard, but there is no validation feedback if the user selects `periodEnd < periodStart` (the `min`/`max` attrs are set but no explicit error message is shown for this case).

**Observations page (`/developers/[id]/observations`) uses Next.js 15 async params.**
This is a runtime bug (see Architecture section). The full observations list for a developer may throw on load.

**No empty state for the Talking Points section when insights exist but have no talking points.**
If `latestInsight` exists but `talkingPoints` is empty (which should not happen per the backend rules but could due to parse failures), the current empty state shows "No talking points yet. Generate insights..." even though insights do exist. The text is slightly misleading.

**"Add observation" on the Developers page goes to `/observations/new` without a developer pre-selected.**
The button in `DevelopersPage` header links to `/observations/new` with no `developerId` query param. The page handles this gracefully ("No developer selected. Open this page from a developer profile.") but the flow is broken — the primary CTA on the Developers page should either require selecting a developer first or not exist at the top-level.

---

## 4. Accessibility

### Strengths

- `aria-hidden="true"` on decorative SVGs throughout.
- `aria-label` on icon-only interactive elements (close button, remove button).
- `aria-expanded` on the ContextPackDebugger toggle.
- `role="dialog"` + `aria-modal="true"` + `aria-label` on the edit dialog.
- Avatar fallback uses `aria-label={name}` on the initials div.

### Issues

**DeveloperTabs has no `aria-current="page"` on the active tab.**
Screen readers cannot identify which tab is active. Add `aria-current="page"` (or `aria-selected="true"` with `role="tab"`) to the active link.

**`<label>` elements in GenerateInsightsForm and ContextPackDebugger have no `htmlFor` / input `id` association.**
The "From" and "To" labels are visually adjacent to the date inputs but are not programmatically linked. Screen readers won't announce "From" when the input is focused. Fix: add `id="period-start"` to the input and `htmlFor="period-start"` to the label.

**Observation form severity radio group has no `<fieldset>` / `<legend>`.**
The three significance buttons are visually grouped but `<fieldset>` + `<legend>Significance</legend>` would make the grouping explicit to screen readers.

**`Avatar` component uses a `<div>` with `aria-label` for initials but no `role`.**
`role="img"` would correctly expose this as an image to assistive technology.

**Body scroll lock in ObservationEditDialog does not restore focus on close.**
When the dialog closes, focus should return to the element that opened it (the Edit button on the card). Currently no `autoFocus` or focus restoration logic exists.

---

## 5. Responsiveness

### Current State

The layout is desktop-first by design. The sidebar is `fixed` at 240px and `main` has `ml-[240px]`. On viewports narrower than ~600px the sidebar overlaps the content and there is no breakpoint handling.

This is **acceptable for the MVP** given the target audience (engineering managers on desktop). However, it should be explicitly documented as a known limitation.

### Issues

**No responsive sidebar.** No hamburger menu, no breakpoint-triggered collapse. Mobile layout is non-functional.

**The GenerateInsightsForm date pickers stack correctly** via `flex-wrap` — this part is responsive and works on narrower viewports.

**ObservationForm severity buttons use `flex-1`** — they scale correctly across widths.

---

## 6. Motion

### Strengths

The motion system is calm and intentional.

- `animate-fade-in` (200ms): used for alerts, disclaimers, error states.
- `animate-fade-in-up` (250ms, 4px translateY): used for card entry, staggered lists.
- `animation-fill-mode: both` on both animations prevents flash during stagger delays — technically correct.
- Skeleton shimmer is a smooth infinite 1.6s linear gradient shift.
- Button spinner uses combined arbitrary animation `[animation:spin_1s_linear_infinite,fade-in_150ms_ease-out_both]` — correctly avoids the CSS `animation` property conflict that would arise from combining `animate-spin` and `animate-fade-in`.
- Tab active indicator fades in on route change.
- Card hover states (`hover:-translate-y-0.5 hover:shadow-card-hover`) are consistent across DeveloperCard, ObservationCard, InsightCard, TimelineEntryItem.

### Issues

**Double animation on `ObservationCard`.**
`ObservationCard` applies `animate-fade-in-up` directly to its root `<div>`. `ObservationList` wraps each card in a `<div className="animate-fade-in-up">` with a stagger delay. Both elements animate. Because CSS opacity is multiplicative across parent/child, this is visually harmless (both go from 0→1 in 250ms), but it's architecturally redundant. The `animate-fade-in-up` should live at exactly one level. Recommend removing it from `ObservationCard` since stagger is always managed by the container.

**No exit animations.** Elements disappear immediately (no fade-out on dialog close, no slide-out on card delete). This is acceptable for the MVP but is worth tracking. Exit animations require either Framer Motion or React `startTransition` + CSS.

---

## 7. Maintainability

### Strengths

- All components have JSDoc explaining their purpose, edge cases, and design intent. Well above average for a frontend codebase.
- Zero `any` usage in application code.
- Types mirror the backend DTOs faithfully (where they exist — see API contract issues above).
- `lib/api.ts` is the single fetch gateway. No scattered `fetch()` calls.
- `QueryProvider` is correctly scoped to authenticated pages only (dashboard layout), not the root layout.

### Issues

**`InsightType` label and dot color maps are duplicated in three files.**
`developer-overview.tsx`, `insight-card.tsx`, and `insight-list.tsx` each define their own `InsightType → string` mappings. One canonical `constants/insight.ts` file would eliminate this and make future type additions safe.

**`formatDate`, `formatRelativeDate`, and `cn` in `lib/utils.ts` are dead code.**
All three are defined but never imported anywhere. Each component does inline date formatting instead of using `formatDate`. Either use them (they are well-implemented) or remove them. Dead utilities are a maintenance trap — they appear available but are not exercised.

**`useContextPack` hook is missing the `'use client'` directive.**
The file `hooks/useContextPack.ts` does not declare `'use client'`. Since TanStack Query's `useQuery` is client-only, this hook must run in a client context. It works because the consuming component (`ContextPackDebugger`) declares `'use client'`, which creates the boundary. But the hook itself should be explicitly marked to make its client requirement clear.

**No React error boundary.**
An uncaught runtime error in any component will crash the entire page to a blank white screen. A layout-level `ErrorBoundary` component would degrade gracefully and is a basic production requirement.

---

## 8. Consistency with Core Documents

### Engineering Constitution (20 Articles)

| Article | Verdict |
|---|---|
| I — Developers are people, not metrics | ✅ No metric used as a performance measure. `DeveloperCard` shows name/role only. |
| II — Context over activity | ✅ Observations are first-class. `DeveloperOverview` highlights observations before insights. |
| III — AI must explain reasoning | ✅ Evidence basis shown in `InsightCard`. `AiDisclaimer` sets expectations. |
| IV — Never rank developers | ✅ No ranking anywhere. Alphabetical sort in `DeveloperList`. |
| V — Never calculate productivity | ✅ Metrics labeled "Activity context" not "Productivity score." |
| VI — AI assists, not replaces leadership | ✅ Talking points framed as conversation starters. |
| VII — Insights encourage conversation | ✅ "Conversation starters" label. Period context. No verdicts. |
| VIII — Human observations are first-class | ✅ Observations section in overview before insights. |
| IX — Preserve trust | ✅ Language avoids surveillance framing throughout. |
| X — Evidence before interpretation | ✅ Architecture matches: facts → context pack → insights. |
| XI — Simplicity | ✅ No premature abstractions. Components are small and readable. |
| XII — Long-term maintainability | ✅ JSDoc on all components. Strong typing. |
| XIII — Explicit architectural decisions | ⚠️ Zero frontend ADRs. All architecture decisions are implicit. |
| XIV — AI as staff engineer | ✅ Code quality is production-grade. |
| XV — Documentation is part of the product | ⚠️ No ADR-009 for frontend architecture. |
| XVI — Protect product identity | ✅ No productivity/surveillance language. |
| XVII — Every feature answers a leadership problem | ✅ 1:1 prep flow directly answers "How do I prepare for a conversation?" |
| XVIII — Build for explainability | ✅ Evidence basis, AiDisclaimer, ContextPackDebugger for engineers. |
| XIX — Preserve developer dignity | ✅ Language is consistently supportive. |
| XX — The Mission | ✅ The platform helps leaders understand people, not just code. |

**Overall Constitution compliance: High.** The two ⚠️ items (no frontend ADRs) are documentation gaps, not implementation violations.

### PRODUCT_VISION.md

The vision states: *"The platform should feel like opening a notebook that has been carefully maintained for months. Not a dashboard. Not a spreadsheet. A story."*

The `DeveloperOverview` page is the closest implementation of this vision. The sequential layout (who is this person → what have they been doing → what happened recently → what have I noticed → what does the AI see → what should I discuss) mirrors a physical notebook review. This is the right implementation direction.

The vocabulary alignment is correct: "Signals," "Observations," "Timeline," "Insights," "Talking Points" — all used with their intended meanings.

### ADR Alignment

- ADR-004 (Knowledge Engine firewall): ✅ Frontend never calls raw LLM endpoints. Insights are fetched from the backend, not generated client-side.
- ADR-005 (No productivity scores): ✅ No scores, rankings, or percentile displays anywhere.
- ADR-008 (Ollama local LLM): ✅ Frontend is LLM-agnostic. The `model` field in `Insight` is displayed as metadata only.

---

## 9. Technical Debt (Frontend-Specific)

Items not already in PROJECT_STATE.md known debt:

| Priority | Item |
|---|---|
| **BLOCKING** | `timelineService.getByDeveloper` returns `TimelineEntry[]` but backend returns `PaginatedTimelineResponseDto` — runtime TypeError |
| **BLOCKING** | `insightsService.getByDeveloper` returns `Insight[]` but backend returns `PaginatedInsightsResponseDto` — runtime TypeError |
| **BLOCKING** | `observationsService.getByDeveloper` returns `Observation[]` but backend returns `PaginatedObservationsResponseDto` — runtime TypeError |
| **High** | No ESLint config — `next lint` fails; no linting enforced |
| **High** | `/developers/[id]/observations/page.tsx` — Next.js 15 async params syntax (`Promise<{id: string}>` + `use()`) on Next.js 14 — runtime risk |
| **High** | No React error boundary — uncaught errors crash to blank page |
| **Medium** | `InsightType` label/dot maps duplicated in 3 files — add `constants/insight.ts` |
| **Medium** | `lib/utils.ts` — `formatDate`, `formatRelativeDate`, `cn` are dead code |
| **Medium** | `DeveloperTabs` missing `aria-current="page"` on active tab |
| **Medium** | `GenerateInsightsForm` `<label>` elements not associated with inputs (`htmlFor` missing) |
| **Medium** | `ObservationCard` double `animate-fade-in-up` — card itself + parent wrapper both animate |
| **Medium** | `useContextPack` missing `'use client'` directive |
| **Medium** | Top-level sidebar items (Insights, Timeline, Observations) are placeholder pages — UX friction in user testing |
| **Low** | `Avatar` component missing `role="img"` for accessibility |
| **Low** | Observation form severity radio group missing `<fieldset>` / `<legend>` |
| **Low** | No focus restoration on dialog close |
| **Low** | Talking points empty state misleading when insights exist but have empty `talkingPoints` |
| **Low** | No mobile responsive layout (documented known limitation, acceptable for MVP) |
| **Low** | No staleTime override for expensive insight queries (default 60s is short for AI-generated content) |

---

## 10. Suggested Improvements

**For user testing (must fix first):**

1. Fix the three paginated response unwrapping issues in the services. The simplest fix:
   ```typescript
   // In each service method, unwrap the paginated response:
   getByDeveloper: (developerId: string): Promise<TimelineEntry[]> =>
     api.get<{ data: TimelineEntry[] }>(`/developers/${developerId}/timeline`)
       .then(r => r.data),
   ```
   For production, implement proper hook-level pagination instead.

2. Fix `/developers/[id]/observations/page.tsx` — change `params: Promise<{ id: string }>` to `params: { id: string }` and remove `use(params)`.

3. Add a minimal ESLint config (copy from Next.js defaults).

**For the next sprint (Day 8):**

4. Add `ADR-009` for frontend architecture decisions (see below).
5. Extract `InsightType` constants to a shared `constants/insight.ts`.
6. Add a React error boundary at the dashboard layout level.
7. Remove dead code from `lib/utils.ts` or adopt the utilities.
8. Add `aria-current="page"` to `DeveloperTabs`.
9. Associate `<label>` with inputs in `GenerateInsightsForm`.
10. Remove `animate-fade-in-up` from `ObservationCard` root — let the list container manage stagger.

**For Phase 2:**

11. Add cross-team feeds to the Insights, Timeline, and Observations top-level pages.
12. Implement mobile-responsive sidebar (slide-over pattern).
13. Add Framer Motion for exit animations on dialog and card delete.
14. Move insight generation to a polled job (already in backend technical debt).

---

## 11. MVP Readiness Verdict

**Not ready as-is. Ready after 2–3 targeted fixes.**

The MVP is architecturally correct, product-vision-aligned, and visually polished. The AI framing is exemplary. The 1:1 preparation flow is the product vision executed well.

**The three API contract bugs are the only blockers.** They are quick fixes (30-60 minutes). Once resolved, the application will render real data correctly and is ready for limited user testing with the following caveats that should be communicated to testers:

- Requires Ollama running locally (`ollama serve` + `qwen2.5-coder:7b` pulled)
- Insight generation takes 30–90 seconds — this is expected
- Mobile layout is not supported — desktop only
- No authentication — the app runs in DEV_TEAM_LEAD_ID bypass mode
- Settings page is a placeholder

**Recommended pre-testing checklist:**
1. ✅ Fix 3 service response type mismatches
2. ✅ Fix async params bug in `/developers/[id]/observations`
3. ✅ Add minimal ESLint config
4. ✅ Verify all 5 pages load data correctly with backend running
5. ✅ Verify insight generation works end-to-end with Ollama
6. ✅ Record a test observation and confirm it appears in timeline and overview
