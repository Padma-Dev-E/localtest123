# Unified Dashboard API Design

## Goal

Make the dashboard fast and resilient for an Enterprise GitLab instance while keeping detailed tables independently paginated.

## Contract

- `GET /api/dashboard` is the only initial dashboard request. It returns dashboard metrics, aggregate pipeline statistics, a bounded set of latest rows, group summaries, runner summaries, pagination metadata, and warnings.
- `GET /api/groups`, `GET /api/projects`, `GET /api/pipelines`, and `GET /api/runners` remain paginated resource APIs for table views.
- `GET /api/pipelines/:projectId/:pipelineId` remains the lazy detail endpoint.
- Dashboard statistics use Enterprise GLQL analytics across accessible top-level groups and subgroups. The direct global pipeline endpoint is used only for latest rows because GitLab documents it as authenticated-user scoped.
- An upstream 404/403 for an optional capability becomes a response warning when the dashboard can still provide useful data; it does not become a misleading dashboard-wide 404.

## Data Flow

The dashboard service loads project and group page metadata, the complete runner inventory for exact runner status totals, a bounded latest pipeline page, and aggregate pipeline analytics in parallel. It calculates dashboard cards from aggregate stats, never from only the visible pipeline rows. Resource tables use their own pagination and details are fetched only after a row is selected.

## Constraints

- Keep GitLab credentials server-side and prefer `GITLAB_API_TOKEN`.
- Keep the response compatible with the existing dashboard components where practical.
- Do not crawl every project during the initial dashboard request.
- Preserve explicit warnings when the token or GitLab version cannot provide a capability.
