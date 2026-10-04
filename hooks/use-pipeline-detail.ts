"use client";

import { useCallback, useState } from "react";

import type { PipelineDetail, PipelineSummary } from "@/lib/dashboard";

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
      const payload = await response.json() as PipelineDetail | { error?: string };
      if (!response.ok) throw new Error("error" in payload && payload.error ? payload.error : "Pipeline details could not be loaded");
      setPipelineDetail(payload as PipelineDetail);
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
