"use client";

import { useEffect, useState } from "react";
import { Coffy } from "@/components/Coffy";
import { Stamp } from "@/components/Stamp";
import { WalletForm } from "@/components/WalletForm";
import type { Autopsy } from "@/lib/autopsy";
import { expressionForScore } from "@/lib/coffy";
import { site } from "@/lib/site";
import { shortAddress } from "@/lib/wallet";

const loadingMessages = [
  "Grabbing the shovel...",
  "Digging through your trades...",
  "Counting the rugs...",
  "Measuring the bags...",
  "Identifying the body...",
  "Writing the death certificate...",
];

// tempo minimo de loading pra animacao nao piscar
const MIN_LOADING_MS = 2500;

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; autopsy: Autopsy };

export function AutopsyResult({ wallet }: { wallet: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function run() {
      try {
        const res = await fetch(`/api/autopsy?wallet=${wallet}`);
        const data = await res.json();
        const wait = MIN_LOADING_MS - (Date.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        if (!res.ok) {
          setState({ status: "error", message: data.error ?? "Something went wrong." });
        } else {
          setState({ status: "done", autopsy: data });
        }
      } catch {
        if (!cancelled)
          setState({
            status: "error",
            message: "Coffy dropped his shovel. Try again in a minute.",
          });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorState message={state.message} />;
  return <Result autopsy={state.autopsy} />;
}

function Loading() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % loadingMessages.length), 900);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <Coffy expression="digging" priority size={220} className="h-48 w-48 animate-dig" />
      <p aria-live="polite" className="font-mono text-sm text-stone-light">
        {loadingMessages[i]}
      </p>
    </section>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <section className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-6 px-4 py-16 text-center">
      <Coffy expression="crying" size={200} className="h-44 w-44" />
      <h1 className="font-display text-3xl font-bold">The autopsy failed</h1>
      <p className="font-mono text-sm text-stone-light">{message}</p>
      <div className="w-full">
        <WalletForm />
      </div>
    </section>
  );
}

function Result({ autopsy }: { autopsy: Autopsy }) {
  const { wallet, metrics: m, report } = autopsy;
  const short = shortAddress(wallet);
  const cardUrl = `/api/card/${wallet}`;

  function postOnX() {
    const text = `My wallet just got an autopsy by Coffy 🪦\n\nCause of death: ${autopsy.causeOfDeath}\nScore: ${autopsy.score}/100\n\n"${report.epitaph}"\n\n${site.ticker}`;
    const url = `${window.location.origin}/autopsy/${wallet}`;
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  const stats = [
    ["PnL (est.)", formatSol(m.pnlSol)],
    ["Swaps", m.trades],
    ["Tokens", m.tokens],
    ["Avg hold", formatHours(m.avgHoldHours)],
    ["Lost 90%+", m.deadTokens],
    ["Score", `${autopsy.score}/100`],
  ] as const;

  return (
    <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-4">
      <div className="flex items-center gap-4">
        <Coffy expression={expressionForScore(autopsy.score)} size={120} className="h-24 w-24 shrink-0" />
        <div className="flex flex-col gap-2">
          <Stamp>Subject {short}</Stamp>
          <h1 className="font-display text-3xl font-bold leading-tight sm:text-4xl">
            Cause of death: <span className="text-pumpkin">{autopsy.causeOfDeath}</span>
          </h1>
        </div>
      </div>

      {/* card */}
      <div className="flex flex-col gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardUrl}
          alt={`Tombstone for wallet ${short}: ${report.epitaph}`}
          width={1200}
          height={630}
          className="aspect-[1200/630] w-full rounded-2xl border-4 border-outline bg-panel"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={postOnX}
            className="flex-1 rounded-xl border-4 border-outline bg-pumpkin px-5 py-3 font-display text-lg font-bold text-outline shadow-[0_6px_0_#120b1a] active:translate-y-1 active:shadow-[0_2px_0_#120b1a]"
          >
            Post on X
          </button>
          <a
            href={cardUrl}
            download={`coffy-autopsy-${wallet.slice(0, 6)}.png`}
            className="flex-1 rounded-xl border-4 border-outline bg-goo px-5 py-3 text-center font-display text-lg font-bold text-outline shadow-[0_6px_0_#120b1a] active:translate-y-1 active:shadow-[0_2px_0_#120b1a]"
          >
            Download card
          </a>
        </div>
      </div>

      {/* laudo */}
      <article className="flex flex-col gap-6 rounded-2xl border-4 border-outline bg-bone p-5 font-mono text-sm text-outline sm:p-7">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b-4 border-dashed border-stone pb-4">
          <h2 className="font-display text-2xl font-bold">Autopsy report</h2>
          <span className="min-w-0 break-all text-xs text-stone-dark">{wallet}</span>
        </header>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-lg border-[3px] border-outline bg-stone-light p-3">
              <dt className="text-[11px] font-bold uppercase tracking-widest text-stone-dark">{label}</dt>
              <dd className="font-display text-xl font-bold">{value}</dd>
            </div>
          ))}
        </dl>

        <ReportSection title="Findings">{report.summary}</ReportSection>

        <ReportSection title="Worst trade">
          <strong>
            ${m.worstTrade.token} ({formatSol(m.worstTrade.pnlSol)})
          </strong>
          <br />
          {report.worstTradeRoast}
        </ReportSection>

        <ReportSection title="Best trade">
          <strong>
            ${m.bestTrade.token} ({formatSol(m.bestTrade.pnlSol)})
          </strong>
        </ReportSection>

        <ReportSection title="Bad habits">
          <ul className="list-inside list-disc">
            {report.badHabits.map((habit) => (
              <li key={habit}>{habit}</li>
            ))}
          </ul>
        </ReportSection>

        <ReportSection title="Epitaph">“{report.epitaph}”</ReportSection>
        <ReportSection title="Verdict">{report.verdict}</ReportSection>

        <p className="border-t-4 border-dashed border-stone pt-4 text-xs leading-relaxed text-stone-dark">
          Based on {m.trades} SOL swaps from {formatDate(m.window.fromTime)} to{" "}
          {formatDate(m.window.toTime)}
          {m.window.capped ? " (most recent activity only)" : ""}. PnL is an
          estimate: realized SOL plus the current value of tokens still held.
          Tokens with no price count as zero.
        </p>
      </article>

      <div className="flex flex-col gap-3">
        <h2 className="font-display text-2xl font-bold">Autopsy another wallet</h2>
        <WalletForm />
      </div>
    </section>
  );
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="text-xs font-bold uppercase tracking-widest text-pumpkin">{title}</h3>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}

function formatSol(n: number) {
  return `${n > 0 ? "+" : ""}${n} SOL`;
}

function formatDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatHours(h: number) {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${Math.round(h)} h`;
  return `${Math.round(h / 24)} days`;
}
