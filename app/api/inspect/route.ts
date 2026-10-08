import { HeliusError } from "@/lib/helius";
import { inspectAddress } from "@/lib/inspect";
import { BUSY_MESSAGE, rateLimit } from "@/lib/ratelimit";
import { isSolanaAddress } from "@/lib/wallet";

export async function GET(request: Request) {
  const address = new URL(request.url).searchParams.get("address")?.trim() ?? "";
  if (!isSolanaAddress(address)) {
    return Response.json(
      { error: "That's not a Solana address. Paste a token CA or a wallet." },
      { status: 400 },
    );
  }

  const limited = await rateLimit(request, "inspect");
  if (limited) return limited;

  try {
    const kind = await inspectAddress(address);
    return Response.json({ kind });
  } catch (err) {
    const busy = err instanceof HeliusError && err.status === 429;
    console.error("inspect failed", address, err);
    return Response.json(
      { error: busy ? BUSY_MESSAGE : "Coffy dropped his shovel. Try again in a minute." },
      { status: busy ? 503 : 500 },
    );
  }
}

// fila da helius em pico pode demorar; da folga antes do timeout da funcao
export const maxDuration = 60;
