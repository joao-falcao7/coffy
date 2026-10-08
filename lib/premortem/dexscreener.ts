import type { PairInfo } from "./rules";

const API = "https://api.dexscreener.com/tokens/v1/solana";
const BATCH = 30;

type DexPair = {
  dexId: string;
  marketCap?: number;
  fdv?: number;
  baseToken: { address: string; symbol?: string; name?: string };
};

// pares de cada mint no dexscreener (lotes de 30, sem chave)
export async function fetchPairs(mints: string[]) {
  const byMint = new Map<string, PairInfo[]>();
  for (const m of mints) byMint.set(m, []);

  const batches: string[][] = [];
  for (let i = 0; i < mints.length; i += BATCH) batches.push(mints.slice(i, i + BATCH));

  await Promise.all(
    batches.map(async (batch) => {
      const res = await fetch(`${API}/${batch.join(",")}`, {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`dexscreener http ${res.status}`);
      const pairs: DexPair[] = await res.json();
      for (const p of pairs) {
        const list = byMint.get(p.baseToken.address);
        if (list) list.push({ dexId: p.dexId, marketCap: p.marketCap ?? p.fdv ?? null });
      }
    }),
  );
  return byMint;
}
