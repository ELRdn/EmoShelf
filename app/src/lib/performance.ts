export interface ClientPerformanceSnapshot {
  startupToReadyMs?: number;
  searchSamples: number;
  searchP95Ms?: number;
  usedJavaScriptHeapMb?: number;
}

const startedAt = performance.now();
const searchSamples: number[] = [];
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

export function measureCatalogSearch<T>(operation: () => T): T {
  const started = performance.now();
  const value = operation();
  searchSamples.push(performance.now() - started);
  if (searchSamples.length > 100) {
    searchSamples.shift();
  }
  return value;
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
