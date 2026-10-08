import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/cache";

// limites por ip, por minuto
const LIMITS = {
  premortem: 10,
  autopsy: 5,
  inspect: 30,
} as const;

export type LimitName = keyof typeof LIMITS;

const db = redis;
const limiters = db
  ? Object.fromEntries(
      Object.entries(LIMITS).map(([name, perMinute]) => [
        name,
        new Ratelimit({
          redis: db,
          limiter: Ratelimit.slidingWindow(perMinute, "1 m"),
          prefix: `coffy:rl:${name}`,
        }),
      ]),
    )
  : null;

export function clientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
}

// devolve null se pode seguir, ou a resposta 429 pronta
export async function rateLimit(request: Request, name: LimitName): Promise<Response | null> {
  // sem upstash (dev local) nao limita
  if (!limiters) return null;
  try {
    const { success, reset } = await limiters[name].limit(clientIp(request));
    if (success) return null;
    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return Response.json(
      { error: BUSY_MESSAGE, code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  } catch (err) {
    // falha no redis nao bloqueia o usuario
    console.error("ratelimit failed", err);
    return null;
  }
}

export const BUSY_MESSAGE =
  "Coffy is digging too many graves right now, try again in a minute.";
