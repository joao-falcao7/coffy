import type { CoffyExpression } from "@/lib/coffy";
import type { PremortemMetrics } from "./index";

export type Verdict = "ALIVE" | "IN THE ICU" | "ALREADY IN THE COFFIN";

// pesos do risco (somam no maximo 100); score = 100 - risco, quanto maior mais vivo
export const WEIGHTS = {
  // body count do dev: % de tokens mortos vira ate 70 pontos de risco
  bodyCountMax: 70,
  // com menos lancamentos que isso o peso cai proporcionalmente (1 de 2 nao e serial)
  bodyCountFullAt: 5,
  // dev sem historico (primeiro token) ou sem dados: risco fixo pequeno
  unknownDev: 12,
  // dev segurando supply
  devHolding: [
    { atLeast: 10, risk: 20 },
    { atLeast: 5, risk: 12 },
    { atLeast: 2, risk: 6 },
  ],
  // top 10 concentrado (sem curve/pool)
  top10: [
    { atLeast: 50, risk: 15 },
    { atLeast: 35, risk: 10 },
    { atLeast: 25, risk: 5 },
  ],
  // o proprio token ja esta morto (mcap < 5k ou sem par ha mais de 24h)
  tokenDead: 70,
  // autoridade ativa
  mintAuthority: 10,
  freezeAuthority: 10,
};

// faixas do veredito
export const BANDS = { alive: 60, icu: 35 };

const tier = (value: number, steps: { atLeast: number; risk: number }[]) =>
  steps.find((s) => value >= s.atLeast)?.risk ?? 0;

export function computePremortemScore(m: PremortemMetrics): number {
  let risk = 0;

  if (m.dev && m.dev.launched >= 2) {
    const confidence = Math.min(1, m.dev.launched / WEIGHTS.bodyCountFullAt);
    risk += (m.dev.bodyCountPct / 100) * WEIGHTS.bodyCountMax * confidence;
  } else {
    risk += WEIGHTS.unknownDev;
  }
  if (m.market.status === "dead") risk += WEIGHTS.tokenDead;
  risk += tier(m.holders.devHoldingPct, WEIGHTS.devHolding);
  if (m.holders.available) risk += tier(m.holders.top10Pct, WEIGHTS.top10);
  if (m.authorities.mint) risk += WEIGHTS.mintAuthority;
  if (m.authorities.freeze) risk += WEIGHTS.freezeAuthority;

  return Math.round(Math.max(0, Math.min(100, 100 - risk)));
}

export function verdictFor(score: number): Verdict {
  if (score >= BANDS.alive) return "ALIVE";
  if (score >= BANDS.icu) return "IN THE ICU";
  return "ALREADY IN THE COFFIN";
}

export function verdictExpression(v: Verdict): CoffyExpression {
  if (v === "ALIVE") return "winking";
  if (v === "IN THE ICU") return "crying";
  return "fainted";
}
