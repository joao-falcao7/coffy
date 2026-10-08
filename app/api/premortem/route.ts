import { getPremortem, PremortemError } from "@/lib/premortem";
import { BUSY_MESSAGE, rateLimit } from "@/lib/ratelimit";
import { isSolanaAddress } from "@/lib/wallet";

const errors: Record<PremortemError["code"], { status: number; message: string }> = {
  NOT_A_TOKEN: { status: 400, message: "That's not a token mint. Paste a token CA." },
  BUSY: { status: 503, message: BUSY_MESSAGE },
  FAILED: { status: 500, message: "Coffy dropped his shovel. Try again in a minute." },
};

export async function GET(request: Request) {
  const mint = new URL(request.url).searchParams.get("mint")?.trim() ?? "";
  if (!isSolanaAddress(mint)) {
    return Response.json({ error: "That's not a valid token address." }, { status: 400 });
  }

  const limited = await rateLimit(request, "premortem");
  if (limited) return limited;

  try {
    return Response.json(await getPremortem(mint));
  } catch (err) {
    const code = err instanceof PremortemError ? err.code : "FAILED";
    const { status, message } = errors[code];
    return Response.json({ error: message, code }, { status });
  }
}

// fila da helius em pico pode demorar; da folga antes do timeout da funcao
export const maxDuration = 60;
