# GitLab Operations Dashboard

Read-only GitLab delivery dashboard built with Next.js, ECharts, and GitLab's REST API.

## Features

- Configurable project, pipeline, job, and runner overview
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
GET /api/dashboard?hours=24
GET /api/dashboard?hours=0
GET /api/pipelines?project=all&page=1&per_page=20&hours=24
GET /api/pipelines?project=123&page=1&per_page=20&hours=24&status=failed&ref=main
GET /api/pipelines?group_id=123&include_subgroups=true&project=all&page=1&per_page=20&hours=24
GET /api/runners?project=all&page=1&per_page=20
GET /api/runners?project=123&page=1&per_page=20
GET /api/pipelines/123/456
```

The dashboard endpoint is the initial browser request. It returns only the data needed by the dashboard: project and group pages, bounded latest pipeline and runner rows, full runner status totals, aggregate pipeline counts, status distribution, trend data, pagination metadata, and warnings. It does not crawl every project. The detail endpoint is for a selected pipeline and loads its complete job and diagnostic data.

The resource endpoints are independent table APIs. Projects, groups, project pipelines, and runners use GitLab pagination. A group pipeline view uses the group project set and bounded latest pipeline rows because GitLab's GLQL standard pipeline query is project-scoped; aggregate group totals still come from Enterprise pipeline analytics.

The `hours` filter is sent by the frontend. Positive values filter by `updated_after`; `hours=0` omits the time filter and requests all available pipeline history.

GitLab's project pipeline history is project-scoped. The global `/pipelines` endpoint is used only for visible latest rows and is limited to pipelines triggered by the authenticated user. For dashboard summary metrics, the server queries Enterprise GLQL pipeline analytics across accessible top-level groups, including subgroups, in bounded chunks. If a capability is denied or unsupported, the response stays usable and returns an explicit warning instead of a misleading 404.

When Enterprise pipeline analytics is unavailable, the response keeps the direct rows and marks the stats scope as `authenticated-user` with a warning; those counts are page-level, not instance-wide. The runner endpoint requires a token that can read instance runner inventory; a Reporter token can still return HTTP 403.

## Local setup

1. Copy `.env.example` to `.env`.
2. Set `GITLAB_URL` and a read-only Enterprise/Auditor API token in `GITLAB_API_TOKEN` in `.env`. `GITLAB_REPORTER_TOKEN` is only a compatibility fallback and cannot provide instance runner inventory or Enterprise aggregate metrics.
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
- `lib/dashboard.ts`: configurable-window summary API, pagination, counts, and runner inventory
- `lib/pipeline-detail.ts`: optional click-through diagnostics for one pipeline
- `lib/gitlab-resources.ts`: paginated project, pipeline, and runner resources
- `lib/api-pagination.ts`: shared pagination parsing and request bounds
- `lib/`: GitLab API integration and tests

The initial dashboard request is `/api/dashboard`. Jobs, artifacts, retries, test reports, and failure reasons are loaded only by the pipeline detail endpoint.

The client store lives in `store/dashboard-slice.ts`. `OverviewView` and its group, action-required, project-health, and runner-health widgets consume the same resource pages and derived selectors. Pipeline diagnostics remain lazy-loaded after a pipeline row is selected.
