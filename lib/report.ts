import type { CauseOfDeath, Metrics, Report } from "./autopsy";

// laudo montado com frases prontas + metricas reais (sem llm, custo zero)
// a escolha das frases e fixa por wallet: mesma wallet, mesmo texto

function seededPicker(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const next = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  // descarta as primeiras saidas, que saem enviesadas pra seeds parecidas
  for (let i = 0; i < 8; i++) next();
  return <T,>(options: T[]) => options[Math.floor(next() * options.length)];
}

// preenche {chaves} do template
function fill(template: string, vars: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

const epitaphs: Record<CauseOfDeath, string[]> = {
  "Held the rug": [
    "Held the bag. The devs didn't.",
    "Trusted the dev. Fatal mistake.",
    "Diamond hands, paper chart.",
    "Waited for the bounce. The bounce never came.",
    "Rest in peace. The liquidity already did.",
    "Bought the dip. Then the dip's dip. Then the floor.",
  ],
  Overtrading: [
    "Clicked buy faster than it could think.",
    "Never met a chart it didn't ape.",
    "The buy button filed a restraining order.",
    "Too many trades, not enough brain cells.",
    "Died doing what it loved: paying fees.",
    "Every candle was a sign. None of them were good.",
  ],
  Paperhands: [
    "Sold the bottom. Every single time.",
    "Panic sold. Then watched it moon.",
    "Hands made of wet tissue paper.",
    "Took profits. Unfortunately, negative ones.",
    "Couldn't hold a token, let alone a conviction.",
    "Here lies a wallet that sold one candle too early.",
  ],
  "Bag holder": [
    "Diamond hands. Glass portfolio.",
    "Still holding. Still hoping. Still down.",
    "Married the bags. No prenup.",
    "It's not a loss if you never sell. Right?",
    "Held so long the token forgot it existed.",
    "Waiting for the 100x since forever.",
  ],
  "Death by a thousand cuts": [
    "Never one big loss. Just all the small ones.",
    "Lost slowly, then all at once.",
    "Each trade a tiny paper cut. Then it bled out.",
    "Small losses add up. Coffy did the math.",
    "Not rekt by one rug. Rekt by a hundred carpets.",
    "Died of a thousand dust trades.",
  ],
  "Still breathing": [
    "Not dead yet. Coffy is patient.",
    "Pulse detected. Coffy will wait.",
    "Survived this round. The shovel stays ready.",
    "Alive and annoyingly green.",
    "Escaped the coffin. For now.",
    "Somehow still kicking. Suspicious.",
  ],
};

const summaries = [
  "Coffy examined {trades} swaps across {tokens} tokens over {days}. Total put in: {spent} SOL. Estimated result: {result}.",
  "Over {days}, the deceased made {trades} swaps across {tokens} tokens, putting in {spent} SOL. Estimated result: {result}.",
  "The body shows {trades} swaps in {tokens} tokens over {days}. {spent} SOL went in. Estimated result: {result}.",
];

const worstRoasts = [
  "${token} took {loss} SOL and didn't even leave a note.",
  "${token} ate {loss} SOL. Coffy found the receipts.",
  "${token} burned {loss} SOL and called it a learning experience.",
  "${token}: the reason for {loss} SOL of therapy.",
  "${token} turned {loss} SOL into a life lesson.",
  "Somebody bought ${token}. That somebody lost {loss} SOL.",
];

const greenWorstRoasts = [
  "Even the worst trade was green. Suspicious.",
  "No losing trade found. Coffy demands a recount.",
  "The worst trade still made money. Coffy is confused.",
];

const habitTexts = {
  dead: [
    "{dead} of {tokens} bags lost 90% or more.",
    "{dead} tokens went to the graveyard and stayed there.",
    "{dead} positions are now decorative.",
  ],
  quickHold: [
    "Average hold of {hold}. Commitment issues.",
    "Holds a token for {hold}. Goldfish energy.",
    "{hold} average hold. Blink and it's sold.",
  ],
  longHold: [
    "Average hold of {hold}. Married the bags.",
    "Holds for {hold} on average. Hope is not a strategy.",
    "{hold} average hold. Patience of a saint, results of a sinner.",
  ],
  churn: [
    "{perToken} swaps per token. The buy button needs a break.",
    "Trades each token {perToken} times. In and out like a revolving door.",
    "{perToken} swaps per token. The fees send their regards.",
  ],
  manyTokens: [
    "Aped into {tokens} different tokens. Diversification, but tragic.",
    "{tokens} tokens touched. Loyal to none.",
  ],
  bigLoss: [
    "One trade ate {share}% of everything put in.",
    "A single position took {share}% of the bankroll down with it.",
  ],
  clean: [
    "No obvious bad habits. Coffy is almost disappointed.",
    "Clean record. Coffy checked twice.",
    "Nothing to report. That's the scariest part.",
  ],
};

const verdicts = {
  critical: [
    "Beyond saving. Coffy is already digging.",
    "Time of death: every time it opened a chart.",
    "No pulse. Coffy is picking the flowers.",
  ],
  bad: [
    "Critical condition. Start writing the eulogy.",
    "Barely breathing. Coffy has the shovel ready.",
    "On life support. The plug is within reach.",
  ],
  meh: [
    "Alive, but the smell is concerning.",
    "Stable, in the way a slowly sinking ship is stable.",
    "Not dead. Not exactly alive either.",
  ],
  ok: [
    "Surprisingly healthy. Coffy will check again later.",
    "Decent vitals. Coffy is mildly disappointed.",
    "This one might make it. Might.",
  ],
  great: [
    "Too alive for this coffin. For now.",
    "Disgustingly healthy. Coffy is jealous.",
    "No autopsy needed. Coffy left empty-handed.",
  ],
};

function formatHold(hours: number) {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} minutes`;
  if (hours < 48) return `${Math.round(hours)} hours`;
  return `${Math.round(hours / 24)} days`;
}

export function buildReport(
  wallet: string,
  m: Metrics,
  cause: CauseOfDeath,
  score: number,
): Report {
  const pick = seededPicker(wallet);

  const daysNum = Math.max(1, Math.round((m.window.toTime - m.window.fromTime) / 86400));
  const result =
    Math.abs(m.pnlSol) < 0.01
      ? "basically break-even"
      : `${m.pnlSol > 0 ? "+" : ""}${m.pnlSol} SOL`;

  const habits: string[] = [];
  if (m.deadTokens > 0)
    habits.push(fill(pick(habitTexts.dead), { dead: m.deadTokens, tokens: m.tokens }));
  if (m.avgHoldHours > 0 && m.avgHoldHours < 1)
    habits.push(fill(pick(habitTexts.quickHold), { hold: formatHold(m.avgHoldHours) }));
  if (m.avgHoldHours > 24 * 14)
    habits.push(fill(pick(habitTexts.longHold), { hold: formatHold(m.avgHoldHours) }));
  const perToken = m.trades / Math.max(m.tokens, 1);
  if (perToken >= 4)
    habits.push(fill(pick(habitTexts.churn), { perToken: perToken.toFixed(1) }));
  if (m.tokens >= 50) habits.push(fill(pick(habitTexts.manyTokens), { tokens: m.tokens }));
  const share = m.totalSpentSol ? (-m.worstTrade.pnlSol / m.totalSpentSol) * 100 : 0;
  if (share >= 30) habits.push(fill(pick(habitTexts.bigLoss), { share: Math.round(share) }));
  if (!habits.length) habits.push(pick(habitTexts.clean));

  const band =
    score < 20 ? "critical" : score < 40 ? "bad" : score < 60 ? "meh" : score < 80 ? "ok" : "great";

  return {
    epitaph: pick(epitaphs[cause]),
    summary: fill(pick(summaries), {
      trades: m.trades,
      tokens: m.tokens,
      days: `${daysNum} day${daysNum > 1 ? "s" : ""}`,
      spent: m.totalSpentSol,
      result,
    }),
    worstTradeRoast:
      m.worstTrade.pnlSol < 0
        ? fill(pick(worstRoasts), {
            token: m.worstTrade.token,
            loss: Math.abs(m.worstTrade.pnlSol),
          })
        : pick(greenWorstRoasts),
    badHabits: habits,
    verdict: pick(verdicts[band]),
  };
}
