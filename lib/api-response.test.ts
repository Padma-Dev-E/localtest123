import { describe, expect, it } from "vitest";

import { apiResponseError, generateAPIResponse } from "./api-response";

describe("API response envelope", () => {
  it("marks successful responses as completed", () => {
    expect(generateAPIResponse(200, "gitlab_health", { ok: true })).toEqual({
      id: "gitlab_health",
      data: { ok: true },
      error: "",
      status: { code: 200, message: "completed" },
    });
  });

  it("keeps endpoint errors inside data while exposing the standard status", () => {
    const response = generateAPIResponse(403, "gitlab_runners", { error: "Runner inventory is unavailable" });
    expect(response.status).toEqual({ code: 403, message: "error" });
    expect(response.data).toEqual({ error: "Runner inventory is unavailable" });
    expect(apiResponseError(response)).toBe("Runner inventory is unavailable");
  });
});
