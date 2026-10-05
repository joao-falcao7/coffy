import { AutopsyError, getAutopsy } from "@/lib/autopsy";
import { isSolanaAddress } from "@/lib/wallet";

// erros amigaveis pro usuario
const errors: Record<AutopsyError["code"], { status: number; message: string }> = {
  NO_TRADES: {
    status: 404,
    message: "Coffy found no token trades in the last 90 days. Either a saint or a fresh wallet.",
  },
  BUSY: {
    status: 503,
    message: "Too many bodies in line. Coffy is digging as fast as he can, try again in a minute.",
  },
  FAILED: {
    status: 500,
    message: "Coffy dropped his shovel. Try again in a minute.",
  },
};

export async function GET(request: Request) {
  const wallet = new URL(request.url).searchParams.get("wallet")?.trim() ?? "";
  if (!isSolanaAddress(wallet)) {
    return Response.json(
      { error: "That's not a valid Solana wallet address." },
      { status: 400 },
    );
  }

  try {
    const autopsy = await getAutopsy(wallet);
    return Response.json(autopsy);
  } catch (err) {
    const { status, message } = errors[err instanceof AutopsyError ? err.code : "FAILED"];
    return Response.json({ error: message }, { status });
  }
}
