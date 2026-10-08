// regras do status de cada token do dev (ajuste aqui)

// abaixo disso de market cap (usd) o token conta como morto
export const DEAD_MCAP_USD = 5_000;
// sem par no dexscreener e mais velho que isso: morto
export const NO_PAIR_DEAD_AFTER_HOURS = 24;
// dex da pump.fun antes de bondar
export const PUMPFUN_DEX_ID = "pumpfun";

export type TokenStatus = "dead" | "alive";

export type PairInfo = { dexId: string; marketCap: number | null };

// classifica um token do dev a partir dos pares do dexscreener
export function classifyToken(
  pairs: PairInfo[],
  createdAt: number,
  now = Date.now() / 1000,
): { status: TokenStatus; bonded: boolean; marketCap: number | null } {
  // migrou pra fora da pump.fun = bondou
  const bonded = pairs.some((p) => p.dexId !== PUMPFUN_DEX_ID);

  if (!pairs.length) {
    const ageHours = (now - createdAt) / 3600;
    return {
      status: ageHours > NO_PAIR_DEAD_AFTER_HOURS ? "dead" : "alive",
      bonded: false,
      marketCap: null,
    };
  }

  const marketCap = Math.max(...pairs.map((p) => p.marketCap ?? 0));
  return { status: marketCap < DEAD_MCAP_USD ? "dead" : "alive", bonded, marketCap };
}
