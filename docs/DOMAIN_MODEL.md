# Domain Model

## Purpose

This document defines the core domain model for LeadPilot.

LeadPilot is an AI Copilot for Engineering Leaders.

The product helps Team Leads understand developer context by combining technical signals, human observations, developer timelines, knowledge extraction, and AI-generated coaching insights.

This document should be used by Claude and any AI coding assistant as a source of truth before implementing features.

---

# Core Domain Philosophy

LeadPilot is not a productivity tracker.

LeadPilot does not measure developer worth.

LeadPilot does not rank people.

LeadPilot does not create performance scores.

LeadPilot exists to preserve context and help engineering leaders have better coaching conversations.

The domain model must always protect this principle.

---

# High-Level Domain Flow

```text
Team Lead
   ↓
Developer
   ↓
Signals + Observations
   ↓
Timeline
   ↓
Knowledge Engine
   ↓
Facts
   ↓
Insights
   ↓
Talking Points
   ↓
Better 1:1 Conversations
```

---

# Core Entities

## 1. Team Lead

A Team Lead is the primary user of the product.

The Team Lead uses LeadPilot to:

* Understand what happened during a given period
* Prepare for 1:1 meetings
* Register observations
* Review developer context
* Identify coaching opportunities
* Recognize achievements
* Track growth over time

A Team Lead should never use the platform to rank, score, or punish developers.

---

## 2. Developer

A Developer is the person being contextualized by the system.

A Developer can have:

* GitHub signals
* Human observations
* Timeline entries
* Facts
* AI-generated insights
* Talking points
* Achievements
* Growth areas

Important rule:

A Developer is never reduced to metrics.

Metrics are only signals.

---

## 3. Signal

A Signal is automatically collected technical activity.

Examples:

* GitHub Pull Request
* GitHub Review
* Merge activity
* Repository activity
* Future Jira issue
* Future Slack activity
* Future deployment event

Signals are objective data points, but they do not explain intent or context by themselves.

A Signal should never be interpreted alone as performance.

---

## 4. Observation

An Observation is manually registered human context.

Observations are one of the most important parts of LeadPilot.

Examples:

* Customer praised the developer
* Developer handled a difficult client call
* Developer mentored another engineer
* Developer showed strong ownership
* Developer struggled with communication
* Developer needed support during a delivery
* Developer led an incident response
* Developer helped unblock a teammate

Observations are subjective but valuable.

They should always be stored with enough context to be useful later.

---

# Observation Types

Recommended observation types:

```text
ACHIEVEMENT
CUSTOMER_FEEDBACK
COACHING_OPPORTUNITY
CONCERN
LEADERSHIP
MENTORING
COMMUNICATION
INCIDENT
OWNERSHIP
CONTEXT
```

---

# Observation Severity

Severity should describe impact, not judgment.

Recommended severity levels:

```text
LOW
MEDIUM
HIGH
```

Examples:

LOW:

* Small positive note
* Minor context update

MEDIUM:

* Relevant feedback
* Noticeable coaching opportunity
* Meaningful support given

HIGH:

* Major customer praise
* Critical incident
* Significant concern
* Strong leadership moment

---

## 5. Timeline Entry

A Timeline Entry represents something meaningful that happened in chronological order.

A Timeline combines:

* Signals
* Observations
* Achievements
* Important changes
* Insight references

The Timeline is the living history of a Developer.

The Timeline should answer:

```text
What happened over time?
```

The Timeline should not answer:

```text
Is this developer good or bad?
```

---

# Timeline Entry Types

Recommended timeline entry types:

```text
SIGNAL
OBSERVATION
ACHIEVEMENT
INSIGHT
REPORT
MILESTONE
```

---

## 6. Metric Snapshot

A Metric Snapshot is an aggregated view of technical activity for a specific period.

Examples:

* Average PR size
* Average merge time
* Number of PRs opened
* Number of PRs merged
* Reviews given
* Reviews received
* Repository focus
* Activity trend

Metric Snapshots are used to detect patterns.

They must not be used to generate productivity scores.

Important rule:

Metrics are context, not conclusions.

---

## 7. Knowledge Engine

The Knowledge Engine is the core reasoning layer of the product.

It transforms raw information into structured context before sending anything to an LLM.

Inputs:

* Signals
* Observations
* Timeline entries
* Metric snapshots
* Previous insights
* Reports

Outputs:

* Facts
* Context packs
* Evidence maps
* AI-ready summaries

The Knowledge Engine should reduce hallucination by grounding AI output in stored evidence.

---

# Knowledge Engine Responsibilities

The Knowledge Engine should:

* Gather relevant context for a Developer
* Build a chronological view of recent activity
* Identify important observations
* Summarize metrics carefully
* Extract factual statements
* Preserve evidence references
* Build structured prompts for AI insight generation

The Knowledge Engine should not:

* Judge developers
* Rank developers
* Make performance decisions
* Generate unsupported conclusions

---

## 8. Fact

A Fact is a structured statement extracted from evidence.

Facts help the system reason more safely.

Examples:

```text
Arthur received positive customer feedback on 2026-06-10.
```

```text
Maria reviewed 18 pull requests during the last 30 days.
```

```text
João led a production incident response last week.
```

```text
Ana has multiple observations related to mentoring.
```

A Fact must always have:

* Statement
* Source
* Confidence
* Date or period
* Related developer

---

# Fact Confidence

Recommended confidence levels:

```text
LOW
MEDIUM
HIGH
```

HIGH:

* Direct human observation
* Direct GitHub data
* Explicit customer feedback

MEDIUM:

* Pattern supported by multiple signals
* Repeated observations

LOW:

* Weak trend
* Limited data
* Single ambiguous event

---

## 9. Insight

An Insight is an AI-generated interpretation based on Facts, Metrics, Observations, and Timeline context.

Insights must be careful, explainable, and evidence-based.

Insights should help a Team Lead understand possible patterns.

Examples:

```text
Arthur may be taking on more customer-facing responsibility.
```

```text
Ana appears to be contributing strongly through code reviews and mentoring.
```

```text
João may benefit from support around breaking large changes into smaller PRs.
```

Insights must not be written as absolute truth.

---

# Insight Types

Recommended insight types:

```text
POSITIVE_SIGNAL
COACHING_OPPORTUNITY
RISK
GROWTH_PATTERN
RECOGNITION
WORKLOAD_SIGNAL
COMMUNICATION_SIGNAL
LEADERSHIP_SIGNAL
```

---

## 10. Talking Point

A Talking Point is a suggested topic for a 1:1 conversation.

Talking Points are one of the most important outputs of LeadPilot.

Examples:

```text
Recognize the customer praise received last week.
```

```text
Ask how the recent production incident felt from their perspective.
```

```text
Discuss whether large PRs are creating review bottlenecks.
```

```text
Explore whether they want to take more ownership in client-facing work.
```

Talking Points should be supportive, specific, and actionable.

---

## 11. Achievement

An Achievement is a meaningful positive moment worth remembering.

Examples:

* Customer praise
* Incident ownership
* Mentoring contribution
* Major delivery
* Technical leadership
* Knowledge sharing
* Successful migration
* Unblocking another engineer

Achievements should appear prominently in the Timeline and Reports.

---

## 12. Growth Area

A Growth Area is a potential development opportunity.

Examples:

* Communication
* Planning
* Code review quality
* PR size
* Technical ownership
* Mentoring
* Architecture
* Customer communication
* Autonomy

Growth Areas should never be framed negatively.

Preferred wording:

```text
Potential growth area
```

Avoid:

```text
Weakness
```

---

## 13. Report

A Report is a generated summary for a time period.

Examples:

* Weekly team report
* Weekly developer report
* Monthly summary
* 1:1 preparation report
* Performance review preparation draft

Reports should combine:

* Important Signals
* Observations
* Achievements
* Risks
* Talking Points
* Suggested follow-ups

Reports should always preserve evidence references.

---

# Relationships

## Team Lead to Developer

A Team Lead manages or follows multiple Developers.

```text
TeamLead 1 → many Developers
```

---

## Developer to Signals

A Developer has many Signals.

```text
Developer 1 → many Signals
```

---

## Developer to Observations

A Developer has many Observations.

```text
Developer 1 → many Observations
```

---

## Developer to Timeline

A Developer has many Timeline Entries.

```text
Developer 1 → many TimelineEntries
```

---

## Timeline to Knowledge Engine

Timeline entries feed the Knowledge Engine.

```text
TimelineEntries → KnowledgeEngine
```

---

## Knowledge Engine to Facts

The Knowledge Engine creates Facts.

```text
KnowledgeEngine → Facts
```

---

## Facts to Insights

Facts support Insights.

```text
Facts → Insights
```

---

## Insights to Talking Points

Insights generate Talking Points.

```text
Insights → TalkingPoints
```

---

## Talking Points to 1:1

Talking Points help Team Leads have better 1:1 conversations.

```text
TalkingPoints → Better Conversations
```

---

# Recommended MVP Domain Objects

For the MVP, implement only the following domain objects:

```text
Developer
PullRequest
PullRequestReview
MetricSnapshot
Observation
TimelineEntry
Fact
Insight
WeeklyReport
```

Do not implement the full future domain too early.

---

# Suggested MVP Data Flow

```text
1. GitHub Sync Job imports Pull Requests and Reviews.

2. Metrics Job creates Metric Snapshots.

3. Team Lead manually creates Observations.

4. Timeline Job combines Signals and Observations.

5. Knowledge Engine builds Developer Context Packs.

6. AI Insight Job generates Insights and Talking Points.

7. Weekly Report Job summarizes the team.
```

---

# Context Pack

A Context Pack is the structured object sent to the AI layer.

The LLM should receive Context Packs, not raw database records.

Example:

```json
{
  "developer": {
    "id": "dev_123",
    "name": "Arthur",
    "role": "Backend Developer"
  },
  "period": {
    "start": "2026-06-01",
    "end": "2026-06-30"
  },
  "metrics": {
    "pullRequestsMerged": 12,
    "averageMergeTimeHours": 18,
    "reviewsGiven": 21,
    "reviewsReceived": 8,
    "averagePullRequestSize": 240
  },
  "observations": [
    {
      "type": "CUSTOMER_FEEDBACK",
      "severity": "HIGH",
      "summary": "Customer praised Arthur for clear communication during a critical call.",
      "date": "2026-06-10"
    }
  ],
  "facts": [
    {
      "statement": "Arthur received positive customer feedback during the period.",
      "confidence": "HIGH",
      "sources": ["observation_123"]
    }
  ],
  "previousInsights": []
}
```

---

# AI Output Shape

AI insight output should be structured.

Example:

```json
{
  "summary": "Arthur showed signs of strong customer-facing ownership this period.",
  "positiveSignals": [
    {
      "title": "Customer-facing communication",
      "description": "Arthur received positive customer feedback for clear communication.",
      "evidence": ["observation_123"]
    }
  ],
  "coachingOpportunities": [
    {
      "title": "Sustainability of customer-facing work",
      "description": "It may be useful to ask whether the recent customer-facing responsibilities are manageable.",
      "evidence": ["observation_123"]
    }
  ],
  "risks": [],
  "talkingPoints": [
    "Recognize the positive customer feedback.",
    "Ask whether Arthur wants to continue taking on more client-facing responsibility."
  ]
}
```

---

# Language Rules

The product must use careful language.

Preferred:

```text
This may suggest...
One possible interpretation is...
A useful topic for the next 1:1 could be...
Based on the available context...
There may be an opportunity to...
```

Avoid:

```text
This proves...
This developer is bad...
This developer is underperforming...
This developer is better than...
This developer should be promoted...
This developer should be fired...
```

---

# Domain Boundaries

LeadPilot may help with:

* Coaching
* Recognition
* Context preservation
* 1:1 preparation
* Growth conversations
* Risk awareness
* Leadership support

LeadPilot must not do:

* Performance scoring
* Forced ranking
* Productivity tracking
* Automated HR decisions
* Compensation recommendations
* Promotion decisions
* Termination suggestions

---

# Claude Implementation Guidance

When implementing features, Claude should always ask:

```text
Which domain concept does this belong to?
```

Examples:

GitHub PR ingestion belongs to:

```text
Signal
```

Manual feedback belongs to:

```text
Observation
```

Chronological developer history belongs to:

```text
Timeline
```

Structured evidence belongs to:

```text
Fact
```

AI-generated interpretation belongs to:

```text
Insight
```

1:1 preparation output belongs to:

```text
Talking Point
```

Weekly summaries belong to:

```text
Report
```

---

# Final Principle

LeadPilot is a memory and coaching system for engineering leadership.

The product should help Team Leads remember what matters, understand context, and support people better.

Every domain decision must serve that purpose.
