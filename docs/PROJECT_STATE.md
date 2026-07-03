# Project State

## Purpose

This document represents the current state of the LeadPilot project.

Unlike the roadmap, which describes the long-term plan, this file describes the current implementation status.

Every development session should begin by reading this document.

Every significant milestone should update this file.

The goal is to keep both human contributors and AI agents synchronized on the project's current state.

---

# Current Status

## Current Phase

Day 8 -- Reports

Current Focus

Day 7 Frontend MVP is complete. All 5 pages wired with real data, Inter font, Linear-style
design tokens (shadow-card, shadow-card-hover, rounded-2xl), TSC passing EXIT:0.
Next milestone: Weekly Reports and Developer/Team Summary dashboards.

---

# Completed Milestones

## Day 1

Status

Completed

Deliverables

* Project foundation
* Monorepo
* Backend
* Frontend
* Prisma
* PostgreSQL
* Redis
* BullMQ
* Developers module
* Health endpoint

---

## Day 2

Status

Completed

Deliverables

* GitHub Integration
* Pull Request ingestion
* Review ingestion
* Idempotent sync
* GitHub sync processor
* Repository synchronization
* Background jobs

---

## Day 3

Status

Completed

Deliverables

* Metrics Engine
* MetricSnapshot generation
* Average PR Size
* Merge Time
* Review Metrics
* Repository Focus
* Metrics jobs

---

## Day 4

Status

Completed

Deliverables

* Observation module -- CRUD, soft-delete, pagination, filtering (by type, severity, date range)
* Observation -> TimelineEntry atomic write (Prisma $transaction)
* TimelineRepository -- paginated reads with full TIMELINE_INCLUDE shape
* TimelineService -- returns PaginatedTimelineResponseDto via mapper
* TimelineController -- GET /developers/:developerId/timeline, POST /developers/:developerId/timeline/rebuild
* TimelineBuilderService -- pure composition service, no DB access, deterministic
* Timeline mapper -- source derivation from FK columns, Date -> ISO string serialization
* Filtering: type, source (entity origin), from/to date range
* 225 tests passing, 0 failures

---

## Day 5

Status

Completed

Deliverables

* Prisma migration: FactType enum + updated Fact model
  -- Added: type, dedupKey (unique), updatedAt, evidence (renamed from sources)
  -- Removed: observationId FK (replaced by evidence Json)
  -- Made required: periodStart, periodEnd
  -- New indexes: (developerId, periodStart, periodEnd), (type)
* KnowledgeRepository: upsertFact (dedupKey idempotency), findByDeveloper, findByDeveloperAndPeriod
* KnowledgeService: generateFacts, getFacts, buildContextPack
* KnowledgeController: 3 endpoints (see API section below)
* ContextPack: dynamic, never persisted -- assembled per request
* Fact extraction rules: 6 rules documented in ADR-006
* ObservationsRepository: added from/to date range filter + findAllByDeveloperAndPeriod
* 249 tests passing, 0 failures

API Endpoints (Day 5)

* POST /api/developers/:developerId/facts/generate?periodStart=&periodEnd=
* GET  /api/developers/:developerId/facts?type=&page=&limit=
* GET  /api/developers/:developerId/context-pack?periodStart=&periodEnd=

---

## Day 6 -- Context Builder + Expanded Facts + Day 5 Integration

Status

Complete (reviewed and validated 2026-06-29)

Deliverables

* FactsModule: standalone domain module extracted from KnowledgeModule
  -- FactsRepository (upsertFact, findByDeveloper, findByDeveloperAndPeriod)
  -- FactsService (generate, list, findByPeriod)
  -- FactsController (POST generate, GET list)
* FactsService expanded to 14 deterministic extraction rules (ADR-006 v2):
  -- MetricSnapshot: 7 rules (merged PRs, opened PRs, reviews given/received,
     avg PR size, avg merge time, repository focus)
  -- Observations per-record: 3 rules (ACHIEVEMENT, COACHING_SIGNAL, OBSERVATION_FACT)
  -- Observations aggregate: 2 rules (count by type when >= 2, high-severity count)
  -- Timeline: 2 rules (total entry count, most recent notable event)
  -- 48 tests covering every rule and edge case
* FactsModule now imports TimelineModule; FactsService injects TimelineRepository
* KnowledgeModule refactored: delegates fact logic to FactsModule, context-pack only
* ContextBuilderService: pure assembly service (no Prisma), produces ContextPack
  -- 20 tests, no mocks required (incl. TIMELINE_ENTRY evidence resolution)
* ContextPack enriched (ADR-007):
  -- timeline: ContextPackTimelineEntry[] -- chronological developer history
  -- evidenceMap: EvidenceMap -- sourceId -> evidence summary for AI traceability
  -- evidenceMap resolves METRIC_SNAPSHOT, OBSERVATION, and TIMELINE_ENTRY sources
* TimelineRepository: added findByDeveloperAndPeriod() + exported from TimelineModule
* KnowledgeService: parallel-fetches all 4 data sources, delegates assembly to ContextBuilderService
* dedupKey format updated to v2: {devId}:{type}:{rule}:{sourceId}:{date}
  -- v1 facts in existing DBs will not be auto-upserted; one-time migration needed
* Day 5 integration validated manually (Postman) and via automated tests:
  -- All facts are evidence-backed (0 unresolved evidence entries)
  -- ContextPack is stable and JSON-serializable (round-trip validated)
  -- No OpenAI calls, no AI Insights, no Reports implemented
* 298 tests passing, 0 failures

API Endpoints (Day 5/6)

* POST /api/developers/:developerId/facts/generate  (body: { periodStart, periodEnd })
* GET  /api/developers/:developerId/facts?type=&page=&limit=
* GET  /api/developers/:developerId/knowledge/context?periodStart=&periodEnd=
* GET  /api/developers/:developerId/context-pack?periodStart=&periodEnd=  (legacy alias)

---

## Day 6 -- AI Engine (Local Intelligence Layer)

Status

Complete (implemented and validated 2026-06-29)

Deliverables

* Prisma schema: Insight model + TalkingPoint model + FactInsight join table
  -- InsightType enum: 8 values (POSITIVE_SIGNAL, COACHING_OPPORTUNITY, RISK,
     GROWTH_PATTERN, RECOGNITION, WORKLOAD_SIGNAL, COMMUNICATION_SIGNAL, LEADERSHIP_SIGNAL)
  -- FactInsight: many-to-many Fact <-> Insight, only valid factIds persisted
* AiModule (new): encapsulates all LLM infrastructure (ADR-008)
  -- OllamaProvider: HTTP client for Ollama, AbortController timeout, structured logging
  -- PromptBuilderService: pure service, converts ContextPack to system + user prompts
  -- InsightParserService: pure service, validates LLM JSON output, warns on prohibited language
* InsightsModule (new):
  -- InsightsRepository: createInsightsWithTalkingPoints ($transaction atomic write),
     findByDeveloper (paginated, ordered by periodStart DESC)
  -- InsightsService: 8-step orchestration (facts -> context pack -> prompts ->
     Ollama -> parse -> factId validation -> persist -> map to DTOs)
  -- InsightsController: POST generate, GET list (DEV_TEAM_LEAD_ID bypass)
* factId validation (ADR-008 rules 3 and 4):
  -- validFactIds persisted; unknownFactIds logged and discarded per insight
  -- Insight with 0 valid factIds discarded; generation fails only if ALL discarded
* env.validation.ts: OLLAMA_BASE_URL, OLLAMA_MODEL (default: qwen2.5-coder:7b),
  OLLAMA_TIMEOUT_MS (default: 60000)
* 47 new tests: ollama.provider (8), prompt-builder (10), insight-parser (22),
  insights.service (13)
* ILlmProvider interface + LLM_PROVIDER injection token (provider abstraction layer):
  -- llm-provider.interface.ts, llm.types.ts (generic LlmMessage, LlmRole types)
  -- OllamaProvider implements ILlmProvider
  -- AiModule registers OllamaProvider behind LLM_PROVIDER token
  -- InsightsService injects ILlmProvider via @Inject(LLM_PROVIDER), not OllamaProvider
* AI safety review completed (2026-06-30):
  -- PROHIBITED_PHRASES synced with system prompt NEVER list (12 phrases each)
  -- InsightParserService scans both summary AND talkingPoints for prohibited language
  -- 'should be removed' added to PROHIBITED_PHRASES
  -- 'better than others' / 'worse than others' shortened to 'better than' / 'worse than'
  -- Parser sync-guard test verifies both enforcement layers stay in sync
* 351 tests passing, 0 failures

API Endpoints (Day 6 AI)

* POST /api/developers/:developerId/insights/generate  (body: { periodStart, periodEnd })
* GET  /api/developers/:developerId/insights?periodStart=&periodEnd=&type=&page=&limit=

Prerequisites (local dev)

* `brew install ollama` (macOS) or equivalent
* `ollama pull qwen2.5-coder:7b`  (~4 GB)
* OLLAMA_BASE_URL=http://localhost:11434 in apps/backend/.env  (default)

---

# Current Sprint

## Sprint Goal

Build the Reports layer (Day 8).

Modules:

* WeeklyReport generation
* Developer summary endpoint
* Team summary endpoint

---

## In Progress

**[BLOCKING] API contract mismatches — must fix before user testing.**
Three frontend services type paginated backend responses as flat arrays.
Causes runtime TypeError on timeline, insights, and observations list views.
Fix: unwrap `.data` in each service method (see DAY7_REVIEW.md §1 Architecture).

---

# Upcoming Milestones

## Day 7 -- Frontend MVP

Status

Complete (2026-06-30, TSC EXIT:0) — Day 7 Review completed 2026-07-02 (see docs/DAY7_REVIEW.md)

Deliverables

* Next.js 14 App Router, TypeScript strict mode
* Inter via next/font/google (zero layout shift, self-hosted)
* Tailwind design tokens: shadow-card, shadow-card-hover, rounded-2xl, ease-out-quart
* 5 pages: Team (/), Developers (/developers), Developer profile (/developers/[id]),
  Insights (/developers/[id]/insights), Timeline (/developers/[id]/timeline),
  Add Observation (/observations/new)
* All pages wired to real backend API (TanStack Query v5)
* Linear-style sidebar with logomark
* Linear-style underline tabs (developer profile)
* Notion-style EmptyState (icon-led, no dashed border)
* Badge label maps (human-readable -- no raw enum strings in UI)
* InsightCard with talking points, dot color per type, model/period footer
* ObservationCard with severity dot, muted type badges
* TimelineEntryItem with vertical connector, tabular-nums dates
* GenerateInsightsForm with honest generation-time messaging
* React Hook Form + Zod observation form
* Skeleton loaders for all list and card patterns

Review Findings (2026-07-02)

* Constitution compliance: High (20/20 articles respected in implementation)
* Architecture: Clean service/hook/component layering; TanStack Query v5 correct
* Design: Design token system consistent; content cap 720px; vocabulary aligned with Product Vision
* Motion: Calm and intentional; fill-mode:both prevents flash; no CSS animation conflicts
* 3 blocking bugs found (API contract mismatch -- timeline, insights, observations services)
* MVP is NOT ready for user testing as-is; ready after ~1h of targeted fixes

## Day 8

Reports

Weekly Reports (developer summary, team summary)

---

# Current Architecture

```text
GitHub
        |
        v

Pull Requests / Reviews
        |
        v

Metrics Engine -> MetricSnapshots
        +
Observations -> TimelineEntries
        |
        v

Timeline (read-view)

        +

Knowledge Engine (Day 5 -- complete)
        |
        v

Facts (stored, idempotent)

        +

Context Packs (dynamic, per-request)

        |
        v

AI Insights (Day 6 -- complete)

        |
        v

Reports (Day 7 -- next)
```

---

# Current Domain Model

Implemented

* Developer
* Pull Request
* Pull Request Review
* Metric Snapshot
* Observation
* Timeline Entry
* Fact (Day 5)

Implemented (Day 6)

* Insight
* TalkingPoint
* FactInsight (join table)

Not Started

* Weekly Report

---

# Known Technical Debt

* Timeline rebuild uses N individual `create` calls instead of `createMany` -- acceptable for admin path.
* Timeline rebuild endpoint is synchronous -- Phase 5: move to BullMQ job for large histories.
* GitHub sync currently supports GitHub only.
* Authentication is minimal -- Phase 5: add JwtAuthGuard to all endpoints.
* DEV_TEAM_LEAD_ID bypass in DevelopersController, KnowledgeController, FactsController,
  and InsightsController -- remove in Phase 5 when auth is implemented.
* FactsRepository `(this.prisma.fact as any)` casts -- remove after `npx prisma generate`.
* FactType defined locally in facts.types.ts -- after prisma generate, import from @prisma/client.
* dedupKey v1 -> v2 migration: facts generated before Day 6 used the old format; re-running
  generate-facts will INSERT new rows instead of upserting existing ones. Apply a one-time
  data migration if the DB has pre-existing facts (new installations are unaffected).
* KnowledgeService injects 6 dependencies -- if ContextPack grows further, extract
  a ContextDataFetcher service.
* InsightsService.generate() is synchronous HTTP -- Phase 5: move to BullMQ job so the
  endpoint returns a job ID and the client polls for results.
* OllamaProvider has no retry -- Phase 5: add exponential backoff (max 3 attempts)
  for transient network errors.
* InsightParseException not caught in InsightsService -- when the LLM returns malformed
  JSON, the client receives HTTP 500 instead of a meaningful 422. Fix: catch
  InsightParseException in generate() and rethrow as UnprocessableEntityException.
* No Insight deduplication -- calling generate() twice for the same period inserts
  duplicate Insight rows. Unlike Facts (dedupKey), Insights have no idempotency guard.
* ContextPack prompt has no size bound -- full JSON.stringify(pack) is sent to the LLM
  without truncation. Risk for long-tenured developers or models with small context windows.
* previousInsights missing from ContextPack -- ADR-007 noted this as a Day 6 addition.
  Without it, generate() may produce duplicate insights across calls in the same period.
* list() uses buildContextPack() for developer existence check (4 DB queries instead of 1).
  A lightweight findDeveloperById call would be more efficient.
* InsightsModule comment still references OllamaProvider instead of ILlmProvider.
* InsightParserService does not enforce minimum 1 talkingPoint per insight (prompt says 1-3).
* No insights.mapper.ts -- DTO mapping is in private functions in insights.service.ts,
  inconsistent with the Observations/Timeline mapper convention.

Priority (Backend)

High (InsightParseException → 422): user-facing correctness issue; fix before Day 7 frontend.
High (prisma generate): eliminates runtime `as any` casts.
Medium (InsightsService BullMQ): generation can take 30-60s; synchronous is fragile.
Medium (Insight deduplication): production correctness concern.
Medium (ContextPack size bound): production resilience concern.
Low (all others): no blocking technical debt for Day 7.

Frontend Technical Debt (added Day 7 Review, 2026-07-02)

BLOCKING: timelineService.getByDeveloper -- returns TimelineEntry[] but backend returns
  PaginatedTimelineResponseDto. Causes runtime TypeError (.filter on non-array).
BLOCKING: insightsService.getByDeveloper -- same mismatch with PaginatedInsightsResponseDto.
BLOCKING: observationsService.getByDeveloper -- same mismatch with PaginatedObservationsResponseDto.
  Fix for all three: unwrap .data from the paginated envelope in each service method.
High: /developers/[id]/observations/page.tsx uses Next.js 15 async params syntax (Promise<{id}>
  + use()) on Next.js 14 -- runtime risk; change params type to { id: string }, remove use().
High: No ESLint config -- next lint fails; no linting enforced. Add eslint.config.js.
High: No React error boundary -- uncaught render errors crash to blank screen.
Medium: InsightType label and dot color maps duplicated in 3 components -- extract to constants/insight.ts.
Medium: lib/utils.ts (formatDate, formatRelativeDate, cn) defined but never imported -- dead code.
Medium: DeveloperTabs missing aria-current="page" on active tab.
Medium: GenerateInsightsForm <label> elements not associated with inputs (htmlFor missing).
Medium: ObservationCard has animate-fade-in-up on root AND parent stagger wrapper -- redundant.
Medium: useContextPack missing 'use client' directive.
Low: Avatar component missing role="img".
Low: Observation form severity radio group missing <fieldset>/<legend>.
Low: No focus restoration when ObservationEditDialog closes.

---

# Product Boundaries

The following features are intentionally out of scope for the MVP.

Do not implement:

* Productivity scores
* Developer ranking
* Performance evaluation
* Promotion recommendations
* Termination suggestions
* Employee surveillance
* Slack integration
* Jira integration
* GitLab integration
* Azure DevOps integration
* Notifications
* Realtime updates
* Multi-tenancy
* SSO
* RBAC

Unless explicitly requested.

---

# Current AI Responsibilities

The AI Engine begins on Day 6.

Day 5 established the Knowledge Engine -- the AI firewall.

The AI layer (InsightsModule) will:
1. Call KnowledgeService.buildContextPack() to get the context window.
2. Pass the context pack to OpenAI.
3. Persist Insights and TalkingPoints.

Before calling OpenAI, always call generateFacts() first to ensure the Facts
in the context pack are current.

---

# Active Architectural Decisions

Reference: docs/ARCHITECT_DECISIONS.md

Current ADRs:

* ADR-001: Monorepo structure
* ADR-002: NestJS modular monolith
* ADR-003: Prisma + PostgreSQL
* ADR-004: Knowledge Engine is the AI firewall
* ADR-005: No productivity scores or ranking
* ADR-006: Fact extraction rules (v2 -- 14 rules, Day 6)
* ADR-007: ContextPack enrichment (timeline + evidenceMap)
* ADR-008: Local LLM via Ollama + qwen2.5-coder:7b (Day 6)
* ADR-009: Frontend architecture -- client-only data fetching, service/hook/component separation (Day 7)

Before making architectural changes:

1. Read existing ADRs.
2. Verify no ADR is being violated.
3. If a change conflicts with an ADR, explain why and request approval.

Never silently change an accepted architectural decision.

---

# Session Start Checklist (For AI Agents)

At the beginning of every development session:

1. Read:

* README.md
* PROJECT_CONTEXT.md
* PRODUCT_VISION.md
* DOMAIN_MODEL.md
* ENGINEERING_GUIDELINES.md
* AI_WORKFLOW.md
* ARCHITECT_DECISIONS.md
* PROJECT_STATE.md

2. Determine the current phase.

3. Identify the current sprint goal.

4. Verify which modules are complete.

5. Verify which modules are in progress.

6. Confirm that proposed work aligns with the roadmap.

7. Explain the implementation plan before writing code.

---

# Session End Checklist (For AI Agents)

At the end of every development session:

Update this document with:

* Completed tasks
* New technical debt
* New architectural decisions
* Remaining blockers
* Next recommended milestone

If a major architectural decision was made:

Create a new ADR in:

docs/ARCHITECT_DECISIONS.md

---

# Next Goal

Fix 3 blocking API contract bugs, then begin Day 8 -- Reports.

Day 7 (Frontend MVP) complete but NOT user-testing ready (see docs/DAY7_REVIEW.md).
Day 6 (AI Engine) is complete: 351 tests passing, 0 failures.

Pre-user-testing fixes (do these first, ~1h total):

1. Fix timelineService.getByDeveloper: unwrap PaginatedTimelineResponseDto.data
2. Fix insightsService.getByDeveloper: unwrap PaginatedInsightsResponseDto.data
3. Fix observationsService.getByDeveloper: unwrap PaginatedObservationsResponseDto.data
4. Fix /developers/[id]/observations/page.tsx: remove Promise<> wrapper + use() on params
5. Verify all 5 pages load data with backend running

Day 8 should implement:

* WeeklyReport model (Prisma schema migration)
* WeeklyReportService: aggregate Insights + Metrics + Observations for a period
* WeeklyReportController: POST generate, GET list
* Developer summary: structured summary of a developer's period
* Team summary: aggregate view across all developers on a team

Pre-conditions for Day 8:

1. Apply all 5 pre-user-testing fixes above.
2. Run `npx prisma migrate dev --name add-weekly-report` after updating schema.
3. Read ADR-004 (Knowledge Engine firewall) -- reports consume Insights, not raw LLM.
4. Read ADR-005 (no productivity scores) -- summaries must use hedged language.
5. Verify `npx jest` still passes before starting.

Local dev pre-conditions (for testing AI endpoints):

* `ollama serve` must be running
* `ollama pull qwen2.5-coder:7b` must have been executed (~4 GB download)
* OLLAMA_BASE_URL=http://localhost:11434 in apps/backend/.env
