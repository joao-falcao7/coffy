import type { RawTx } from "./metrics";

const RPC_URL = "https://mainnet.helius-rpc.com/";

// limite da analise: 1 pagina de ate 1000 transacoes (~100 creditos) nos ultimos 90 dias
export const MAX_TXS = 1000;
export const WINDOW_DAYS = 90;

export class HeliusError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function rpc<T>(method: string, params: unknown): Promise<T> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new HeliusError(500, "HELIUS_API_KEY missing");

  const res = await fetch(`${RPC_URL}?api-key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
    cache: "no-store",
  });
  if (!res.ok) throw new HeliusError(res.status, `helius ${method} http ${res.status}`);
  const body = await res.json();
  if (body.error) throw new HeliusError(502, `helius ${method}: ${body.error.message}`);
  return body.result as T;
}

// historico da wallet, so transacoes que mexeram em token da propria wallet (corta spam)
export async function fetchWalletTxs(wallet: string) {
  const since = Math.floor(Date.now() / 1000) - WINDOW_DAYS * 86400;
  const result = await rpc<{ data: RawTx[]; paginationToken: string | null }>(
    "getTransactionsForAddress",
    [
      wallet,
      {
        transactionDetails: "full",
        limit: MAX_TXS,
        sortOrder: "desc",
        maxSupportedTransactionVersion: 1,
        filters: {
          status: "succeeded",
          tokenAccounts: "balanceChanged",
          blockTime: { gte: since },
          tokenTransfer: { direction: "any" },
        },
      },
    ],
  );
  return {
    txs: result.data,
    // se sobrou pagina, a analise cobre so as transacoes mais recentes
    capped: result.data.length >= MAX_TXS && !!result.paginationToken,
  };
}

// simbolo dos tokens via das (10 creditos por chamada)
export async function fetchSymbols(mints: string[]) {
  const symbols = new Map<string, string>();
  if (!mints.length) return symbols;
  const assets = await rpc<
    ({ id: string; content?: { metadata?: { symbol?: string } }; token_info?: { symbol?: string } } | null)[]
  >("getAssetBatch", { ids: mints });
  for (const a of assets) {
    const symbol = a?.token_info?.symbol || a?.content?.metadata?.symbol;
    if (a && symbol) symbols.set(a.id, symbol.trim());
  }
  return symbols;
}
