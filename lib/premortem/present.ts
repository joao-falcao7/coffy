import type { Premortem } from "./index";
import type { Verdict } from "./score";

// textos e cores do pre-mortem usados na pagina, no card e no post do x

export const DISCLAIMER =
  "Not financial advice. Coffy reads on-chain data, he doesn't predict the future.";

export const verdictColor: Record<Verdict, string> = {
  ALIVE: "#9be564",
  "IN THE ICU": "#ffd34d",
  "ALREADY IN THE COFFIN": "#f28c28",
};

export function tokenLabel(p: Pick<Premortem, "symbol" | "name" | "mint">) {
  if (p.symbol) return `$${p.symbol}`;
  if (p.name) return p.name;
  return `${p.mint.slice(0, 4)}…${p.mint.slice(-4)}`;
}

// "14/17" ou null quando nao ha historico do dev
export function bodyCountShort(p: Pick<Premortem, "dev">) {
  return p.dev ? `${p.dev.dead}/${p.dev.launched}` : null;
}

export function bodyCountSentence(p: Pick<Premortem, "dev">) {
  const d = p.dev;
  if (!d) return "Not a pump.fun launch. Coffy couldn't trace the dev's graveyard.";
  if (d.launched <= 1) return "This is the dev's first coin on pump.fun. No graveyard yet.";
  return `This dev buried ${d.dead} of ${d.launched} coins${d.complete ? "" : " (latest launches)"}.`;
}

export function shareText(p: Premortem) {
  const dev = p.dev && p.dev.launched > 1 ? ` Dev buried ${p.dev.dead}/${p.dev.launched} coins.` : "";
  return `Coffy checked ${tokenLabel(p)}: ${p.verdict}.${dev} 🪦`;
}
