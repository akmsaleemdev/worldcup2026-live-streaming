/**
 * Optional Redis (Upstash) caching with graceful fallback (Req 16.3).
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured,
 * uses Upstash REST API for caching. When unconfigured or on failure, falls
 * back to a no-op (ISR/in-process caching handles freshness).
 *
 * This is a thin wrapper exposing get/set/del. Consumers don't need to know
 * whether Redis is active.
 */

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const isRedisConfigured = Boolean(REDIS_URL && REDIS_TOKEN);

async function redisCommand<T>(command: string[]): Promise<T | null> {
  if (!isRedisConfigured || !REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(`${REDIS_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(command),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result ?? null;
  } catch {
    return null;
  }
}

/**
 * Get a cached value by key. Returns null when not found or Redis unavailable.
 */
export async function cacheGet<T = string>(key: string): Promise<T | null> {
  const raw = await redisCommand<string>(["GET", key]);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return raw as unknown as T;
  }
}

/**
 * Set a value in cache with TTL (seconds). No-ops when Redis unavailable.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
  await redisCommand(["SET", key, JSON.stringify(value), "EX", String(ttlSeconds)]);
}

/**
 * Delete a cache entry. No-ops when Redis unavailable.
 */
export async function cacheDel(key: string): Promise<void> {
  await redisCommand(["DEL", key]);
}

/** Whether the Redis cache layer is configured and potentially active. */
export const isCacheAvailable = isRedisConfigured;
