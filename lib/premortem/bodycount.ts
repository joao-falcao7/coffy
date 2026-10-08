import { cached } from "@/lib/cache";
import { fetchDevCreations } from "@/lib/helius";
import { fetchPairs } from "./dexscreener";
import { classifyToken, type TokenStatus } from "./rules";

export type DevToken = {
  mint: string;
  createdAt: number;
  status: TokenStatus;
  bonded: boolean;
  marketCap: number | null;
};

export type BodyCount = {
  dev: string;
  launched: number;
  dead: number;
  alive: number;
  bonded: number;
  bodyCountPct: number;
  // false = o dev tem mais historico do que o analisado
  complete: boolean;
  tokens: DevToken[];
};

// quantos tokens o dev ja lancou e quantos morreram (cache de 15 min por dev)
export async function getBodyCount(dev: string): Promise<BodyCount> {
  const { value } = await cached(`bodycount:${dev}`, 15 * 60, async () => {
    const { created, complete } = await fetchDevCreations(dev);
    const pairs = await fetchPairs(created.map((c) => c.mint));

    const tokens: DevToken[] = created.map((c) => ({
      mint: c.mint,
      createdAt: c.createdAt,
      ...classifyToken(pairs.get(c.mint) ?? [], c.createdAt),
    }));

    const dead = tokens.filter((t) => t.status === "dead").length;
    return {
      dev,
      launched: tokens.length,
      dead,
      alive: tokens.length - dead,
      bonded: tokens.filter((t) => t.bonded).length,
      bodyCountPct: tokens.length ? Math.round((dead / tokens.length) * 100) : 0,
      complete,
      tokens,
    };
  });
  return value;
}
