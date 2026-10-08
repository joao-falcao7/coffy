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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// no maximo 5 chamadas em paralelo por instancia (plano gratis: 10 req/s)
const MAX_CONCURRENT = 5;
let active = 0;
const queue: (() => void)[] = [];

// alem do paralelismo, espaca o inicio das chamadas: no maximo ~8 por segundo
const MIN_GAP_MS = 125;
let nextStartAt = 0;

async function pace() {
  const now = Date.now();
  const startAt = Math.max(now, nextStartAt);
  nextStartAt = startAt + MIN_GAP_MS;
  if (startAt > now) await sleep(startAt - now);
}

async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => queue.push(r));
  active++;
  try {
    await pace();
    return await fn();
  } finally {
    active--;
    queue.shift()?.();
  }
}

const RETRIES = 5;

// toda chamada a helius passa por aqui: fila de concorrencia + retry com backoff em 429/5xx
export async function rpc<T>(method: string, params: unknown): Promise<T> {
  const key = process.env.HELIUS_API_KEY;
  if (!key) throw new HeliusError(500, "HELIUS_API_KEY missing");

  for (let attempt = 0; ; attempt++) {
    const res = await withSlot(() =>
      fetch(`${RPC_URL}?api-key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(20000),
        cache: "no-store",
      }),
    );

    const retryable = res.status === 429 || res.status >= 500;
    if (retryable && attempt < RETRIES) {
      // respeita o retry-after se vier, senao backoff exponencial com jitter
      const after = Number(res.headers.get("retry-after"));
      const wait = after > 0 ? after * 1000 : 500 * 2 ** attempt + Math.random() * 300;
      await sleep(Math.min(wait, 4000));
      continue;
    }
    if (!res.ok) throw new HeliusError(res.status, `helius ${method} http ${res.status}`);

    const body = await res.json();
    if (body.error) {
      // rate limit tambem pode vir dentro do json-rpc
      const limited = body.error.code === 429 || /rate limit/i.test(body.error.message ?? "");
      if (limited && attempt < RETRIES) {
        await sleep(Math.min(4000, 500 * 2 ** attempt + Math.random() * 300));
        continue;
      }
      throw new HeliusError(limited ? 429 : 502, `helius ${method}: ${body.error.message}`);
    }
    return body.result as T;
  }
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

// ---- pre-mortem ----

export const PUMP_PROGRAM = "6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P";

type FullTx = RawTx & {
  transaction: {
    message: {
      accountKeys: (string | { pubkey: string })[];
      header: { numRequiredSignatures: number };
    };
  };
  meta: (NonNullable<RawTx["meta"]> & { logMessages?: string[] | null }) | null;
};

const keysOf = (tx: FullTx) =>
  tx.transaction.message.accountKeys.map((k) => (typeof k === "string" ? k : k.pubkey));

// criacao na pump.fun: log "Create"/"CreateV2" do programa e o mint novo assinando a tx
function createdMint(tx: FullTx): string | null {
  const logs = tx.meta?.logMessages ?? [];
  if (!logs.some((l) => /Instruction: Create(V2)?$/.test(l))) return null;
  const keys = keysOf(tx);
  if (!keys.includes(PUMP_PROGRAM)) return null;
  const signers = keys.slice(0, tx.transaction.message.header.numRequiredSignatures);
  const mints = new Set((tx.meta?.postTokenBalances ?? []).map((b) => b.mint));
  return signers.find((s) => s !== keys[0] && mints.has(s)) ?? null;
}

export type MintInfo = {
  program: string;
  decimals: number;
  supply: string;
  mintAuthority: string | null;
  freezeAuthority: string | null;
};

// dados do mint (autoridades, supply); null se o endereco nao for mint
export async function fetchMintInfo(mint: string): Promise<MintInfo | null> {
  const res = await rpc<{
    value: { owner: string; data: { parsed?: { type?: string; info?: Record<string, unknown> } } } | null;
  }>("getAccountInfo", [mint, { encoding: "jsonParsed" }]);
  const parsed = res.value?.data?.parsed;
  if (!res.value || parsed?.type !== "mint" || !parsed.info) return null;
  const info = parsed.info as {
    decimals: number;
    supply: string;
    mintAuthority?: string | null;
    freezeAuthority?: string | null;
  };
  return {
    program: res.value.owner,
    decimals: info.decimals,
    supply: info.supply,
    mintAuthority: info.mintAuthority ?? null,
    freezeAuthority: info.freezeAuthority ?? null,
  };
}

// nome e simbolo do token via das
export async function fetchTokenMeta(mint: string) {
  try {
    const a = await rpc<{
      content?: { metadata?: { name?: string; symbol?: string }; links?: { image?: string } };
      token_info?: { symbol?: string };
    }>("getAsset", { id: mint });
    return {
      name: a.content?.metadata?.name?.trim() || null,
      symbol: (a.token_info?.symbol || a.content?.metadata?.symbol)?.trim() || null,
    };
  } catch {
    return { name: null, symbol: null };
  }
}

// quem criou o mint: fee payer da tx de criacao (as primeiras tx do mint)
export async function fetchCreation(mint: string) {
  const res = await rpc<{ data: FullTx[] }>("getTransactionsForAddress", [
    mint,
    {
      transactionDetails: "full",
      limit: 10,
      sortOrder: "asc",
      maxSupportedTransactionVersion: 1,
      filters: { status: "succeeded" },
    },
  ]);
  const txs = res.data;
  const creation = txs.find((t) => createdMint(t) === mint);
  if (creation) {
    return { dev: keysOf(creation)[0], createdAt: creation.blockTime ?? 0, pumpfun: true };
  }
  // nao foi lancado na pump.fun: usa o fee payer da primeira tx
  const first = txs[0];
  return first
    ? { dev: keysOf(first)[0], createdAt: first.blockTime ?? 0, pumpfun: false }
    : null;
}

export const MAX_DEV_CREATIONS = 100;
const DEV_PAGES = 3; // ate 3000 tx do dev (~300 creditos), cacheado por 15 min

// tokens que o dev criou na pump.fun (mais recentes primeiro, ate 100)
export async function fetchDevCreations(dev: string) {
  const created: { mint: string; createdAt: number }[] = [];
  let paginationToken: string | null = null;
  let complete = false;

  for (let page = 0; page < DEV_PAGES; page++) {
    const res: { data: FullTx[]; paginationToken: string | null } = await rpc(
      "getTransactionsForAddress",
      [
        dev,
        {
          transactionDetails: "full",
          limit: 1000,
          sortOrder: "desc",
          maxSupportedTransactionVersion: 1,
          filters: { status: "succeeded" },
          ...(paginationToken ? { paginationToken } : {}),
        },
      ],
    );
    for (const tx of res.data) {
      // so conta criacoes pagas pelo proprio dev
      if (keysOf(tx)[0] !== dev) continue;
      const mint = createdMint(tx);
      if (mint && !created.some((c) => c.mint === mint)) {
        created.push({ mint, createdAt: tx.blockTime ?? 0 });
      }
    }
    paginationToken = res.paginationToken;
    if (!paginationToken || !res.data.length) {
      complete = true;
      break;
    }
    if (created.length >= MAX_DEV_CREATIONS) break;
  }

  return { created: created.slice(0, MAX_DEV_CREATIONS), complete };
}

// maiores contas do token (top 20)
export async function fetchLargestAccounts(mint: string) {
  const res = await rpc<{ value: { address: string; amount: string; uiAmount: number | null }[] }>(
    "getTokenLargestAccounts",
    [mint],
  );
  return res.value;
}

// dono de cada conta de token (jsonParsed)
export async function fetchTokenAccountOwners(accounts: string[]) {
  const res = await rpc<{
    value: ({ data: { parsed?: { info?: { owner?: string } } } } | null)[];
  }>("getMultipleAccounts", [accounts, { encoding: "jsonParsed" }]);
  return res.value.map((a) => a?.data?.parsed?.info?.owner ?? null);
}

// programa dono de cada conta (null = conta sem dados, tipo pda de autoridade)
export async function fetchAccountPrograms(accounts: string[]) {
  const res = await rpc<{ value: ({ owner: string } | null)[] }>("getMultipleAccounts", [
    accounts,
    { encoding: "base64", dataSlice: { offset: 0, length: 0 } },
  ]);
  return res.value.map((a) => a?.owner ?? null);
}

// saldo de um dono em um mint (soma das contas)
export async function fetchOwnerBalance(owner: string, mint: string) {
  const res = await rpc<{
    value: { account: { data: { parsed: { info: { tokenAmount: { amount: string } } } } } }[];
  }>("getTokenAccountsByOwner", [owner, { mint }, { encoding: "jsonParsed" }]);
  return res.value.reduce(
    (sum, a) => sum + BigInt(a.account.data.parsed.info.tokenAmount.amount),
    BigInt(0),
  );
}
