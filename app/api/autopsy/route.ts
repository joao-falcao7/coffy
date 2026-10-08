import { AutopsyError, getAutopsy } from "@/lib/autopsy";
import { BUSY_MESSAGE, rateLimit } from "@/lib/ratelimit";
import { isSolanaAddress } from "@/lib/wallet";

// erros amigaveis pro usuario
const errors: Record<AutopsyError["code"], { status: number; message: string }> = {
  NO_TRADES: {
    status: 404,
    message: "Coffy found no token trades in the last 90 days. Either a saint or a fresh wallet.",
  },
  BUSY: { status: 503, message: BUSY_MESSAGE },
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

  const limited = await rateLimit(request, "autopsy");
  if (limited) return limited;

  try {
    const autopsy = await getAutopsy(wallet);
    return Response.json(autopsy);
  } catch (err) {
    const code = err instanceof AutopsyError ? err.code : "FAILED";
    const { status, message } = errors[code];
    return Response.json({ error: message, code }, { status });
  }
}

// fila da helius em pico pode demorar; da folga antes do timeout da funcao
export const maxDuration = 60;
