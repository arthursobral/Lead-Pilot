# Architecture Decisions

## Purpose

This document records the most important architectural decisions made during the development of LeadPilot.

It exists to preserve engineering context over time.

Every significant architectural decision should be recorded here.

The goal is to ensure that future contributors — both humans and AI agents — understand not only **what** was built, but also **why** it was built that way.

Whenever a new architectural decision is made, add a new ADR section to this document.

---

# Decision Format

Every decision must follow this template.

```text
ADR-XXX

Date:

Status:

Context

Decision

Alternatives Considered

Consequences

Future Revisions
```

---

# ADR-001

Date

2026-XX-XX

Status

Accepted

## Context

LeadPilot is intended to become an AI Copilot for Engineering Leaders.

The system will process engineering activity, human observations, historical context, and AI-generated insights.

Without a clear separation of responsibilities, AI-generated insights would become difficult to explain and maintain.

## Decision

The platform will be built as a modular monolith.

Each business capability will live in its own module.

Initial modules:

* Developers
* GitHub
* Metrics
* Observations
* Timeline
* Knowledge
* Insights
* Reports

Each module owns:

* Controller
* Service
* Repository
* DTOs
* Tests

## Alternatives Considered

Monolithic service layer.

Microservices.

Feature-based frontend-only architecture.

## Consequences

Positive

Simple deployment.

Clear boundaries.

Easy refactoring.

Low operational complexity.

Negative

Future scaling will require extracting modules if necessary.

## Future Revisions

Microservices should only be considered if independent scaling becomes necessary.

---

# ADR-002

Date

2026-XX-XX

Status

Accepted

## Context

Engineering metrics alone do not provide enough context to support coaching.

Customer praise.

Mentoring.

Leadership moments.

Communication improvements.

None of these are visible through GitHub activity.

## Decision

Introduce the Observation domain.

Observations represent manually captured human context.

Observations become first-class citizens within the platform.

## Alternatives Considered

Only GitHub metrics.

Slack integration.

Jira comments.

## Consequences

Positive

Richer coaching context.

Supports recognition.

Supports growth conversations.

Negative

Requires manual input from Team Leads.

## Future Revisions

Future integrations may automatically suggest observations from Slack or Jira.

---

# ADR-003

Date

2026-XX-XX

Status

Accepted

## Context

AI performs better when consuming normalized information.

Raw GitHub events are noisy.

Human observations vary in format.

Metric snapshots are periodic.

## Decision

Create a Timeline layer.

The Timeline becomes the chronological history of a developer.

Timeline entries normalize:

* Signals
* Observations
* Metric Snapshots
* Future Achievements
* Future Reports

## Alternatives Considered

Query every source independently.

Generate timelines dynamically in the frontend.

## Consequences

Positive

Single API.

Single chronological view.

Future AI becomes much simpler.

Negative

Requires synchronization between modules.

## Future Revisions

Support additional timeline event types.

---

# ADR-004

Date

2026-XX-XX

Status

Accepted

## Context

Large Language Models should never consume raw database entities directly.

Doing so increases hallucinations and makes explanations difficult.

## Decision

Introduce the Knowledge Engine.

The Knowledge Engine becomes the only component responsible for preparing AI context.

Flow

Signals

↓

Observations

↓

Timeline

↓

Facts

↓

Context Pack

↓

LLM

## Alternatives Considered

Direct database → OpenAI.

Timeline → OpenAI.

## Consequences

Positive

Explainable AI.

Evidence-based insights.

Lower hallucination risk.

Negative

Additional processing layer.

## Future Revisions

Support semantic search and long-term memory.

---

# ADR-005

Date

2026-XX-XX

Status

Accepted

## Context

The product must preserve trust between Engineering Leaders and Developers.

Many engineering analytics platforms encourage productivity monitoring.

LeadPilot intentionally avoids this positioning.

## Decision

The platform will never implement:

* Productivity scores
* Developer rankings
* Forced comparisons
* Promotion recommendations
* Termination suggestions

Instead, the platform focuses on:

* Context
* Coaching
* Recognition
* Growth
* Better conversations

## Alternatives Considered

Traditional engineering analytics dashboards.

## Consequences

Positive

Higher trust.

Better product differentiation.

Negative

Some customers may expect productivity metrics.

Those features are intentionally out of scope.

---

# ADR-006

Date

2026-06-26

Status

Accepted

## Context

The Knowledge Engine (Day 5) must transform raw data — MetricSnapshots and
Observations — into structured, evidence-backed Facts before passing them to
the AI layer (Day 6).

The extraction rules needed a home. Options:

1. Inline logic in KnowledgeService with no documented rule set.
2. A dedicated rule engine with pluggable extractors.
3. Explicit named rules documented here and implemented as private methods in KnowledgeService.

Without documented rules, future contributors (human or AI) have no guidance
on why a CONCERN observation becomes a COACHING_SIGNAL fact rather than an
OBSERVATION_FACT. Silent rule changes could subtly corrupt AI context without
any architectural signal.

A pluggable rule engine adds premature complexity for six rule types.

## Decision

Fact extraction rules are documented explicitly, implemented as private methods
in FactsService, and enforced via deterministic dedupKey idempotency.

**Rule set (v2 -- Day 6, 14 rules):**

MetricSnapshot rules (Rules 1-7):

1. ACTIVITY_SIGNAL -- pullRequestsMerged > 0.
   Statement: "Merged N pull requests between {start} and {end}."
   Confidence: HIGH (> 5), MEDIUM (2-5), LOW (1).

2. ACTIVITY_SIGNAL -- pullRequestsOpened > 0.
   Statement: "Opened N pull requests between {start} and {end}."
   Confidence: HIGH (> 5), MEDIUM (2-5), LOW (1).

3. COLLABORATION_SIGNAL -- reviewsGiven > 0.
   Statement: "Gave N code reviews between {start} and {end}."
   Confidence: HIGH (> 10), MEDIUM (3-10), LOW (1-2).

4. COLLABORATION_SIGNAL -- reviewsReceived > 0.
   Statement: "Received N code reviews between {start} and {end}."
   Confidence: HIGH (> 10), MEDIUM (3-10), LOW (1-2).

5. METRIC_PATTERN -- averagePrSizeLines is not null.
   Statement: "Average PR size was N lines between {start} and {end}."
   Confidence: HIGH (direct measurement).

6. METRIC_PATTERN -- averageMergeTimeHours is not null.
   Statement: "Average merge time was N hours between {start} and {end}."
   Confidence: HIGH (direct measurement).

7. METRIC_PATTERN -- repoFocus has entries.
   Statement: "Primary repository focus was {topRepo} (N contributions) between..."
   Confidence: HIGH (direct measurement). Top repo selected by contribution count.

Observation per-record rules (Rules 8-10):

8. ACHIEVEMENT -- from Observation when type is ACHIEVEMENT, LEADERSHIP,
   or MENTORING. Statement: the observation summary verbatim.
   Confidence: HIGH (direct human observation).

9. COACHING_SIGNAL -- from Observation when type is COACHING_OPPORTUNITY
   or CONCERN. Statement: the observation summary verbatim.
   Confidence: MEDIUM (human observation, interpretation warranted).

10. OBSERVATION_FACT -- from Observation for all other types (CUSTOMER_FEEDBACK,
    COMMUNICATION, INCIDENT, OWNERSHIP, CONTEXT).
    Statement: the observation summary verbatim.
    Confidence: HIGH (direct human observation).

Observation aggregate rules (Rules 11-12):

11. OBSERVATION_FACT -- count by observation type (when >= 2 of same type).
    Statement: "N {type} observations were recorded between {start} and {end}."
    Evidence: all observation IDs of that type.
    Confidence: HIGH. dedupKey includes COUNT:{type} qualifier.

12. OBSERVATION_FACT -- high-severity observation count (when any HIGH severity).
    Statement: "N high-severity observations were recorded between {start} and {end}."
    Evidence: all HIGH severity observation IDs.
    Confidence: HIGH. dedupKey includes HIGH_SEVERITY qualifier.

Timeline rules (Rules 13-14):

13. ACTIVITY_SIGNAL -- total timeline entry count (when entries > 0).
    Statement: "N activity entries were recorded in the timeline between..."
    Evidence: first and last timeline entry IDs (bookends).
    Confidence: HIGH. dedupKey includes TIMELINE_COUNT qualifier.

14. OBSERVATION_FACT -- most recent notable event (last ACHIEVEMENT or OBSERVATION
    type entry, in ASC chronological order).
    Statement: 'Most recent notable event: "{summary}" (recorded on {date}).'
    Evidence: that timeline entry ID.
    Confidence: HIGH. dedupKey includes TIMELINE_RECENT qualifier.

**Idempotency contract (v2):**

Every fact has a deterministic dedupKey:
  `{developerId}:{factType}:{rule}:{sourceId|qualifier}:{periodStart(date)}`

The rule qualifier (e.g., MERGED_PRS, REVIEWS_GIVEN, COUNT:CUSTOMER_FEEDBACK)
distinguishes multiple facts of the same FactType from the same source. This
replaced the v1 format (`{developerId}:{factType}:{sourceId}:{date}`) which
could not accommodate more than one fact of the same type per source per period.

POST /developers/:developerId/facts/generate is safe to call multiple times.
Re-runs upsert existing facts with refreshed statement and evidence.

**Note on dedupKey migration:** The v1 format is stored in any facts generated
before Day 6. The v2 format will INSERT new rows rather than UPDATE the old ones.
Apply a one-time data migration to rename existing dedupKeys if the DB contains
v1 facts. New installations are unaffected.

## Alternatives Considered

AI-assisted fact extraction (e.g. using GPT to classify observations into
fact types): rejected for Day 5 because it introduces non-determinism, cost,
and latency before the AI layer is even established. Rule-based extraction is
auditable, testable, and sufficient for the initial context pack.

Dynamic confidence scoring based on multiple signals: rejected as premature.
Confidence levels are currently a function of quantity (merged PRs, reviews).
This can be refined in Day 6 using the full fact set as additional signal.

## Consequences

Positive

Fact generation is idempotent, auditable, and fully tested without mocking AI.
Every fact is traceable to a specific source record via the evidence Json array.
Future rules can be added by extending this ADR and adding a new private method.

Negative

Rule logic lives in FactsService (originally KnowledgeService; migrated to
FactsModule during the Day 6 Context Builder refactor). If the rule count grows
beyond ~20, extractors should be refactored into a FactExtractor interface with
one class per rule type.

## Future Revisions

Day 6: add rules that derive facts from Timeline patterns (e.g. ACTIVITY_SIGNAL
from review frequency trends over multiple periods).

Phase 2: introduce confidence scoring that accounts for corroborating evidence
across multiple source types (e.g. an OBSERVATION_FACT confirmed by a
METRIC_PATTERN raises confidence to HIGH).

---

# ADR-007

Date

2026-06-27

Status

Accepted

## Context

The Day 5 Knowledge Engine (ADR-006) built a ContextPack containing developer
profile, MetricSnapshot, stored Facts, and Observations. Two inputs required
by the Day 6 AI layer were missing:

1. **Timeline entries** -- the chronological history of a developer's activity.
   The AI layer needs this narrative sequence to understand the order of events,
   not just isolated facts.

2. **Evidence map** -- a flat `sourceId -> summary` lookup built from the
   evidence references embedded in each Fact. Without it, the AI layer would
   need additional round-trips to resolve `fact.evidence[0].sourceId` back to
   human-readable context.

The Day 5 KnowledgeService assembled the pack inline with private helper
functions. As the pack grew more complex, inline assembly became harder to
test in isolation and harder to reason about.

## Decision

Two structural changes were made:

**1. ContextBuilderService** -- a pure, stateless service (no Prisma) that
accepts all pre-fetched domain data and returns a fully-structured ContextPack.
`KnowledgeService` fetches all data in parallel, then delegates to
`ContextBuilderService.build()`. This follows the existing
`TimelineBuilderService` pattern (ADR-003).

**2. Enriched ContextPack** -- the `ContextPack` type now includes:
  - `timeline: ContextPackTimelineEntry[]` -- all timeline entries in the
    period, ordered chronologically (occurredAt ASC).
  - `evidenceMap: EvidenceMap` -- a `Record<sourceId, EvidenceMapEntry>` built
    from all unique evidence references across the fact set. Each entry has
    `sourceType`, `summary`, and `date`. Unresolvable IDs produce a fallback
    entry rather than being silently omitted.

**3. TimelineRepository.findByDeveloperAndPeriod()** -- a new non-paginated
period query added to TimelineRepository, exported from TimelineModule, so
KnowledgeService can retrieve timeline entries without pagination overhead.

## Alternatives Considered

**Inline assembly in KnowledgeService**: Rejected. As the pack grows (Day 6
will add previousInsights), inline logic becomes hard to test and maintains no
clear boundary between data-fetching and assembly responsibilities.

**Separate ContextPackService module**: Considered, but rejected as premature.
ContextBuilderService is a thin composition helper; it does not warrant its
own NestJS module. Keeping it inside KnowledgeModule avoids unnecessary module
boundary overhead.

**Including full source entities in timeline entries**: Rejected. The timeline
entries in the ContextPack carry only `type`, `summary`, `occurredAt`,
`sourceType`, and `sourceId`. Full source entities (pullRequest, observation)
are already reachable through the evidenceMap and the observations array. Sending
duplicate data bloats the context window and increases hallucination risk.

## Consequences

Positive

ContextBuilderService is a pure function over its inputs -- fully testable
without any mocks or database access. 19 tests cover all field mappings,
evidence resolution, and edge cases.

The AI layer receives a single coherent JSON object with everything it needs:
facts, their evidence map, the chronological narrative (timeline), and the
human context (observations). No additional API calls required.

Negative

KnowledgeService now injects 6 dependencies (DevelopersService, MetricsService,
ObservationsRepository, TimelineRepository, FactsService, ContextBuilderService).
This is at the upper limit of acceptable DI depth. If the pack grows further,
consider extracting a `ContextDataFetcher` service to consolidate the parallel
data-fetching calls.

## Future Revisions

Day 6: add `previousInsights: ContextPackInsight[]` to the ContextPack so the
AI layer can avoid repeating insights already generated for the period.

Phase 2: consider caching the ContextPack (short TTL, keyed by
developerId+periodStart+periodEnd) to reduce repeated DB reads during
insight generation retries.

---

## ADR-008

Date: 2026-06-29

Status: Accepted

### Context

Day 6 requires a local LLM to generate evidence-based coaching Insights and
Talking Points from the ContextPack produced by the Knowledge Engine.

Three options were evaluated:

1. OpenAI API (GPT-4o or GPT-3.5-turbo): strong output quality, but requires
   a cloud API key, incurs per-token cost, and sends developer performance data
   to a third party. Unacceptable for privacy-sensitive HR data without explicit
   customer consent.

2. Ollama + quantised open-source model: fully local, zero API cost, no data
   leaves the machine. Requires Ollama to be installed and the chosen model to
   be pulled. Suitable for local development and self-hosted deployments.

3. Embedded ONNX / llama.cpp: tighter integration but significantly higher
   maintenance burden and no NestJS-native solution.

### Decision

Use **Ollama** as the local LLM runtime with **qwen2.5-coder:7b** as the
default model. Ollama is controlled via a simple HTTP API (`POST /api/chat`).
The model tag is configurable via `OLLAMA_MODEL` env var.

A new **AiModule** encapsulates all LLM infrastructure:

* `OllamaProvider` -- HTTP client, `AbortController`-based timeout, structured logging.
* `PromptBuilderService` -- pure transformation; converts ContextPack to system + user prompts.
* `InsightParserService` -- pure validation; parses and structurally validates LLM JSON output.

Only `InsightsModule` imports `AiModule`. No other module may depend on it.

The `OPENAI_API_KEY` env var is retained as optional for potential future use
but is not wired to any provider in Day 6.

### factId Validation Rules (supersedes any informal prior agreement)

Rule 3: After parsing, validate each insight's `factIds` against the ContextPack.
  - `validFactIds`: IDs that exist in `pack.facts` -- these are persisted.
  - `unknownFactIds`: IDs not found -- logged as warning, never persisted.

Rule 4: If an insight has zero valid factIds after validation, discard it and
log a warning. Do not throw -- only abort generation if ALL insights are discarded.

### Consequences

Positive

* Zero cloud cost and zero data egress for local development.
* AiModule is fully isolated; swapping Ollama for another provider requires
  changing only OllamaProvider, not InsightsService or InsightsModule.
* Prompt and parser are pure services -- 100% unit-testable without mocking HTTP.
* factId validation is split correctly: parser handles structure, InsightsService
  handles semantic validation against the live ContextPack.

Negative

* Requires Ollama to be installed locally (`brew install ollama` / winget).
* Requires the model to be pulled (`ollama pull qwen2.5-coder:7b` -- ~4 GB).
* LLM responses are non-deterministic; occasional invalid JSON or hallucinated
  factIds are expected and handled gracefully.
* Synchronous HTTP endpoint is a temporary shortcut -- Phase 5 will move
  generation into a BullMQ job for timeout resilience.

## Future Revisions

Phase 5: Move `InsightsService.generate()` into a BullMQ job so the HTTP
endpoint returns a job ID immediately and the client polls for results.

Phase 5: Add retry logic in `OllamaProvider` (exponential backoff, max 3 attempts)
for transient network errors.

Post-MVP: evaluate replacing Ollama with a hosted inference endpoint (e.g. Groq,
Together AI) when customers require cloud deployment, with an adapter pattern
so InsightsService remains unchanged.

---


---

# ADR-009

Date

2026-07-02

Status

Accepted

## Context

Day 7 introduced the frontend layer. Multiple significant architectural decisions were
made implicitly during development: how to fetch data, where to place business logic,
how to manage server state, and how to handle the AI disclaimer requirement from the
Engineering Constitution (Article VI and Article XVIII).

Zero frontend ADRs existed before this record. The Engineering Constitution (Article
XIII) requires explicit documentation of architectural decisions. This ADR captures
the four most consequential frontend decisions made during Day 7.

## Decision

**1. Client-only data fetching with TanStack Query v5.**

All API calls are made from client components using TanStack Query. No Server
Components fetch data. No React Server Actions are used.

Rationale: LeadPilot is a single-user admin tool accessed by an authenticated team
lead. There is no SEO requirement, no first-paint data requirement, and no requirement
for streaming HTML. Client-side fetching with TanStack Query gives us shared cache,
deduplication, automatic retries, and skeleton-loader patterns that are appropriate
for a data-heavy tool. Server Components would add complexity (cookie forwarding,
streaming boundaries, error handling across RSC/client boundaries) with no user-facing
benefit at this stage.

**2. Service/Hook/Component layering.**

Frontend data access follows a strict three-layer architecture:
- `services/` — raw API calls, no React, no TanStack Query
- `hooks/` — TanStack Query wrappers, query key management, cache invalidation
- `components/` — consume hooks only, no direct service calls

No component may call `api.*` directly. No service may import from React or TanStack
Query. This mirrors the backend's Controller/Service/Repository separation and makes
each layer independently testable.

**3. AI disclaimer is persistent and non-dismissible.**

The `AiDisclaimer` component (shown on the Insights tab above all AI-generated content)
is permanently visible and cannot be dismissed by the user. This implements Article VI
(AI assists, never replaces leadership) and Article XVIII (build for explainability) of
the Engineering Constitution at the UI level.

Alternatives considered: dismissible banner (rejected — hides the limitation after first
view, undermining the constitution's intent), footer text (rejected — too easy to miss),
tooltip on each InsightCard (rejected — too disruptive to reading flow).

**4. Paginated backend responses are consumed with a high-limit fetch for MVP.**

The backend returns all list endpoints as paginated envelopes
(`{data: T[], total, page, limit, totalPages}`). For the MVP, the frontend fetches with
a high default limit (100 items) and unwraps `.data`, treating the response as a full
list. Infinite scroll and cursor-based pagination are Phase 2.

Note: the initial Day 7 implementation incorrectly typed these responses as flat arrays
(`T[]`), causing a runtime contract mismatch. This was identified during the Day 7 review
(2026-07-02) and must be corrected before user testing.

## Alternatives Considered

**Next.js Server Components with RSC data fetching**: Rejected for MVP. Introduces
streaming boundaries, auth cookie forwarding complexity, and layout-level error handling
that is not needed for a single-user admin tool. Revisit in Phase 3.

**SWR instead of TanStack Query**: Rejected. TanStack Query v5 has stronger support for
`useInfiniteQuery`, more explicit cache invalidation, and better TypeScript integration.
The observation CRUD flow (create → invalidate timeline + observations) benefits from
TanStack Query's granular invalidation API.

**Inline API calls in components**: Rejected. Violates the service/hook/component
boundary and makes queries untestable without mounting the full component tree.

## Consequences

Positive

- Each layer is independently testable: services via HTTP mocks, hooks via QueryClient
  wrappers, components via hook mocks.
- TanStack Query cache prevents redundant network requests when navigating between
  developer profile tabs.
- The three-layer boundary is explicit — adding a new data source requires a new service
  method, a new hook, and a new component section, in that order. No ambiguity.
- The persistent AiDisclaimer is constitutionally correct and requires no future
  state management.

Negative

- No SSR/SSG for initial page load — the first render is always a skeleton loader.
  Acceptable for an admin tool, not acceptable for a public-facing product.
- High-limit fetch (limit=100) is a pragmatic shortcut — large teams (>100 developers)
  will hit this ceiling in Phase 2. Proper pagination required before GA.
- Client-only fetching means data is only visible after JavaScript has loaded and
  hydrated. Zero graceful degradation without JS.

## Future Revisions

Phase 2: Implement infinite scroll in ObservationList and InsightList using
`useInfiniteQuery`. Replace high-limit shortcut with proper cursor-based pagination.

Phase 3: Evaluate migrating heavy read views (DeveloperOverview) to Next.js Server
Components once auth (JwtAuthGuard) is implemented and cookie forwarding is straightforward.

Phase 3: Add React error boundaries at the dashboard layout level and per-tab level
to prevent full-page crashes from isolated component failures.

---

# Rules for Future ADRs

Create a new ADR whenever a decision changes:

Architecture

Domain Model

Module boundaries

AI behavior

Knowledge Engine

Database design

Timeline model

Observation model

Report generation

Background job strategy

Authentication strategy

API design

Do not create ADRs for small implementation details.

Only record decisions that influence the long-term architecture of the product.

---

# AI Instructions

Before proposing a significant architectural change, every AI agent must:

1. Read this document.

2. Check whether an ADR already exists.

3. If the proposal conflicts with an accepted ADR:

   Explain why.

   Present trade-offs.

   Ask for approval.

4. Never silently replace an accepted architectural decision.

Architecture evolves through explicit decisions, not accidental code changes.
