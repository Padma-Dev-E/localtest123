"use client";

import { useCallback, useEffect, useState } from "react";

import type { DashboardData } from "@/lib/dashboard";

export function useDashboardData(days: string, project: string) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ days, ...(project !== "all" ? { project } : {}) });
      const response = await fetch(`/api/dashboard?${query.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as DashboardData;
      if (!response.ok && !payload.warnings?.length) throw new Error("Dashboard request failed");
      setData(payload);
      setLastRefresh(new Date().toISOString());
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Dashboard request failed");
    } finally {
      setLoading(false);
    }
  }, [days, project]);

  useEffect(() => { void loadData(); }, [loadData]);

  return { data, loading, error, lastRefresh, loadData };
}
