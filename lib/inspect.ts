import { cached } from "@/lib/cache";
import { rpc } from "@/lib/helius";

export const TOKEN_PROGRAM = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";
export const TOKEN_2022_PROGRAM = "TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb";

export type AddressKind = "token" | "wallet";

type AccountInfo = {
  value: {
    owner: string;
    data: { parsed?: { type?: string } } | string[];
  } | null;
};

// token = conta mint do token program (ou token-2022); qualquer outra coisa e wallet
export async function inspectAddress(address: string): Promise<AddressKind> {
  const { value } = await cached(`inspect:${address}`, 24 * 60 * 60, async () => {
    const info = await rpc<AccountInfo>("getAccountInfo", [address, { encoding: "jsonParsed" }]);
    const acc = info.value;
    if (!acc) return "wallet" as AddressKind;
    const isTokenProgram = acc.owner === TOKEN_PROGRAM || acc.owner === TOKEN_2022_PROGRAM;
    const parsed = Array.isArray(acc.data) ? undefined : acc.data.parsed;
    return (isTokenProgram && parsed?.type === "mint" ? "token" : "wallet") as AddressKind;
  });
  return value;
}
