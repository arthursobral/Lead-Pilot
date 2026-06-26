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

Day 5 — Knowledge Engine

Current Focus

Transform the Timeline + Metrics + Observations into structured context packs
for AI consumption. No direct LLM interaction yet.

Current Goal

Implement the Knowledge Engine: aggregate developer context (signals, metrics,
observations) into structured Facts that will feed the AI layer in Day 6.

---

# Completed Milestones

## Day 1

Status

✅ Completed

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

✅ Completed

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

✅ Completed

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

✅ Completed

Deliverables

* Observation module — CRUD, soft-delete, pagination, filtering (by type, severity, date range)
* Observation → TimelineEntry atomic write (Prisma $transaction)
* TimelineRepository — paginated reads with full TIMELINE_INCLUDE shape
* TimelineService — returns PaginatedTimelineResponseDto via mapper
* TimelineController — GET /developers/:id/timeline, POST /developers/:id/timeline/rebuild
* TimelineBuilderService — pure composition service, no DB access, deterministic
* Timeline mapper — source derivation from FK columns, Date → ISO string serialization
* Filtering: type, source (entity origin), from/to date range
* 225 tests passing, 0 failures

---

# Current Sprint

## Sprint Goal

Build the Knowledge Engine.

Modules:

* Facts
* Knowledge Context
* Context Packs

---

## In Progress

Knowledge Engine

Status

⬜ Not Started

Tasks

* Define Fact domain model
* Implement FactRepository
* Implement KnowledgeService (aggregate Timeline + Metrics + Observations → Facts)
* Context Pack generation
* API endpoints

---

# Upcoming Milestones

## Day 5

Knowledge Engine

Purpose

Transform Timeline + Metrics + Observations into structured context packs for AI.

No direct LLM interaction yet.

---

## Day 6

AI Engine

Deliverables

* Context Packs
* Prompt Builder
* Insight Generation
* Talking Points
* Risk Detection

---

## Day 7

Reports

Dashboard Polish

Weekly Reports

Developer Summary

Team Summary

---

# Current Architecture

```text
GitHub
        ↓

Pull Requests
        ↓

Reviews
        ↓

Metrics Engine
        ↓

Metric Snapshots

        +

Observations
        ↓

Timeline

        ↓

Knowledge Engine (Not Started)

        ↓

Facts (Not Started)

        ↓

AI Insights (Not Started)

        ↓

Reports (Not Started)
```

---

# Current Domain Model

Implemented

✅ Developer

✅ Pull Request

✅ Pull Request Review

✅ Metric Snapshot

In Progress

✅ Observation

✅ Timeline Entry

Not Started

⬜ Fact

⬜ Knowledge Context

⬜ Insight

⬜ Talking Point

⬜ Weekly Report

---

# Known Technical Debt

Current Technical Debt

* Timeline rebuild uses N individual `create` calls instead of `createMany` -- acceptable for admin path, optimize in Phase 5 if needed.
* Timeline rebuild endpoint is synchronous -- Phase 5: move to BullMQ job for large histories.
* GitHub sync currently supports GitHub only.
* Authentication is minimal -- Phase 5: add JwtAuthGuard to Timeline and Observation endpoints.
* Knowledge Engine not implemented yet.

Priority

Low

No blocking technical debt exists before Day 5.

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

The AI is currently used only as a software engineering assistant.

LeadPilot itself does **not** generate AI insights yet.

The AI module begins on Day 6.

Before Day 6:

Do not create:

* Insight generation
* Prompt Builder
* Knowledge Engine
* Facts
* Talking Points

Unless explicitly requested.

---

# Definition of Ready

The project is considered ready for Day 5 when:

* Observation CRUD is complete.
* Timeline API is complete.
* Timeline Builder exists.
* Timeline pagination works.
* Timeline filtering works.
* Signal timeline entries are generated automatically.
* Observation timeline entries are generated transactionally.
* Tests pass.
* Backend builds successfully.
* Frontend can consume timeline endpoints.

---

# Active Architectural Decisions

Reference:

docs/ARCHITECT_DECISIONS.md

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

Begin Day 5 — Knowledge Engine.

Implement:

* Fact domain model and Prisma schema
* FactRepository
* KnowledgeService (aggregate Timeline + Metrics + Observations into Facts)
* Context Pack generation
* API: GET /developers/:id/facts, GET /developers/:id/context-pack

Day 4 is complete. All 194 tests pass. The Timeline is ready to feed the Knowledge Engine.
