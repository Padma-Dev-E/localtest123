"use client";

import { useCallback, useState } from "react";

import type { PipelineDetail } from "@/lib/pipeline-detail";
import type { PipelineSummary } from "@/lib/dashboard";
import { apiResponseError, type APIResponse } from "@/lib/api-response";

export function usePipelineDetail() {
  const [selectedPipeline, setSelectedPipeline] = useState<PipelineSummary | null>(null);
  const [pipelineDetail, setPipelineDetail] = useState<PipelineDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openPipeline = useCallback(async (pipeline: PipelineSummary) => {
    setSelectedPipeline(pipeline);
    setPipelineDetail(null);
    setError(null);
    setLoading(true);
    try {
      const response = await fetch(`/api/pipelines/${pipeline.projectId}/${pipeline.id}`, { cache: "no-store" });
      const payload = await response.json() as APIResponse<PipelineDetail>;
      if (!response.ok || !payload.data || payload.status?.code >= 400) throw new Error(apiResponseError(payload) || "Pipeline details could not be loaded");
      setPipelineDetail(payload.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Pipeline details could not be loaded");
    } finally {
      setLoading(false);
    }
  }, []);

  const closePipeline = useCallback(() => {
    setSelectedPipeline(null);
    setPipelineDetail(null);
    setError(null);
  }, []);

  return { selectedPipeline, pipelineDetail, loading, error, openPipeline, closePipeline };
}
