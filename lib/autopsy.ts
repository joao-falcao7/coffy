import { cached } from "@/lib/cache";
import { fetchSymbols, fetchWalletTxs, HeliusError } from "@/lib/helius";
import { buildPositions, computeMetrics, extractActivity } from "@/lib/metrics";
import { fetchPricesSol } from "@/lib/prices";
import { buildReport } from "@/lib/report";

export type Trade = { token: string; mint: string; pnlSol: number };

// numeros calculados pelo codigo; o llm nunca inventa nada disso
export type Metrics = {
  pnlSol: number;
  totalSpentSol: number;
  trades: number;
  tokens: number;
  avgHoldHours: number;
  deadTokens: number;
  worstTrade: Trade;
  bestTrade: Trade;
  // periodo coberto; capped = wallet tem mais historico do que o limite analisado
  window: { fromTime: number; toTime: number; capped: boolean };
};

export type CauseOfDeath =
  | "Held the rug"
  | "Overtrading"
  | "Paperhands"
  | "Bag holder"
  | "Death by a thousand cuts"
  | "Still breathing";

// texto do laudo, montado em lib/report.ts a partir das metricas
export type Report = {
  epitaph: string;
  summary: string;
  worstTradeRoast: string;
  badHabits: string[];
  verdict: string;
};

export type Autopsy = {
  wallet: string;
  metrics: Metrics;
  causeOfDeath: CauseOfDeath;
  score: number;
  report: Report;
  generatedAt: string;
};

export class AutopsyError extends Error {
  constructor(public code: "NO_TRADES" | "BUSY" | "FAILED", message: string) {
    super(message);
  }
}

// categoria derivada das metricas
export function deriveCauseOfDeath(m: Metrics): CauseOfDeath {
  const deadRatio = m.tokens ? m.deadTokens / m.tokens : 0;
  if (m.pnlSol >= 0) return "Still breathing";
  if (deadRatio >= 0.4) return "Held the rug";
  if (m.trades / Math.max(m.tokens, 1) >= 6) return "Overtrading";
  if (m.avgHoldHours < 1) return "Paperhands";
  if (m.avgHoldHours > 24 * 14) return "Bag holder";
  return "Death by a thousand cuts";
}

// nota de 0 a 100, quanto maior mais saudavel a wallet; usa roi pra ser justa com qualquer tamanho
export function computeScore(m: Metrics): number {
  const roi = m.totalSpentSol ? m.pnlSol / m.totalSpentSol : 0;
  const deadRatio = m.tokens ? m.deadTokens / m.tokens : 0;
  let score = 50;
  score += Math.max(-30, Math.min(35, roi * 60));
  score -= deadRatio * 20;
  if (m.trades / Math.max(m.tokens, 1) >= 6) score -= 5;
  if (m.avgHoldHours < 1) score -= 5;
  return Math.round(Math.max(0, Math.min(100, score)));
}

// autopsia por wallet fica 30 min no cache compartilhado
const AUTOPSY_TTL = 30 * 60;

export async function getAutopsy(wallet: string): Promise<Autopsy> {
  const { value } = await cached(`autopsy:${wallet}`, AUTOPSY_TTL, () => runAutopsy(wallet));
  return value;
}

async function runAutopsy(wallet: string): Promise<Autopsy> {
  try {
    // busca historico e transforma em swaps/posicoes
    const { txs, capped } = await fetchWalletTxs(wallet);
    const { swaps, transfers } = extractActivity(txs, wallet);
    const positions = buildPositions(swaps, transfers);
    const noTrades = () =>
      new AutopsyError("NO_TRADES", "No token trades found in the last 90 days.");
    if (!positions.length) throw noTrades();

    // preco atual so dos tokens que ainda tem saldo
    const held = positions
      .filter((p) => p.bought + p.transferredIn > p.sold + p.transferredOut)
      .map((p) => p.mint);
    const prices = await fetchPricesSol(held);

    const base = computeMetrics(swaps, positions, prices);
    if (!base) throw noTrades();
    const symbols = await fetchSymbols([base.worstTrade.mint, base.bestTrade.mint]).catch(
      () => new Map<string, string>(),
    );
    const name = (t: Trade) => ({ ...t, token: symbols.get(t.mint) ?? t.token });

    const metrics: Metrics = {
      ...base,
      worstTrade: name(base.worstTrade),
      bestTrade: name(base.bestTrade),
      window: { fromTime: swaps[0].time, toTime: swaps[swaps.length - 1].time, capped },
    };
    const causeOfDeath = deriveCauseOfDeath(metrics);
    const score = computeScore(metrics);

    return {
      wallet,
      metrics,
      causeOfDeath,
      score,
      report: buildReport(wallet, metrics, causeOfDeath, score),
      generatedAt: new Date().toISOString(),
    };
  } catch (err) {
    if (err instanceof AutopsyError) throw err;
    if (err instanceof HeliusError && err.status === 429) {
      throw new AutopsyError("BUSY", "Helius rate limit");
    }
    console.error("autopsy failed", wallet, err);
    throw new AutopsyError("FAILED", "Autopsy failed");
  }
}
