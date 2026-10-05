const DEFAULT_HOURS = 24;
const MAX_HOURS = 168;

export function parseHours(value: string | null): number {
  if (value === null || value.trim() === "") return DEFAULT_HOURS;
  const hours = Number(value);
  if (!Number.isFinite(hours) || hours < 0) return DEFAULT_HOURS;
  return Math.min(hours, MAX_HOURS);
}

export function cutoffForHours(hours: number): string | undefined {
  return hours === 0 ? undefined : new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

export function timeWindowLabel(hours: number): string {
  if (hours === 0) return "All time";
  if (hours === 168) return "Last 7 days";
  return `Last ${hours} hours`;
}
