/**
 * Single-flight cache: deduplicates concurrent async work on the same target.
 *
 * When two callers request the same key with the same stamp (a fingerprint of
 * the inputs, e.g. source mtime/size), they share one promise instead of racing
 * each other — typically to avoid concurrent writes to the same output file.
 * A different stamp (source or config changed, e.g. during `serve`) re-runs
 * the task and replaces the cached slot.
 */

export interface SingleFlightCache<T> {
  run(key: string, stamp: string, task: () => Promise<T>): Promise<T>;
  clear(): void;
}

export function createSingleFlightCache<T>(): SingleFlightCache<T> {
  const slots = new Map<string, { stamp: string; promise: Promise<T> }>();

  return {
    run(key, stamp, task) {
      const existing = slots.get(key);
      if (existing && existing.stamp === stamp) return existing.promise;

      const promise = task();
      slots.set(key, { stamp, promise });
      return promise;
    },
    clear() {
      slots.clear();
    },
  };
}
