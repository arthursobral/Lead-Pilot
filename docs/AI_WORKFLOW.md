# AI Workflow

## Purpose

This document defines how AI agents should work inside the LeadPilot codebase.

LeadPilot is an AI-powered coaching platform for engineering leaders.

The goal of this project is not to build a productivity tracker.

The goal is to help Team Leads understand context, prepare better conversations, recognize achievements, and identify coaching opportunities.

Every AI agent must respect the product philosophy, architecture, and engineering guidelines defined in this repository.

---

# Core Instruction

Before generating code, the AI agent must always understand the following:

LeadPilot combines:

* Engineering signals
* Human observations
* Developer timelines
* Knowledge extraction
* AI-generated coaching insights

The product must support leadership and coaching.

It must never promote surveillance, ranking, productivity scoring, or automated judgment of developers.

---

# Required Context Files

Before making significant changes, always review:

* `README.md`
* `PROJECT_CONTEXT.md`
* `PRODUCT_VISION.md`
* `ENGINEERING_GUIDELINES.md`
* `TASK_ROADMAP.md`
* `AI_WORKFLOW.md`

These files define the product, architecture, principles, and expected coding standards.

---

# AI Behavior Rules

## 1. Think like a Staff Software Engineer

The AI must prioritize:

* Simplicity
* Maintainability
* Clear boundaries
* Strong typing
* Testability
* Future scalability

Do not overengineer.

Do not create abstractions without a clear need.

---

## 2. Preserve the Product Philosophy

Never introduce features that:

* Rank developers
* Score developers
* Label developers as good or bad
* Suggest firing someone
* Automatically evaluate performance
* Encourage micromanagement

Prefer features that:

* Add context
* Support coaching
* Help prepare 1:1 meetings
* Recognize achievements
* Surface risks carefully
* Explain evidence behind insights

---

## 3. Ask for clarification only when necessary

If the next step is obvious from the documentation, proceed.

If multiple reasonable implementation paths exist, explain the trade-offs briefly and recommend one.

---

## 4. Prefer incremental changes

Never rewrite large parts of the codebase unless explicitly asked.

Prefer small, safe, reviewable changes.

When implementing features, work in this order:

1. Types
2. Database schema
3. Repository
4. Service
5. Controller/API
6. Jobs
7. Frontend
8. Tests
9. Documentation update

---

# Architecture Rules

LeadPilot follows a modular monolith architecture.

The backend must be organized by modules.

Expected backend modules:

* auth
* developers
* github
* metrics
* observations
* timeline
* knowledge
* insights
* reports
* jobs

Each backend module should usually contain:

* controller
* service
* repository
* dto
* mapper
* types
* tests

Controllers must be thin.

Services contain business logic.

Repositories contain database access.

Jobs handle asynchronous processing.

---

# Knowledge Engine Principle

The AI must treat the Knowledge Engine as a first-class architectural concept.

The Knowledge Engine is responsible for transforming raw information into structured context before any LLM call.

The correct flow is:

```text
GitHub Signals
Human Observations
Developer Timeline
Previous Insights
        ↓
Knowledge Engine
        ↓
AI Prompt Builder
        ↓
LLM Provider
        ↓
Insight Parser
        ↓
Stored Insights
```

Do not send raw, unstructured data directly to the LLM unless there is a strong reason.

Always prefer structured context packs.

---

# AI Integration Rules

Never call OpenAI directly from:

* controllers
* frontend components
* repositories

AI calls must go through dedicated services.

Recommended structure:

```text
ai/
  ai-provider.service.ts
  prompt-builder.service.ts
  response-parser.service.ts

knowledge/
  knowledge-engine.service.ts
  developer-context-builder.service.ts

insights/
  insights.service.ts
  insights.repository.ts
```

---

# Prompting Rules for Product AI

When generating insights for users, the AI must:

* Use careful language
* Avoid absolute claims
* Present conclusions as hypotheses
* Include supporting evidence
* Suggest coaching conversations
* Avoid judgmental wording

Preferred wording:

* "This may suggest..."
* "One possible interpretation is..."
* "A useful topic for the next 1:1 could be..."
* "Based on the available signals..."

Avoid wording:

* "This developer is underperforming"
* "This developer is better than others"
* "This person should be promoted"
* "This person should be removed"
* "Productivity is low"

---

# Insight Output Rules

AI-generated insights should be structured.

Preferred JSON shape:

```json
{
  "summary": "Short human-readable summary.",
  "positiveSignals": [
    {
      "title": "Customer recognition",
      "description": "The developer received positive feedback from a customer.",
      "evidence": ["Observation #123"]
    }
  ],
  "coachingOpportunities": [
    {
      "title": "Review cycle time",
      "description": "PRs recently took longer to merge.",
      "evidence": ["MetricSnapshot #456"]
    }
  ],
  "risks": [
    {
      "title": "Possible workload increase",
      "description": "Recent activity may suggest increased workload.",
      "severity": "medium",
      "evidence": ["MetricSnapshot #456", "Observation #789"]
    }
  ],
  "talkingPoints": [
    "Ask how the recent customer-facing work felt.",
    "Recognize the ownership shown during the incident."
  ]
}
```

---

# Evidence Requirement

Every insight should be traceable to at least one source.

Possible sources:

* Pull Request
* Review
* Metric Snapshot
* Observation
* Timeline Event
* Previous Insight
* Report

Do not generate unsupported claims.

If evidence is weak, say so.

---

# Frontend Rules for AI Features

The frontend must not present AI output as final truth.

Use labels such as:

* "AI-assisted insight"
* "Possible coaching topic"
* "Based on available context"
* "Suggested talking point"

Avoid labels such as:

* "Performance issue"
* "Developer score"
* "Ranking"
* "Bad performance"

---

# UX Rules

The product should feel calm, supportive, and professional.

Avoid aggressive dashboards.

Avoid red-heavy interfaces.

Avoid language that creates fear.

Prefer:

* Timeline
* Context
* Coaching
* Recognition
* Growth
* Conversation

---

# Code Generation Rules

When generating code, always:

* Use TypeScript
* Avoid `any`
* Add explicit return types
* Keep functions small
* Use dependency injection
* Follow NestJS conventions
* Follow Next.js App Router conventions
* Use Prisma for database access
* Validate inputs
* Handle errors
* Keep code readable

---

# Testing Expectations

For backend services:

* Add unit tests for business logic
* Mock external APIs
* Mock OpenAI calls
* Test failure paths
* Test empty data scenarios

For AI features:

* Test prompt builders
* Test response parsers
* Test invalid AI responses
* Test missing evidence
* Test safe language constraints

---

# Background Jobs

Use jobs for:

* GitHub sync
* Metrics calculation
* Knowledge extraction
* AI insight generation
* Weekly reports

Jobs must be:

* Idempotent
* Retryable
* Logged
* Safe to run multiple times

Never perform long-running work inside HTTP requests.

---

# Data Safety

Sensitive user data must be handled carefully.

Never log:

* API keys
* GitHub tokens
* OpenAI keys
* Personal private notes
* Raw customer feedback with sensitive content

When sending information to the LLM, send only the context required for the task.

---

# Development Process for AI Agents

For any non-trivial task, respond internally with this approach:

1. Understand the feature.
2. Identify affected modules.
3. Check existing patterns.
4. Propose minimal implementation.
5. Implement backend first.
6. Implement frontend second.
7. Add tests.
8. Update documentation if needed.

---

# Preferred Implementation Style

Prefer this:

```text
Small service
Clear method names
Typed DTOs
Repository abstraction
Simple controller
Predictable tests
```

Avoid this:

```text
Large files
Mixed responsibilities
Business logic in controllers
Direct Prisma calls everywhere
Direct OpenAI calls in feature modules
Hardcoded prompts
Unvalidated JSON
```

---

# AI Agent Checklist Before Finishing

Before considering a task complete, verify:

* Does the code follow the product philosophy?
* Does it avoid productivity scoring?
* Are controllers thin?
* Is business logic in services?
* Is data access isolated?
* Are types explicit?
* Are errors handled?
* Are AI outputs evidence-based?
* Are prompts separated from controllers?
* Are tests included where useful?
* Is documentation updated if needed?

---

# Final Rule

LeadPilot should help leaders become better coaches.

Every technical decision should support that mission.
