# Unified Dashboard API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the legacy dashboard crawler with one stats-focused dashboard endpoint and keep detailed resources separately paginated.

**Architecture:** A shared dashboard service orchestrates bounded project/group pages, runner inventory, latest pipeline rows, and Enterprise group analytics. Existing resource routes remain focused on pagination; optional upstream capabilities produce warnings instead of hard 404s.

**Tech Stack:** Next.js App Router, TypeScript, Redux Toolkit, GitLab REST API, GitLab GLQL analytics, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-05-unified-dashboard-api-design.md`

## Global Constraints

- Keep GitLab credentials server-side and prefer `GITLAB_API_TOKEN`.
- Do not crawl every project during the initial dashboard request.
- Preserve explicit warnings when the token or GitLab version cannot provide a capability.

## Review Focus

- Upstream global pipeline 404: dashboard returns usable data plus a warning, not HTTP 404.
- Analytics 403/404: visible rows and other cards remain available.
- Aggregate totals versus visible-page rows: cards use aggregate stats.
- Auditor runner inventory: online/offline counts come from the complete inventory.
- Project/group filters: selected scope is passed to analytics and resource APIs.

### Task 1: Shared Dashboard Service

**Files:**
- Create: `lib/dashboard-service.ts`
- Modify: `lib/dashboard.ts`
- Modify: `lib/gitlab-resources.ts`
- Test: `lib/dashboard-service.test.ts`

**Interfaces:**
- Produces `getDashboardSnapshot(options)` returning the existing dashboard data plus groups and resource pagination metadata.
- Uses `instancePipelineAnalytics`, project/group analytics, `listProjects`, `listGroups`, `listAllRunners`, and `listGlobalPipelinesPage`.

- [ ] Write a failing test proving dashboard cards use aggregate pipeline stats rather than visible rows.
- [ ] Run the focused test and confirm it fails for the missing helper.
- [ ] Implement the service and pure metric assembly with bounded rows and warning collection.
- [ ] Run the focused test and the full suite.

### Task 2: API and Store Contract

**Files:**
- Modify: `app/api/dashboard/route.ts`
- Modify: `app/api/pipelines/route.ts`
- Modify: `store/dashboard-slice.ts`
- Modify: `lib/dashboard.ts`
- Test: `app/api/dashboard/route.test.ts` when route behavior can be isolated; otherwise extend service tests.

**Interfaces:**
- `GET /api/dashboard` returns the snapshot and never converts optional GitLab capability failures into a hard 404.
- Initial Redux loading calls `/api/dashboard`; resource routes stay available for table pagination.

- [ ] Write a failing test for a 404-capability fallback.
- [ ] Run it and verify the failure.
- [ ] Implement the route/store change and make global pipeline listing fallback to warnings.
- [ ] Run focused tests and typecheck.

### Task 3: Documentation and Verification

**Files:**
- Modify: `README.md`
- Modify: dashboard components only if the new payload requires a compatibility adapter.

- [ ] Update endpoint examples and token requirements.
- [ ] Run `npm test -- --run`, `npm run typecheck`, `npm run build`, and `git diff --check`.
- [ ] Smoke test `/api/dashboard`, `/api/pipelines`, `/api/projects`, and `/api/runners` without printing secrets.
- [ ] Commit and push the verified changes to `origin/main`.
