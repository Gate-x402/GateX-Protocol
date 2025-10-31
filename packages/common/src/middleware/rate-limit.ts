import { Context, Next } from "hono";
import type Redis from "ioredis";
import { RateLimitError } from "../errors";

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (c: Context) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function createRateLimit(redis: Redis, options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (c) => {
      const ip = c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown";
      const path = new URL(c.req.url).pathname;
      return `ratelimit:${ip}:${path}`;
    },
  } = options;

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();
    const windowStart = now - windowMs;

    // Get request count for current window
    const count = await redis.zcount(key, windowStart, now);

    if (count >= maxRequests) {
      const ttl = await redis.ttl(key);
      throw new RateLimitError("Too many requests", ttl > 0 ? ttl : windowMs / 1000);
    }

    // Add current request to sorted set
    await redis.zadd(key, now, `${now}-${Math.random()}`);
    await redis.expire(key, Math.ceil(windowMs / 1000));

    await next();
  };
}

