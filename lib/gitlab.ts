const DEFAULT_TIMEOUT_MS = 12_000;

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
  const token = process.env.GITLAB_REPORTER_TOKEN;

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

export function projectPath(id: number, suffix: string): string {
  return `/projects/${encodeURIComponent(String(id))}${suffix}`;
}
