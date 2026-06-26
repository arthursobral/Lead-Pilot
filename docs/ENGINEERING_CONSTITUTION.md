# Engineering Constitution

## Purpose

This document defines the immutable principles that govern LeadPilot.

Everything else in the project may evolve:

* Architecture
* Technology
* Frameworks
* APIs
* AI Models
* Database Design
* User Interface

These principles must not.

Whenever there is uncertainty, this document takes precedence.

If a proposed implementation violates this constitution, the implementation must change.

Not the constitution.

---

# Preamble

LeadPilot exists to help Engineering Leaders become better coaches.

The platform should increase understanding.

Not control.

It should improve conversations.

Not surveillance.

It should preserve context.

Not create judgment.

Every engineering decision should reinforce this vision.

---

# Article I

## Developers are people, not metrics.

Metrics are signals.

They are never conclusions.

No metric should ever be interpreted as a measure of a person's value.

---

# Article II

## Context is more valuable than activity.

A single customer compliment may be more important than one hundred merged pull requests.

Human observations always matter.

The system exists to preserve context.

Not simply collect activity.

---

# Article III

## AI must explain its reasoning.

Every AI-generated insight must be traceable to evidence.

Insights should reference:

Signals

Observations

Facts

Timeline Events

Metric Snapshots

If evidence is weak, the AI should explicitly state that confidence is limited.

---

# Article IV

## The platform must never rank developers.

No feature should compare developers against each other.

No leaderboard.

No percentile.

No ranking.

No hidden ranking.

No implied ranking.

Developers should only be compared against their own historical context.

---

# Article V

## The platform must never calculate productivity.

LeadPilot intentionally avoids productivity metrics.

Examples of forbidden concepts:

Productivity Score

Developer Score

Performance Rating

Efficiency Ranking

Velocity Ranking

Daily Output Score

These concepts are permanently out of scope.

---

# Article VI

## AI assists leadership.

AI never replaces leadership.

The Team Lead remains responsible for:

Coaching

Recognition

Feedback

Decision making

Career conversations

The AI provides context.

Humans make decisions.

---

# Article VII

## Every insight should encourage conversation.

The preferred output of the system is not a conclusion.

It is a better question.

Good examples:

"What changed this week?"

"Should this achievement be recognized?"

"Would it be useful to discuss recent workload?"

"Has this engineer been taking more ownership recently?"

---

# Article VIII

## Human observations have first-class status.

Manual observations are one of the most valuable sources of information.

Observations should never be treated as secondary to GitHub activity.

The platform exists because engineering work cannot be fully understood through code alone.

---

# Article IX

## Preserve trust.

The platform should never create fear.

The interface should encourage:

Recognition

Growth

Reflection

Support

Coaching

Avoid language that suggests surveillance or judgment.

---

# Article X

## Evidence before interpretation.

The platform should always follow this order:

Signals

↓

Observations

↓

Timeline

↓

Facts

↓

Knowledge

↓

Insights

↓

Talking Points

Interpretation should always happen after evidence has been gathered.

---

# Article XI

## Simplicity over cleverness.

When multiple implementations exist:

Prefer the simpler one.

Readable code is more valuable than clever code.

Small services are preferred over large abstractions.

The project should remain understandable to new contributors.

---

# Article XII

## Long-term maintainability.

LeadPilot should still be understandable five years from now.

Every implementation should optimize for:

Readability

Maintainability

Explainability

Testability

Explicitness

Not for writing the least amount of code.

---

# Article XIII

## Architectural decisions are explicit.

Architecture should never change accidentally.

Major changes require:

Discussion

Documentation

A new ADR in:

docs/ARCHITECT_DECISIONS.md

No silent architectural drift.

---

# Article XIV

## AI is part of the engineering team.

The AI is expected to think like a Staff Software Engineer.

Before writing code it should:

Understand the problem.

Review documentation.

Consider alternatives.

Explain trade-offs.

Request approval for significant architectural changes.

Generate production-quality code.

Review its own work.

---

# Article XV

## Documentation is part of the product.

A feature is not complete until:

Implementation exists.

Tests exist.

Documentation is updated.

Project state is updated.

If architecture changed:

A new ADR exists.

Documentation is never optional.

---

# Article XVI

## Protect the product identity.

LeadPilot is:

✓ AI Copilot

✓ Coaching Platform

✓ Leadership Assistant

✓ Context Engine

✓ Team Memory

LeadPilot is not:

✗ Productivity Tracker

✗ Employee Monitoring Tool

✗ Performance Scoring Platform

✗ HR Decision Engine

Every new feature must strengthen this identity.

---

# Article XVII

## Every feature must answer one question.

Before implementing any feature, ask:

Which leadership problem does this solve?

If the answer is unclear, the feature probably should not exist.

Examples:

Preparing for a 1:1

Recognizing achievements

Understanding historical context

Supporting coaching

Improving leadership decisions

---

# Article XVIII

## Build for explainability.

Every important decision made by the system should be explainable.

Users should understand:

Where information came from.

How conclusions were formed.

What evidence exists.

Explainability is a product feature.

---

# Article XIX

## Preserve developer dignity.

The platform should help developers grow.

Not make them feel watched.

Every interaction should reinforce trust.

Every recommendation should encourage development.

Never shame.

Never blame.

Never label.

---

# Article XX

## The Mission

LeadPilot exists to help engineering leaders understand people, not just code.

Every architectural decision, every feature, every AI prompt, and every line of code should move the product closer to this mission.

If a future implementation conflicts with this mission, the implementation should change.

The mission should not.

---

# Constitutional Amendment Process

This constitution is intentionally difficult to change.

Any amendment should require:

1. A clear product rationale.
2. An Architecture Decision Record (ADR).
3. An update to PRODUCT_VISION.md if applicable.
4. An update to PROJECT_CONTEXT.md if applicable.

Changes should be rare.

Consistency is one of LeadPilot's greatest strengths.

---

# Final Principle

When there is uncertainty, ask one question:

> "Will this help a Team Lead better understand and support another human being?"

If the answer is yes, continue.

If the answer is no, reconsider the solution.
