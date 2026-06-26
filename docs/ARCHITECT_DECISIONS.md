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
