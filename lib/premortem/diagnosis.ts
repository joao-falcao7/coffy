import Anthropic from "@anthropic-ai/sdk";
import type { PremortemMetrics } from "./index";
import type { Verdict } from "./score";

// frases prontas por faixa (fallback quando o llm falha, demora ou nao tem chave)
const TEMPLATES: Record<Verdict, string[]> = {
  ALIVE: [
    "Pulse detected. Coffy is putting the shovel down. For now.",
    "Vitals look fine. Coffy is almost disappointed.",
    "Not dead yet. Keep an eye on the dev anyway.",
  ],
  "IN THE ICU": [
    "Breathing, but the monitor keeps beeping. Proceed with caution.",
    "Weak pulse. Coffy is measuring the coffin, just in case.",
    "Stable for now. The graveyard has a spot reserved.",
  ],
  "ALREADY IN THE COFFIN": [
    "The signs point to the graveyard. Coffy already grabbed the shovel.",
    "Too many red flags for Coffy's taste. The shovel is ready.",
    "Coffy is measuring the coffin. Just in case. Mostly not just in case.",
  ],
};

// quando o motivo principal e claro, a frase fala dele
const SERIAL_DEV = [
  "This dev has a crowded graveyard. Coffy is measuring another coffin.",
  "Serial digger detected. The graveyard has a spot reserved.",
  "The dev's past coins are resting in peace. All of them, almost.",
];
const TOKEN_DEAD = [
  "No pulse on the chart. The flowers are already ordered.",
  "Cold to the touch. Coffy is already picking the flowers.",
];

function templateLine(m: PremortemMetrics, verdict: Verdict) {
  const serial = !!m.dev && m.dev.launched >= 5 && m.dev.bodyCountPct >= 70;
  const options =
    verdict !== "ALIVE" && serial
      ? SERIAL_DEV
      : m.market.status === "dead"
        ? TOKEN_DEAD
        : TEMPLATES[verdict];
  const mint = m.mint;
  let h = 0;
  for (const ch of mint) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return options[h % options.length];
}

const SYSTEM = `You are Coffy, a cartoon coffin who performs "pre-mortems" on Solana memecoins.
Write ONE short, funny, slightly mocking diagnosis line (max 110 characters) about the token, based only on the JSON metrics given.
Rules:
- English only. No hashtags, no emojis, no quotes.
- Do not invent numbers. If you mention a number, it must appear in the JSON exactly.
- Never claim certainty: do not say it is a rug, a scam, or that it will die. Talk about signs and risk.
- No financial advice.`;

const LLM_TIMEOUT_MS = 3000;

// linha de diagnostico: llm (haiku) com timeout curto, senao template
export async function diagnosisLine(m: PremortemMetrics, verdict: Verdict, score: number) {
  const fallback = templateLine(m, verdict);
  if (!process.env.ANTHROPIC_API_KEY) return fallback;

  // so as metricas que o llm pode citar
  const facts = {
    symbol: m.symbol,
    verdict,
    score,
    devLaunched: m.dev?.launched ?? null,
    devDead: m.dev?.dead ?? null,
    devBonded: m.dev?.bonded ?? null,
    devHoldingPct: Math.round(m.holders.devHoldingPct * 10) / 10,
    top10Pct: Math.round(m.holders.top10Pct * 10) / 10,
    mintAuthorityRevoked: !m.authorities.mint,
    freezeAuthorityRevoked: !m.authorities.freeze,
  };

  try {
    const client = new Anthropic();
    const res = await client.messages.create(
      {
        model: "claude-haiku-4-5",
        max_tokens: 80,
        system: SYSTEM,
        messages: [{ role: "user", content: JSON.stringify(facts) }],
      },
      { timeout: LLM_TIMEOUT_MS, maxRetries: 0 },
    );
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .replace(/["“”]/g, "")
      .trim();

    // descarta se veio vazio, longo demais ou com numero que nao esta nas metricas
    const allowed = new Set(JSON.stringify(facts).match(/\d+(\.\d+)?/g) ?? []);
    const numbers = text.match(/\d+(\.\d+)?/g) ?? [];
    if (!text || text.length > 140 || numbers.some((n) => !allowed.has(n))) return fallback;
    // nada de linguagem de certeza
    if (/\b(rug(ged|s)?|scam)\b/i.test(text)) return fallback;
    return text;
  } catch (err) {
    console.error("diagnosis llm failed", err);
    return fallback;
  }
}
