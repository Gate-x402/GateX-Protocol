import Redis from "ioredis";
import { getEnv } from "@gatex/config";

let redisClient: Redis | null = null;

export function createRedisClient(): Redis {
  if (redisClient) {
    return redisClient;
  }

  const env = getEnv();
  const url = new URL(env.REDIS_URL);

  redisClient = new Redis({
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    password: url.password || undefined,
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  });

  redisClient.on("error", (err) => {
    console.error("Redis error:", err);
  });

  redisClient.on("connect", () => {
    console.log("✅ Redis connected");
  });

  return redisClient;
}

