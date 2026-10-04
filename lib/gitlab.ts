const DEFAULT_TIMEOUT_MS = 12_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 50;

export class GitLabApiError extends Error {
  readonly status: number;
  readonly path: string;

  constructor(message: string, status: number, path: string) {
    super(message);
    this.name = "GitLabApiError";
    this.status = status;
    this.path = path;
  }
}

function getGitLabConfig() {
  const baseUrl = process.env.GITLAB_URL?.replace(/\/$/, "");
  const token = process.env.GITLAB_API_TOKEN || process.env.GITLAB_REPORTER_TOKEN;

  if (!baseUrl || !token) {
    throw new GitLabApiError("GitLab dashboard is not configured", 503, "configuration");
  }

  return { baseUrl, token };
}

export async function gitlabFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl, token } = getGitLabConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/v4${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "PRIVATE-TOKEN": token,
        ...init?.headers,
      },
    });

    if (!response.ok) {
      throw new GitLabApiError(`GitLab returned HTTP ${response.status}`, response.status, path);
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof GitLabApiError) {
      throw error;
    }
    const message = error instanceof Error && error.name === "AbortError" ? "GitLab request timed out" : "GitLab request failed";
    throw new GitLabApiError(message, 502, path);
  } finally {
    clearTimeout(timeout);
  }
}

export async function gitlabFetchPage<T>(path: string, init?: RequestInit): Promise<{ data: T; headers: Headers }> {
  const { baseUrl, token } = getGitLabConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(`${baseUrl}/api/v4${path}`, {
      ...init,
      signal: controller.signal,
      cache: "no-store",
      headers: { Accept: "application/json", "PRIVATE-TOKEN": token, ...init?.headers },
    });
    if (!response.ok) throw new GitLabApiError(`GitLab returned HTTP ${response.status}`, response.status, path);
    return { data: (await response.json()) as T, headers: response.headers };
  } catch (error) {
    if (error instanceof GitLabApiError) throw error;
    const message = error instanceof Error && error.name === "AbortError" ? "GitLab request timed out" : "GitLab request failed";
    throw new GitLabApiError(message, 502, path);
  } finally {
    clearTimeout(timeout);
  }
}

export async function gitlabFetchAll<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let nextPath = path;
  for (let page = 1; page <= MAX_PAGES && nextPath; page += 1) {
    const separator = nextPath.includes("?") ? "&" : "?";
    const response = await gitlabFetchPage<T[]>(`${nextPath}${separator}per_page=${PAGE_SIZE}&page=1`);
    items.push(...response.data);
    nextPath = nextPagePath(response.headers, nextPath);
  }
  return items;
}

function nextPagePath(headers: Headers, currentPath: string): string {
  const link = headers.get("link")?.match(/<([^>]+)>;\s*rel="next"/i)?.[1];
  if (link) {
    const url = new URL(link);
    return `${url.pathname.replace(/^\/api\/v4/, "")}${url.search}`;
  }
  const nextPage = headers.get("x-next-page");
  if (!nextPage) return "";
  const url = new URL(currentPath, "https://pagination.invalid");
  url.searchParams.set("page", nextPage);
  url.searchParams.set("per_page", String(PAGE_SIZE));
  return `${url.pathname}${url.search}`;
}

export function projectPath(id: number, suffix: string): string {
  return `/projects/${encodeURIComponent(String(id))}${suffix}`;
}
