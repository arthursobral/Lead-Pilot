# Project Context

## Purpose

LeadPilot is an AI-powered coaching platform for Engineering Leaders.

The platform combines engineering activity with human observations to generate meaningful coaching insights.

The system exists to support better leadership decisions.

It does **not** evaluate people.

It provides context.

---

# Product Philosophy

Every decision made by this software must respect these principles.

## Principle 1

People are more important than metrics.

Metrics provide signals.

Humans provide context.

AI combines both.

---

## Principle 2

Never generate productivity scores.

Developers should never receive a numerical score.

---

## Principle 3

Never rank developers.

The product compares trends, not people.

---

## Principle 4

AI provides hypotheses.

The Team Lead makes decisions.

---

## Principle 5

Always explain why.

Every AI insight should include evidence.

Never generate conclusions without supporting signals.

---

# Target Audience

Primary

* Team Leads

Secondary

* Engineering Managers
* Staff Engineers
* Head of Engineering

---

# Current MVP Scope

## GitHub

Import:

* Pull Requests
* Reviews
* Basic repository information

---

## Dashboard

Each developer has:

* Profile
* Metrics
* Timeline
* Human Events
* AI Insights

---

## Human Events

Team Leads can manually register observations.

Examples:

Customer praised communication.

Developer handled production incident.

Mentored another engineer.

Needed additional support.

Excellent ownership.

Communication issue.

Technical leadership.

Knowledge sharing.

These events become part of the AI context.

---

## AI Insights

Inputs

* GitHub Metrics
* Human Events

Outputs

* Coaching opportunities

* Positive highlights

* Potential risks

* Suggested discussion topics

---

# Data Layers

The platform has four logical layers.

Layer 1

Raw Engineering Data

Examples

GitHub Pull Requests

GitHub Reviews

---

Layer 2

Engineering Metrics

Examples

Average PR Size

Merge Time

Review Participation

Repository Activity

---

Layer 3

Human Context

Manual observations

Achievements

Customer feedback

Incidents

Leadership moments

---

Layer 4

AI Intelligence

Coaching Suggestions

Weekly Reports

Trend Analysis

Conversation Starters

---

# Architecture Principles

Business logic belongs inside services.

Controllers should remain thin.

Repositories abstract data access.

Background jobs process asynchronous work.

The frontend never performs business calculations.

---

# AI Responsibilities

The AI should:

Summarize information.

Identify patterns.

Highlight changes.

Suggest coaching topics.

Recognize achievements.

Explain observations.

The AI must never:

Rank developers.

Suggest promotions automatically.

Suggest termination.

Measure productivity.

Replace human judgment.

---

# UX Principles

The interface should feel calm.

Avoid dashboards full of numbers.

Focus on conversations.

Highlight context before metrics.

Always explain why an insight exists.

Reduce cognitive load.

---

# Product Success

A Team Lead should be able to prepare for a 1:1 meeting in less than five minutes.

That is the primary success metric of this product.

---

# Future Vision

LeadPilot should evolve into the daily operating system for Engineering Leaders.

Eventually the platform should understand:

Engineering activity.

Human feedback.

Career progression.

Leadership effectiveness.

Team health.

Knowledge sharing.

All while maintaining developer trust.

Every new feature should reinforce this vision.
