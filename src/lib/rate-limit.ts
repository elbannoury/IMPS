/**
 * Lightweight in-memory rate limiter for public forms.
 * Adequate for a single Node instance; swap for Redis/Upstash in multi-instance
 * deployments (see DEPLOYMENT.md).
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit = 5, windowMs = 60_000): { ok: boolean; remaining: number } {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1 };
  }
  bucket.count += 1;
  if (bucket.count > limit) return { ok: false, remaining: 0 };
  return { ok: true, remaining: limit - bucket.count };
}

/** Periodically drop expired buckets so the map cannot grow unbounded. */
export function pruneBuckets(): void {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}
