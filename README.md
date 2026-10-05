# GitLab Operations Dashboard

Read-only GitLab delivery dashboard built with Next.js, ECharts, and GitLab's REST API.

## Features

- Last-24-hour project, pipeline, job, and runner overview
- Pipeline diagnostics with failed stages, failure reasons, retries, artifacts, test summaries, and downstream triggers
- Runner names, status, version, and total count from the GitLab runner inventory
- Group hierarchy, group search, subgroup-aware project filtering, and group health summaries
- Reusable overview widgets backed by one Redux store to avoid duplicate browser requests
- Server-side GitLab token handling; credentials are never sent to the browser

## Backend API

All list endpoints use GitLab pagination metadata and return an `items` array plus a `pagination` object with `page`, `perPage`, `total`, `totalPages`, `hasNext`, `hasPrevious`, `nextPage`, and `previousPage`.

```text
GET /api/projects?page=1&per_page=20&search=platform
GET /api/groups?page=1&per_page=100&search=platform
GET /api/projects?group_id=123&include_subgroups=true&page=1&per_page=20
GET /api/pipelines?project=all&page=1&per_page=20&hours=24
GET /api/pipelines?project=123&page=1&per_page=20&hours=24&status=failed&ref=main
GET /api/pipelines?group_id=123&include_subgroups=true&project=all&page=1&per_page=20&hours=24
GET /api/runners?project=all&page=1&per_page=20
GET /api/runners?project=123&page=1&per_page=20
GET /api/pipelines/123/456
```

`project=all` pipeline requests paginate recently active projects, then read the recent pipelines for only that project page with a bounded concurrency of four. This keeps a large GitLab instance from receiving one request per project. For exact pipeline totals and native pipeline pagination, pass a project id. The detail endpoint is for a selected pipeline and loads its complete job and diagnostic data.

GitLab's project pipeline history is project-scoped, so an all-project view cannot be fulfilled by one complete-history REST call. GitLab's global `/pipelines` endpoint is limited to pipelines triggered by the authenticated user and is not a replacement for an organization-wide view. If one visible project denies pipeline access, the all-project response keeps the other projects and returns a warning instead of failing the whole request.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `GITLAB_URL` and a read-only GitLab API token in `.env`.
3. Install and run:

```bash
npm ci
npm run dev
```

The dashboard is available at `http://localhost:3000`.

## Production container

The included `Dockerfile` builds a standalone Next.js image. `docker-compose.yml` is a generic example for a Traefik-connected deployment; adapt the external network and host rule to your environment. Keep the runtime `.env` file out of source control.

## Security notes

The dashboard does not proxy job traces or pipeline variables because they can contain secrets. Use the direct GitLab links from the diagnostics view for trace inspection.

## Source layout

- `app/page.tsx`: route entry only
- `components/dashboard/dashboard-shell.tsx`: page composition and view state
- `components/dashboard/*-view.tsx`: overview, pipeline, project, and runner views
- `components/dashboard/*-table.tsx`: focused table components and their data props
- `components/dashboard/pipeline-drawer.tsx`: pipeline diagnostics presentation
- `components/dashboard/shared.tsx`: shared formatters, badges, metric cards, and empty states
- `hooks/`: client-side dashboard and pipeline-detail data fetching
- `lib/dashboard.ts`: concise 24-hour summary API, pagination, counts, and runner inventory
- `lib/pipeline-detail.ts`: optional click-through diagnostics for one pipeline
- `lib/gitlab-resources.ts`: paginated project, pipeline, and runner resources
- `lib/api-pagination.ts`: shared pagination parsing and request bounds
- `lib/`: GitLab API integration and tests

The initial dashboard request is intentionally light: it reads one project page for the total project count, scans only recently active projects for pipeline summaries, and reads one runner inventory page for names and status. Jobs, artifacts, retries, test reports, and failure reasons are loaded only by the pipeline detail endpoint.

The client store lives in `store/dashboard-slice.ts`. `OverviewView` and its group, action-required, project-health, and runner-health widgets consume the same resource pages and derived selectors. Pipeline diagnostics remain lazy-loaded after a pipeline row is selected.
