import type { NextApiRequest, NextApiResponse } from "next";

export function queryValue(request: NextApiRequest, name: string): string | null {
  const value = request.query[name];
  return Array.isArray(value) ? value[0] || null : value || null;
}

export function setCacheControl(response: NextApiResponse, value: string): void {
  response.setHeader("Cache-Control", value);
}

export function methodNotAllowed(response: NextApiResponse): void {
  response.setHeader("Allow", "GET");
  response.status(405).json({ error: "Method not allowed" });
}
