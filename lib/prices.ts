import { WSOL_MINT } from "./metrics";

const PRICE_URL = "https://lite-api.jup.ag/price/v3";
const CHUNK = 50;

// preco atual de cada token em sol, via jupiter (token sem preco = sem liquidez, vale 0)
export async function fetchPricesSol(mints: string[]) {
  const ids = [WSOL_MINT, ...mints.filter((m) => m !== WSOL_MINT)];
  const usd = new Map<string, number>();

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) chunks.push(ids.slice(i, i + CHUNK));

  await Promise.all(
    chunks.map(async (chunk) => {
      const res = await fetch(`${PRICE_URL}?ids=${chunk.join(",")}`, {
        signal: AbortSignal.timeout(10000),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`jupiter price http ${res.status}`);
      const body: Record<string, { usdPrice?: number } | null> = await res.json();
      for (const [mint, info] of Object.entries(body)) {
        if (info?.usdPrice) usd.set(mint, info.usdPrice);
      }
    }),
  );

  const solUsd = usd.get(WSOL_MINT);
  if (!solUsd) throw new Error("jupiter returned no sol price");

  const sol = new Map<string, number>();
  for (const [mint, price] of usd) sol.set(mint, price / solUsd);
  return sol;
}
