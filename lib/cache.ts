import { Redis } from "@upstash/redis";

// upstash pela integracao da vercel pode vir com nomes upstash_* ou kv_*
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

// sem upstash (dev local) cai num cache em memoria por instancia
const memory = new Map<string, { expires: number; value: unknown }>();
// pedidos iguais ao mesmo tempo esperam o mesmo calculo
const inflight = new Map<string, Promise<unknown>>();

export type Cached<T> = { value: T; cachedAt: number };

// mudou o formato de algo cacheado? sobe a versao e o cache antigo e ignorado
const CACHE_VERSION = 7;

export async function cached<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<Cached<T>> {
  const fullKey = `coffy:v${CACHE_VERSION}:${key}`;

  const hit = await read<T>(fullKey);
  if (hit) return hit;

  const running = inflight.get(fullKey) as Promise<Cached<T>> | undefined;
  if (running) return running;

  const promise = (async () => {
    const entry: Cached<T> = { value: await compute(), cachedAt: Date.now() };
    await write(fullKey, entry, ttlSeconds);
    return entry;
  })();
  inflight.set(fullKey, promise);
  try {
    return await promise;
  } finally {
    inflight.delete(fullKey);
  }
}

async function read<T>(key: string): Promise<Cached<T> | null> {
  if (redis) {
    try {
      return (await redis.get<Cached<T>>(key)) ?? null;
    } catch (err) {
      // redis fora do ar nao pode derrubar o site
      console.error("cache read failed", key, err);
      return null;
    }
  }
  const m = memory.get(key);
  if (m && m.expires > Date.now()) return m.value as Cached<T>;
  memory.delete(key);
  return null;
}

async function write<T>(key: string, entry: Cached<T>, ttlSeconds: number) {
  if (redis) {
    try {
      await redis.set(key, entry, { ex: ttlSeconds });
    } catch (err) {
      console.error("cache write failed", key, err);
    }
    return;
  }
  memory.set(key, { expires: Date.now() + ttlSeconds * 1000, value: entry });
}
