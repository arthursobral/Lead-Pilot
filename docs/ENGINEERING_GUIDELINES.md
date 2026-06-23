# Engineering Guidelines

## Purpose

This document defines the engineering standards for LeadPilot.

Every AI agent and every contributor must follow these guidelines.

The primary goals are:

- Readability
- Maintainability
- Scalability
- Simplicity
- Predictability

When in doubt, prefer simple solutions over clever ones.

---

# Technology Stack

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- Redis
- BullMQ

## Frontend

- Next.js (App Router)
- TypeScript
- TailwindCSS
- TanStack Query
- React Hook Form
- Zod

## AI

- OpenAI API

## Infrastructure

Docker

Docker Compose

GitHub Actions

---

# Architecture

The project follows a modular monolith architecture.

Modules communicate through services.

Business logic must remain inside the backend.

The frontend is only responsible for presentation.

---

# Backend Folder Structure

src/

    app/

    common/

    config/

    database/

    jobs/

    modules/

        developers/

        github/

        metrics/

        observations/

        timeline/

        insights/

        reports/

Each module contains:

controller

service

repository

dto

types

mapper

validators

tests

---

# Layer Responsibilities

Controller

Only receives requests.

Validates input.

Calls services.

Returns responses.

Never contains business logic.

---

Service

Contains all business rules.

Coordinates repositories.

Calls external APIs.

Triggers jobs.

May call other services.

---

Repository

Only communicates with Prisma.

Never contains business logic.

---

DTO

Input validation.

Serialization.

Never contain business rules.

---

Mapper

Responsible for converting:

Database Models

↓

Domain Objects

↓

API Responses

---

# Dependency Injection

Always use NestJS dependency injection.

Never instantiate services manually.

Avoid static helper classes whenever possible.

---

# Database

Use Prisma for every database interaction.

Never write raw SQL unless absolutely necessary.

Always prefer Prisma relations.

Always use transactions when multiple writes must succeed together.

---

# Naming

Classes

PascalCase

DeveloperService

MetricsCalculator

ObservationRepository

---

Variables

camelCase

developerId

mergeTime

reviewCount

---

Constants

UPPER_SNAKE_CASE

MAX_RETRIES

DEFAULT_PAGE_SIZE

---

Files

kebab-case

developer.service.ts

github-sync.job.ts

timeline.controller.ts

---

# TypeScript Rules

Never use:

any

Prefer:

unknown

Generics

Strong typing

Every function must have an explicit return type.

---

# Functions

Functions should:

Do one thing.

Remain short.

Be easily testable.

Avoid nested conditionals.

Prefer early returns.

---

# Error Handling

Never expose internal errors.

Throw domain-specific exceptions.

Use NestJS HttpException.

Log unexpected errors.

Return friendly API responses.

---

# Logging

Every important operation should be logged.

Examples:

GitHub Sync

AI Requests

Report Generation

Background Jobs

Authentication

Errors

Use structured logging.

Never log sensitive information.

---

# Jobs

Every long-running operation should become a background job.

Examples

GitHub Sync

Metrics Calculation

AI Insight Generation

Weekly Reports

Jobs must be idempotent.

Jobs must support retries.

Jobs must emit logs.

---

# AI Integration

The OpenAI service must be isolated.

Create:

AIProvider

↓

InsightGenerator

↓

PromptBuilder

↓

ResponseParser

Never call OpenAI directly from controllers.

Never build prompts inside controllers.

---

# API Design

REST only.

Plural resources.

Examples

/developers

/observations

/insights

/reports

/timeline

Never expose implementation details.

---

# Validation

Use Zod on frontend.

Use class-validator on backend.

Never trust user input.

Always validate.

---

# Configuration

Never hardcode:

API Keys

URLs

Ports

Secrets

Everything belongs inside environment variables.

---

# Environment Variables

DATABASE_URL

REDIS_URL

OPENAI_API_KEY

GITHUB_CLIENT_ID

GITHUB_SECRET

JWT_SECRET

---

# Security

Validate every request.

Escape user content.

Rate limit public endpoints.

Use Helmet.

Enable CORS properly.

Never trust external APIs.

---

# Git

Branch names

feature/github-sync

feature/ai-insights

fix/timeline

refactor/metrics

---

Commits

feat:

fix:

refactor:

docs:

test:

chore:

Examples

feat(metrics): calculate merge time

fix(github): handle deleted repositories

---

# Testing

Every service should have unit tests.

Critical flows should have integration tests.

Repository tests are optional.

Controllers should remain thin enough to require minimal testing.

---

# Performance

Never execute N+1 queries.

Use pagination.

Batch expensive operations.

Cache external API responses when possible.

Avoid unnecessary OpenAI requests.

---

# Frontend

Pages should remain lightweight.

Move business logic into hooks.

Prefer reusable components.

Prefer composition.

Never duplicate UI.

---

# State Management

TanStack Query

↓

Server State

React State

↓

UI State

Avoid global state unless absolutely necessary.

---

# AI Code Standards

When generating code:

Always generate production-quality code.

Prefer readability.

Explain important architectural decisions.

Never overengineer.

Never introduce unnecessary abstractions.

Follow existing project conventions.

---

# Product Principles

Engineering decisions must support product principles.

This is not a productivity tracker.

Do not introduce features that:

Rank developers.

Score developers.

Measure productivity.

Encourage surveillance.

Instead, prioritize:

Context

Growth

Coaching

Recognition

Trust

---

# Definition of Done

A feature is complete when:

✅ Code compiles

✅ Tests pass

✅ Types are correct

✅ No duplicated logic

✅ API documented

✅ Logs added

✅ Errors handled

✅ UI responsive

✅ AI context updated if necessary
