import { cached } from "@/lib/cache";
import { fetchCreation, fetchMintInfo, fetchTokenMeta, HeliusError } from "@/lib/helius";
import { getBodyCount, type BodyCount } from "./bodycount";
import { diagnosisLine } from "./diagnosis";
import { fetchPairs } from "./dexscreener";
import { getHolders, type HoldersData } from "./holders";
import { classifyToken, type TokenStatus } from "./rules";
import { computePremortemScore, verdictFor, type Verdict } from "./score";

export type PremortemMetrics = {
  mint: string;
  name: string | null;
  symbol: string | null;
  createdAt: number | null;
  pumpfun: boolean;
  authorities: { mint: string | null; freeze: string | null };
  holders: HoldersData;
  // status do proprio token pela mesma regra do body count
  market: { status: TokenStatus; bonded: boolean; marketCap: number | null };
  // null quando nao deu pra achar as criacoes do dev (ex.: nao veio da pump.fun)
  dev: BodyCount | null;
  devAddress: string | null;
};

export type Premortem = PremortemMetrics & {
  score: number;
  verdict: Verdict;
  diagnosis: string;
  checkedAt: number;
};

export class PremortemError extends Error {
  constructor(public code: "NOT_A_TOKEN" | "BUSY" | "FAILED", message: string) {
    super(message);
  }
}

// pre-mortem fica 3 min no cache (os dados mudam rapido)
const PREMORTEM_TTL = 3 * 60;

export async function getPremortem(mint: string): Promise<Premortem> {
  try {
    const { value, cachedAt } = await cached(`premortem:${mint}`, PREMORTEM_TTL, async () => {
      const metrics = await computeMetrics(mint);
      const score = computePremortemScore(metrics);
      const verdict = verdictFor(score);
      const diagnosis = await diagnosisLine(metrics, verdict, score);
      return { ...metrics, score, verdict, diagnosis };
    });
    return { ...value, checkedAt: cachedAt };
  } catch (err) {
    if (err instanceof PremortemError) throw err;
    if (err instanceof HeliusError && err.status === 429) {
      throw new PremortemError("BUSY", "Helius rate limit");
    }
    console.error("premortem failed", mint, err);
    throw new PremortemError("FAILED", "Pre-mortem failed");
  }
}

async function computeMetrics(mint: string): Promise<PremortemMetrics> {
  const [info, meta, creation] = await Promise.all([
    fetchMintInfo(mint),
    fetchTokenMeta(mint),
    fetchCreation(mint),
  ]);
  if (!info) throw new PremortemError("NOT_A_TOKEN", "Not a token mint");

  const devAddress = creation?.dev ?? null;
  const [holders, dev, pairs] = await Promise.all([
    getHolders(mint, BigInt(info.supply), devAddress),
    // body count so faz sentido pra lancamentos da pump.fun
    creation?.pumpfun && devAddress ? getBodyCount(devAddress) : Promise.resolve(null),
    fetchPairs([mint]).catch(() => null),
  ]);
  // sem resposta do dexscreener nao da pra afirmar que morreu
  const market = pairs
    ? classifyToken(pairs.get(mint) ?? [], creation?.createdAt ?? Date.now() / 1000)
    : { status: "alive" as TokenStatus, bonded: false, marketCap: null };

  return {
    mint,
    name: meta.name,
    dev: dev ? withCurrentToken(dev, mint, creation?.createdAt ?? 0, market) : null,
    symbol: meta.symbol,
    createdAt: creation?.createdAt ?? null,
    pumpfun: creation?.pumpfun ?? false,
    authorities: { mint: info.mintAuthority, freeze: info.freezeAuthority },
    holders,
    market,
    devAddress,
  };
}

// o token analisado sempre conta no historico do dev (mesmo se ficou fora das tx lidas)
function withCurrentToken(
  dev: BodyCount,
  mint: string,
  createdAt: number,
  market: { status: TokenStatus; bonded: boolean; marketCap: number | null },
): BodyCount {
  const tokens = dev.tokens.some((t) => t.mint === mint)
    ? dev.tokens.map((t) => (t.mint === mint ? { ...t, ...market } : t))
    : [{ mint, createdAt, ...market }, ...dev.tokens];
  const dead = tokens.filter((t) => t.status === "dead").length;
  return {
    ...dev,
    tokens,
    launched: tokens.length,
    dead,
    alive: tokens.length - dead,
    bonded: tokens.filter((t) => t.bonded).length,
    bodyCountPct: Math.round((dead / tokens.length) * 100),
  };
}
