/**
 * Aggregates transformers.js `progress_callback` events (one stream per file:
 * config, tokenizer, ONNX weights, …) into a single 0–100 percent for the
 * whole model load, weighted by file size. Pure so it is testable outside the
 * worker; `whisper-worker.ts` posts the result to the UI as progress messages.
 */

export interface ModelProgressEvent {
  status: string;
  file?: string;
  loaded?: number;
  total?: number;
}

/**
 * Returns a function that folds one progress event into the running total and
 * yields the aggregate percent (0–100), or null when the event carries no
 * usable size information (initiate/ready/unsized events).
 */
export function createProgressAggregator(): (
  event: ModelProgressEvent,
) => number | null {
  const files = new Map<string, { loaded: number; total: number }>();

  const percent = (): number => {
    let loaded = 0;
    let total = 0;
    for (const file of files.values()) {
      loaded += file.loaded;
      total += file.total;
    }
    if (total === 0) return 0;
    return Math.min(100, Math.floor((loaded / total) * 100));
  };

  return (event) => {
    if (event.file && event.status === 'done') {
      const entry = files.get(event.file);
      if (entry) entry.loaded = entry.total;
      return percent();
    }
    if (
      event.status !== 'progress' ||
      !event.file ||
      typeof event.loaded !== 'number' ||
      typeof event.total !== 'number' ||
      event.total <= 0
    ) {
      return null;
    }
    files.set(event.file, { loaded: event.loaded, total: event.total });
    return percent();
  };
}
