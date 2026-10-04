# GitLab Operations Dashboard

Read-only GitLab delivery dashboard built with Next.js, ECharts, and GitLab's REST API.

## Features

- Pipeline, project, job, environment, deployment, and activity overview
- Pipeline diagnostics with failed stages, failure reasons, retries, artifacts, test summaries, and downstream triggers
- Runner statistics observed from Reporter-readable jobs when instance runner inventory is unavailable
- Server-side GitLab token handling; credentials are never sent to the browser

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
