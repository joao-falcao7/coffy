"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Coffy } from "@/components/Coffy";
import { Stamp } from "@/components/Stamp";
import type { Premortem } from "@/lib/premortem";
import {
  DISCLAIMER,
  bodyCountSentence,
  shareText,
  tokenLabel,
  verdictColor,
} from "@/lib/premortem/present";
import { verdictExpression } from "@/lib/premortem/score";
import { shortAddress } from "@/lib/wallet";

const loadingMessages = [
  "Checking the dev's graveyard...",
  "Counting the bodies...",
  "Reading the holders list...",
  "Checking the authorities...",
  "Writing the pre-mortem...",
];

// tempo minimo de loading pra animacao nao piscar
const MIN_LOADING_MS = 2000;
// quantas lapides/caixoes mostrar na fileira
const MAX_ICONS = 40;

type State =
  | { status: "loading" }
  | { status: "error"; message: string; busy?: boolean }
  | { status: "done"; data: Premortem };

export function PremortemResult({ mint }: { mint: string }) {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    const started = Date.now();

    async function run() {
      try {
        const res = await fetch(`/api/premortem?mint=${mint}`);
        const data = await res.json();
        const wait = MIN_LOADING_MS - (Date.now() - started);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
        if (cancelled) return;
        if (!res.ok) {
          setState({
            status: "error",
            message: data.error ?? "Something went wrong.",
            busy: res.status === 429 || res.status === 503,
          });
        } else {
          setState({ status: "done", data });
        }
      } catch {
        if (!cancelled)
          setState({ status: "error", message: "Coffy dropped his shovel. Try again in a minute." });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [mint]);

  if (state.status === "loading") return <Loading />;
  if (state.status === "error") return <ErrorState message={state.message} busy={state.busy} />;
  return <Result p={state.data} />;
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
      <p aria-live="polite" className="font-mono text-sm text-bone">
        {loadingMessages[i]}
      </p>
    </section>
  );
}

function ErrorState({ message, busy }: { message: string; busy?: boolean }) {
  return (
    <section className="relative mx-auto flex w-full max-w-xl flex-1 flex-col items-center gap-6 px-4 py-16 text-center">
      <Coffy
        expression={busy ? "digging" : "crying"}
        size={200}
        className={`h-44 w-44 ${busy ? "animate-dig" : ""}`}
      />
      <h1 className="cartoon-text font-display text-3xl font-bold">
        {busy ? "Too many graves" : "The pre-mortem failed"}
      </h1>
      <p className="font-mono text-sm text-bone">{message}</p>
      <Link
        href="/"
        className="cartoon-shadow rounded-xl border-4 border-outline bg-pumpkin px-6 py-3 font-display text-lg font-bold text-outline"
      >
        Check another
      </Link>
    </section>
  );
}

// "checked 2 min ago", atualiza sozinho
function CheckedAgo({ at }: { at: number }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  const min = Math.max(0, Math.floor((now - at) / 60_000));
  return <>{min === 0 ? "checked just now" : `checked ${min} min ago`}</>;
}

function Result({ p }: { p: Premortem }) {
  const color = verdictColor[p.verdict];
  const label = tokenLabel(p);
  const cardUrl = `/api/premortem-card/${p.mint}`;

  function postOnX() {
    const url = `${window.location.origin}/premortem/${p.mint}`;
    const intent = `https://x.com/intent/post?text=${encodeURIComponent(shareText(p))}&url=${encodeURIComponent(url)}`;
    window.open(intent, "_blank", "noopener,noreferrer");
  }

  const dev = p.dev;
  const icons = dev ? dev.tokens.slice(0, MAX_ICONS) : [];

  return (
    <section className="relative mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pb-16 pt-4">
      {/* veredito */}
      <div className="flex items-center gap-4">
        <Coffy
          expression={verdictExpression(p.verdict)}
          size={200}
          className="animate-float h-28 w-28 shrink-0 sm:h-36 sm:w-36"
        />
        <div className="flex min-w-0 flex-col gap-2">
          <Stamp>
            Pre-mortem {shortAddress(p.mint)}
          </Stamp>
          <h1 className="cartoon-text truncate font-display text-3xl font-bold sm:text-4xl">{label}</h1>
          <span
            className="self-start rounded-xl border-4 bg-night/90 px-3 py-1 font-display text-xl font-bold sm:text-2xl"
            style={{ borderColor: color, color, transform: "rotate(-3deg)" }}
          >
            {p.verdict}
          </span>
          <span className="font-mono text-xs text-bone/80">
            <CheckedAgo at={p.checkedAt} /> · score {p.score}/100
          </span>
        </div>
      </div>

      {/* card + botoes */}
      <div className="flex flex-col gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={cardUrl}
          alt={`Pre-mortem card for ${label}: ${p.verdict}`}
          width={1200}
          height={630}
          className="aspect-[1200/630] w-full rounded-2xl border-4 border-outline bg-panel"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={postOnX}
            className="cartoon-shadow rounded-xl border-4 border-outline bg-pumpkin px-5 py-3 font-display text-lg font-bold text-outline active:translate-y-1"
          >
            Post on X
          </button>
          <a
            href={`${cardUrl}?format=square`}
            download={`coffy-premortem-${p.mint.slice(0, 6)}.png`}
            className="cartoon-shadow rounded-xl border-4 border-outline bg-goo px-5 py-3 text-center font-display text-lg font-bold text-outline active:translate-y-1"
          >
            Download card
          </a>
          <Link
            href="/"
            className="cartoon-shadow rounded-xl border-4 border-outline bg-panel px-5 py-3 text-center font-display text-lg font-bold text-bone active:translate-y-1"
          >
            Check another
          </Link>
        </div>
      </div>

      {/* diagnostico */}
      <p className="rounded-2xl border-4 border-outline bg-night/80 p-4 font-mono text-base font-bold text-bone">
        “{p.diagnosis}”
      </p>

      {/* body count do dev */}
      <article className="flex flex-col gap-4 rounded-2xl border-4 border-outline bg-panel p-5">
        <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-goo">Dev body count</h2>
        <p className="font-display text-2xl font-bold leading-tight sm:text-3xl">{bodyCountSentence(p)}</p>

        {dev && dev.launched > 0 && (
          <>
            <div className="flex flex-wrap gap-1.5" aria-label={`${dev.dead} dead, ${dev.alive} alive`}>
              {icons.map((t) => (
                <a
                  key={t.mint}
                  href={`/premortem/${t.mint}`}
                  title={`${shortAddress(t.mint)}: ${t.status}${t.bonded ? ", bonded" : ""}`}
                  className="relative"
                >
                  <Image
                    src={t.status === "dead" ? "/art/tombstone.png" : "/art/coffy-default.png"}
                    alt={t.status}
                    width={40}
                    height={40}
                    className={`h-9 w-9 object-contain ${t.status === "dead" ? "opacity-90" : ""}`}
                  />
                  {t.bonded && (
                    <span className="absolute -right-1 -top-1 rounded-full border-2 border-outline bg-goo px-1 font-mono text-[9px] font-bold text-outline">
                      B
                    </span>
                  )}
                </a>
              ))}
              {dev.tokens.length > MAX_ICONS && (
                <span className="self-center font-mono text-xs text-bone/80">
                  +{dev.tokens.length - MAX_ICONS} more
                </span>
              )}
            </div>
            <dl className="grid grid-cols-3 gap-3">
              {[
                ["Launched", dev.launched],
                ["Buried", dev.dead],
                ["Survivors (bonded)", dev.bonded],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border-[3px] border-outline bg-night p-3">
                  <dt className="font-mono text-[11px] font-bold uppercase tracking-widest text-bone/80">{k}</dt>
                  <dd className="font-display text-2xl font-bold">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="font-mono text-xs text-bone/80">
              Dead = market cap under $5k, or no trading pair after 24h. Dev:{" "}
              <span className="break-all">{dev.dev}</span>
            </p>
          </>
        )}
      </article>

      {/* holders + autoridades */}
      <div className="grid gap-5 md:grid-cols-2">
        <article className="flex flex-col gap-3 rounded-2xl border-4 border-outline bg-panel p-5">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-goo">Holders</h2>
          {p.holders.available ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Metric label="Top 10" value={`${p.holders.top10Pct.toFixed(1)}%`} />
                <Metric label="Dev holds" value={`${p.holders.devHoldingPct.toFixed(1)}%`} />
              </div>
              <ul className="flex flex-col gap-1 font-mono text-xs">
                {p.holders.list.slice(0, 8).map((h) => (
                  <li key={h.owner} className="flex items-center justify-between gap-2">
                    <span className="truncate text-bone/90">{shortAddress(h.owner)}</span>
                    <span className="flex items-center gap-2">
                      {h.label !== "holder" && (
                        <span className="rounded border-2 border-outline bg-night px-1.5 font-bold uppercase text-pumpkin">
                          {h.label === "curve" ? "bonding curve" : h.label}
                        </span>
                      )}
                      <span className="font-bold text-bone">{h.pct.toFixed(2)}%</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="font-mono text-[11px] text-bone/70">
                Top 10 excludes the pump.fun bonding curve and liquidity pools.
              </p>
            </>
          ) : (
            <p className="font-mono text-sm text-bone">
              Too many holders for Coffy to count. Dev holds {p.holders.devHoldingPct.toFixed(1)}%.
            </p>
          )}
        </article>

        <article className="flex flex-col gap-3 rounded-2xl border-4 border-outline bg-panel p-5">
          <h2 className="font-mono text-xs font-bold uppercase tracking-widest text-goo">Authorities</h2>
          <Authority label="Mint authority" active={!!p.authorities.mint} />
          <Authority label="Freeze authority" active={!!p.authorities.freeze} />
          <p className="font-mono text-[11px] text-bone/70">
            Revoked means nobody can mint more tokens or freeze your wallet.
          </p>
        </article>
      </div>

      <p className="text-center font-mono text-xs text-bone/80">{DISCLAIMER}</p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border-[3px] border-outline bg-night p-3">
      <span className="block font-mono text-[11px] font-bold uppercase tracking-widest text-bone/80">{label}</span>
      <span className="font-display text-2xl font-bold">{value}</span>
    </div>
  );
}

function Authority({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border-[3px] border-outline bg-night px-3 py-2">
      <span className="font-mono text-sm text-bone">{label}</span>
      <span className={`font-display text-lg font-bold ${active ? "text-pumpkin" : "text-goo"}`}>
        {active ? "✗ Active" : "✓ Revoked"}
      </span>
    </div>
  );
}
