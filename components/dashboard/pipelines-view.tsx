import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { JobTable } from "@/components/dashboard/job-table";
import { PipelineTable } from "@/components/dashboard/pipeline-table";
import type { DashboardData, PipelineSummary } from "@/lib/dashboard";

export function PipelinesView({ data, onSelectPipeline }: { data: DashboardData; onSelectPipeline: (pipeline: PipelineSummary) => void }) {
  return <div className="stacked-view"><Card><CardHeader><CardTitle>Pipeline history</CardTitle><CardDescription>{data.pipelines.length} runs in the last 24 hours, with direct links back to GitLab. Select a row for diagnostics.</CardDescription></CardHeader><CardContent className="flush-content"><PipelineTable pipelines={data.pipelines} onSelect={onSelectPipeline} /></CardContent></Card><Card><CardHeader><CardTitle>Execution jobs</CardTitle><CardDescription>{data.jobs.length} jobs collected from the last 24 hours.</CardDescription></CardHeader><CardContent className="flush-content"><JobTable jobs={data.jobs} /></CardContent></Card></div>;
}
