export interface ClientPerformanceSnapshot {
  startupToReadyMs?: number;
  searchSamples: number;
  searchP95Ms?: number;
  usedJavaScriptHeapMb?: number;
}

const startedAt = performance.now();
const searchSamples: number[] = [];
let searchStarted: number | undefined;
let startupToReadyMs: number | undefined;

function p95(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * 0.95) - 1),
  );
  return sorted[index];
}

export function recordCatalogReady(): void {
  startupToReadyMs ??= performance.now() - startedAt;
}

export function beginSearchFrame(): void {
  searchStarted = performance.now();
}
export function finishSearchFrame(): void {
  if (searchStarted === undefined) return;
  searchSamples.push(performance.now() - searchStarted);
  searchStarted = undefined;
  if (searchSamples.length > 100) searchSamples.shift();
}

export function getClientPerformanceSnapshot(): ClientPerformanceSnapshot {
  const memory = performance as Performance & {
    memory?: { usedJSHeapSize: number };
  };
  return {
    startupToReadyMs,
    searchSamples: searchSamples.length,
    searchP95Ms: p95(searchSamples),
    usedJavaScriptHeapMb: memory.memory
      ? memory.memory.usedJSHeapSize / 1024 / 1024
      : undefined,
  };
}
