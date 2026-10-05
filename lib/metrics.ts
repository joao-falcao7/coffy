import type { Metrics } from "./autopsy";

export const WSOL_MINT = "So11111111111111111111111111111111111111112";

// stables nao contam como token negociado (sem preco em sol facil)
const IGNORED_MINTS = new Set([
  "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // usdc
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB", // usdt
]);

// abaixo disso e taxa, rent de conta ou airdrop, nao swap
const MIN_SWAP_SOL = 0.005;
const LAMPORTS = 1e9;

// formato minimo do getTransactionsForAddress (transactionDetails: full)
type TokenBalance = {
  accountIndex: number;
  mint: string;
  owner?: string;
  uiTokenAmount: { amount: string; decimals: number };
};

export type RawTx = {
  blockTime: number | null;
  transaction: { message: { accountKeys: (string | { pubkey: string })[] } };
  meta: {
    err: unknown;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  } | null;
};

export type Swap = {
  time: number;
  mint: string;
  side: "buy" | "sell";
  sol: number; // sempre positivo
  amount: number; // sempre positivo
};

// token que entrou ou saiu sem sol na outra ponta (envio entre wallets, airdrop)
export type Transfer = {
  mint: string;
  dir: "in" | "out";
  amount: number;
};

// separa as transacoes cruas em swaps token <-> sol e transferencias de token
export function extractActivity(txs: RawTx[], wallet: string) {
  const swaps: Swap[] = [];
  const transfers: Transfer[] = [];

  for (const tx of txs) {
    const meta = tx.meta;
    if (!meta || meta.err || !tx.blockTime) continue;

    const keys = tx.transaction.message.accountKeys.map((k) =>
      typeof k === "string" ? k : k.pubkey,
    );
    const idx = keys.indexOf(wallet);

    // variacao de sol nativo, devolvendo a taxa da rede se a wallet pagou
    let solDelta = 0;
    if (idx !== -1) {
      solDelta = meta.postBalances[idx] - meta.preBalances[idx];
      if (idx === 0) solDelta += meta.fee;
      solDelta /= LAMPORTS;
    }

    // variacao de cada token da wallet (wsol soma no sol)
    const tokenDeltas = new Map<string, number>();
    const add = (b: TokenBalance, sign: 1 | -1) => {
      if (b.owner !== wallet) return;
      const value = (Number(b.uiTokenAmount.amount) / 10 ** b.uiTokenAmount.decimals) * sign;
      tokenDeltas.set(b.mint, (tokenDeltas.get(b.mint) ?? 0) + value);
    };
    meta.preTokenBalances?.forEach((b) => add(b, -1));
    meta.postTokenBalances?.forEach((b) => add(b, 1));

    solDelta += tokenDeltas.get(WSOL_MINT) ?? 0;
    tokenDeltas.delete(WSOL_MINT);
    for (const mint of IGNORED_MINTS) tokenDeltas.delete(mint);

    const changed = [...tokenDeltas].filter(([, d]) => d !== 0);
    if (!changed.length) continue;

    // sem sol relevante: e transferencia de token
    if (Math.abs(solDelta) < MIN_SWAP_SOL) {
      for (const [mint, d] of changed) {
        transfers.push({ mint, dir: d > 0 ? "in" : "out", amount: Math.abs(d) });
      }
      continue;
    }

    // swap simples: exatamente um token mudou, contra sol na direcao oposta
    if (changed.length !== 1) continue;
    const [mint, amount] = changed[0];
    if (Math.sign(amount) === Math.sign(solDelta)) continue;

    swaps.push({
      time: tx.blockTime,
      mint,
      side: amount > 0 ? "buy" : "sell",
      sol: Math.abs(solDelta),
      amount: Math.abs(amount),
    });
  }

  swaps.sort((a, b) => a.time - b.time);
  return { swaps, transfers };
}

export type Position = {
  mint: string;
  spentSol: number;
  receivedSol: number;
  bought: number;
  sold: number;
  transferredIn: number;
  transferredOut: number;
  firstBuy: number | null;
  lastSell: number | null;
};

export function buildPositions(swaps: Swap[], transfers: Transfer[]): Position[] {
  const map = new Map<string, Position>();
  const get = (mint: string) => {
    let p = map.get(mint);
    if (!p) {
      p = {
        mint,
        spentSol: 0,
        receivedSol: 0,
        bought: 0,
        sold: 0,
        transferredIn: 0,
        transferredOut: 0,
        firstBuy: null,
        lastSell: null,
      };
      map.set(mint, p);
    }
    return p;
  };

  for (const s of swaps) {
    const p = get(s.mint);
    if (s.side === "buy") {
      p.spentSol += s.sol;
      p.bought += s.amount;
      p.firstBuy ??= s.time;
    } else {
      p.receivedSol += s.sol;
      p.sold += s.amount;
      p.lastSell = s.time;
    }
  }
  for (const t of transfers) {
    const p = map.get(t.mint);
    if (!p) continue; // token que nunca foi negociado aqui (airdrop, spam)
    if (t.dir === "in") p.transferredIn += t.amount;
    else p.transferredOut += t.amount;
  }

  // ignora tokens comprados antes da janela (so venda), senao viram lucro falso
  return [...map.values()].filter((p) => p.spentSol > 0);
}

// resultado de uma posicao contando so os tokens comprados nesta wallet:
// o que saiu por transferencia nao entra (nao da pra saber o destino),
// e o que entrou por transferencia nao conta como lucro
export function evaluatePosition(p: Position, priceSol: number | undefined) {
  const pool = p.bought + p.transferredIn;
  const left = Math.max(0, pool - p.sold - p.transferredOut);
  const own = p.bought / pool;
  const kept = Math.min(1, (p.sold + left) / pool);
  const value = left * (priceSol ?? 0);
  const cost = p.spentSol * kept;
  const returned = (p.receivedSol + value) * own;
  return { cost, returned, pnl: returned - cost, left };
}

export function computeMetrics(
  swaps: Swap[],
  positions: Position[],
  pricesSol: Map<string, number>,
): Omit<Metrics, "window"> | null {
  const round = (n: number) => Math.round(n * 100) / 100;

  // descarta posicoes que sairam quase inteiras por transferencia
  const scored = positions
    .map((p) => ({ p, ...evaluatePosition(p, pricesSol.get(p.mint)) }))
    .filter((x) => x.cost > 0.001);
  if (!scored.length) return null;

  const totalSpent = scored.reduce((s, x) => s + x.cost, 0);
  const pnl = scored.reduce((s, x) => s + x.pnl, 0);

  // tokens que perderam 90% ou mais do que foi colocado
  const deadTokens = scored.filter((x) => x.returned < x.cost * 0.1).length;

  const holds = scored
    .filter((x) => x.p.firstBuy !== null && x.p.lastSell !== null && x.p.lastSell >= x.p.firstBuy)
    .map((x) => (x.p.lastSell! - x.p.firstBuy!) / 3600);
  const avgHoldHours = holds.length ? holds.reduce((a, b) => a + b, 0) / holds.length : 0;

  const byPnl = [...scored].sort((a, b) => a.pnl - b.pnl);
  const toTrade = (x: (typeof scored)[number]) => ({
    // simbolo real e preenchido depois, so pro pior e melhor trade
    token: `${x.p.mint.slice(0, 4)}…`,
    mint: x.p.mint,
    pnlSol: round(x.pnl),
  });

  const mints = new Set(scored.map((x) => x.p.mint));
  return {
    pnlSol: round(pnl),
    totalSpentSol: round(totalSpent),
    trades: swaps.filter((s) => mints.has(s.mint)).length,
    tokens: scored.length,
    avgHoldHours: round(avgHoldHours),
    deadTokens,
    worstTrade: toTrade(byPnl[0]),
    bestTrade: toTrade(byPnl[byPnl.length - 1]),
  };
}
