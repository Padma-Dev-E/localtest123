import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobTable } from "@/components/dashboard/job-table";
import { PipelineTable } from "@/components/dashboard/pipeline-table";
import type { DashboardData, PipelineSummary } from "@/lib/dashboard";

export function PipelinesView({ data, onSelectPipeline }: { data: DashboardData; onSelectPipeline: (pipeline: PipelineSummary) => void }) {
  const total = data.pipelineStats?.totalPipelines ?? data.pipelines.length;
  const loaded = data.pipelines.length === total ? "All matching rows loaded" : `${data.pipelines.length} rows loaded on this page`;
  return <div className="stacked-view"><Card><CardHeader><CardTitle>Pipeline history</CardTitle><CardDescription>{total} runs in the selected scope; {loaded}. Select a row for diagnostics.</CardDescription></CardHeader><CardContent className="flush-content"><PipelineTable pipelines={data.pipelines} onSelect={onSelectPipeline} /></CardContent></Card><Card><CardHeader><CardTitle>Execution jobs</CardTitle><CardDescription>{data.jobs.length} jobs collected from the last 24 hours.</CardDescription></CardHeader><CardContent className="flush-content"><JobTable jobs={data.jobs} /></CardContent></Card></div>;
}
