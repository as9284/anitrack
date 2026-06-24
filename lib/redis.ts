import { Redis } from "@upstash/redis";

let client: Redis | null = null;

export function getRedis(): Redis {
  if (!client) {
    client = Redis.fromEnv();
  }
  return client;
}

export function syncKey(code: string): string {
  return `sync:${code}`;
}

export const SYNC_CODE_PATTERN = /^[a-z0-9-]{6,40}$/;
