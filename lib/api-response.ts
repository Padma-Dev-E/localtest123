export type APIStatusMessage = "completed" | "in_progress" | "error";

export type APIResponse<T> = {
  id: string;
  data: T | null;
  error: string;
  status: {
    code: number;
    message: APIStatusMessage;
  };
};

function errorMessage(code: number): string {
  if (code === 200 || code === 202) return "";
  if (code === 400) return "Missing or invalid request body";
  if (code === 401) return "Unauthorized";
  if (code === 403) return "Forbidden";
  if (code === 404) return "Not Found";
  if (code === 405) return "Method not allowed";
  return "Internal Server Error";
}

function statusMessage(code: number): APIStatusMessage {
  if (code === 200) return "completed";
  if (code === 202) return "in_progress";
  return "error";
}

export function generateAPIResponse<T>(code: number, id: string, data: T | null): APIResponse<T> {
  return {
    id,
    data,
    error: errorMessage(code),
    status: {
      code,
      message: statusMessage(code),
    },
  };
}

export function apiResponseError<T>(payload: Partial<APIResponse<T>>): string {
  if (payload.data && typeof payload.data === "object" && "error" in payload.data && typeof payload.data.error === "string") return payload.data.error;
  return payload.error || "API request failed";
}
