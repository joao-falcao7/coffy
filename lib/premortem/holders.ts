import {
  fetchAccountPrograms,
  fetchLargestAccounts,
  fetchOwnerBalance,
  fetchTokenAccountOwners,
  HeliusError,
  PUMP_PROGRAM,
} from "@/lib/helius";

const SYSTEM_PROGRAM = "11111111111111111111111111111111";

// programas de pool/amm: contas deles sao liquidez, nao holder
const POOL_PROGRAMS = new Set([
  "pAMMBay6oceH9fJKBRHGP5D4bD4sWpmSwMn52FMfXEA", // pumpswap
  "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // raydium amm v4
  "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C", // raydium cpmm
  "CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK", // raydium clmm
  "LanMV9sAd7wArD4vJFi2qDdfnVhFxYSUg6eADduJ3uj", // raydium launchlab
  "LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo", // meteora dlmm
  "Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB", // meteora damm v1
  "cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG", // meteora damm v2
  "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN", // meteora dbc
  "whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc", // orca whirlpool
]);

// autoridades de pool que sao pda sem dados (nao da pra ver o programa dono)
const POOL_AUTHORITIES = new Set([
  "5Q544fKrFoe6tsEbD7S8EmxGTJYAKtTVhAW5Q5pge4j1", // raydium amm v4 authority
  "GpMZbSM2GgvTKHJirzeGfMFoaZ8UR2X7F4v8vHTvxFbL", // raydium cpmm authority
]);

export type HolderLabel = "curve" | "pool" | "dev" | "program" | "holder";

export type Holder = { owner: string; pct: number; label: HolderLabel };

export type HoldersData = {
  // false quando a rpc nao consegue listar os maiores holders (token com holders demais)
  available: boolean;
  top10Pct: number;
  devHoldingPct: number;
  list: Holder[];
};

const pctOf = (amount: bigint, supply: bigint) =>
  supply > BigInt(0) ? Number((amount * BigInt(1_000_000)) / supply) / 10_000 : 0;

export async function getHolders(mint: string, supply: bigint, dev: string | null): Promise<HoldersData> {
  const [largest, devBalance] = await Promise.all([
    fetchLargestAccounts(mint).catch((err) => {
      // rate limit sobe (vira "too many graves" e nao vai pro cache); so engole o erro de holders demais
      if (err instanceof HeliusError && err.status === 429) throw err;
      console.error("largest accounts failed", mint, err);
      return null;
    }),
    dev ? fetchOwnerBalance(dev, mint).catch(() => BigInt(0)) : Promise.resolve(BigInt(0)),
  ]);
  if (!largest?.length) {
    return { available: false, top10Pct: 0, devHoldingPct: pctOf(devBalance, supply), list: [] };
  }

  // conta de token -> dono -> programa dono do dono
  const owners = await fetchTokenAccountOwners(largest.map((a) => a.address));
  const uniqueOwners = [...new Set(owners.filter((o): o is string => !!o))];
  const programs = new Map(
    (await fetchAccountPrograms(uniqueOwners)).map((p, i) => [uniqueOwners[i], p] as const),
  );

  const label = (owner: string | null): HolderLabel => {
    if (!owner) return "program";
    if (owner === dev) return "dev";
    if (POOL_AUTHORITIES.has(owner)) return "pool";
    const program = programs.get(owner) ?? null;
    if (program === PUMP_PROGRAM) return "curve";
    if (program && POOL_PROGRAMS.has(program)) return "pool";
    if (program === SYSTEM_PROGRAM) return "holder";
    return "program";
  };

  // junta contas do mesmo dono
  const byOwner = new Map<string, { amount: bigint; label: HolderLabel }>();
  largest.forEach((acc, i) => {
    const owner = owners[i] ?? acc.address;
    const prev = byOwner.get(owner);
    byOwner.set(owner, {
      amount: (prev?.amount ?? BigInt(0)) + BigInt(acc.amount),
      label: prev?.label ?? label(owners[i]),
    });
  });

  const list: Holder[] = [...byOwner]
    .map(([owner, v]) => ({ owner, pct: pctOf(v.amount, supply), label: v.label }))
    .sort((a, b) => b.pct - a.pct);

  // top 10 sem bonding curve e sem pool
  const top10Pct = list
    .filter((h) => h.label !== "curve" && h.label !== "pool")
    .slice(0, 10)
    .reduce((s, h) => s + h.pct, 0);

  return {
    available: true,
    top10Pct: Math.round(top10Pct * 100) / 100,
    devHoldingPct: pctOf(devBalance, supply),
    list: list.slice(0, 15),
  };
}
