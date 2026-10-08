"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Graveyard } from "@/components/Graveyard";
import { Stamp } from "@/components/Stamp";
import { coffySources, type CoffyExpression } from "@/lib/coffy";
import { examples } from "@/lib/site";
import { isSolanaAddress } from "@/lib/wallet";

const BASE58_CHARS = /^[1-9A-HJ-NP-Za-km-z]*$/;
const LINE = 11; // caracteres por linha gravada na lapide
const MOODS: CoffyExpression[] = ["default", "digging", "crying", "winking", "laughing"];

type Dust = { id: number; x: number; y: number; dx: number; dy: number; size: number };

export function TombstoneHero({ header }: { header: React.ReactNode }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const stoneRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const tombRef = useRef<HTMLImageElement>(null);

  const [value, setValue] = useState("");
  // a partir de qual letra a ultima mudanca entrou (pra animar so as novas)
  const [carveFrom, setCarveFrom] = useState(0);
  const [typing, setTyping] = useState(false);
  const [focused, setFocused] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // mensagem de erro (endereco invalido ou falha no inspect)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const error = errorMsg !== null;
  const [dust, setDust] = useState<Dust[]>([]);
  const [tilting, setTilting] = useState(false);
  // so mostra a gravacao depois que a pedra carregar (senao o texto fica flutuando)
  const [stoneReady, setStoneReady] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const dustId = useRef(0);

  const valid = isSolanaAddress(value);
  const badChars = !BASE58_CHARS.test(value) || value.length > 44;

  // humor do coffy conforme o que esta sendo digitado
  const mood: CoffyExpression = submitting
    ? "laughing"
    : error || badChars
      ? "crying"
      : valid
        ? "winking"
        : typing
          ? "digging"
          : "default";

  const caption = submitting
    ? "Coffy is checking what's in the coffin..."
    : errorMsg
      ? errorMsg
      : badChars
        ? "That's not a Solana address. Coffy is crying."
        : valid
          ? "Ready. Coffy will figure out if it's a token or a wallet."
          : value
            ? "Coffy is carving..."
            : "Paste a token CA or a wallet. Watch it get engraved.";

  function onChange(next: string) {
    const clean = next.replace(/\s/g, "");
    let common = 0;
    while (common < clean.length && common < value.length && clean[common] === value[common]) common++;
    const added = clean.length - common;

    setValue(clean);
    setCarveFrom(common);
    setErrorMsg(null);

    if (added > 0) {
      setTyping(true);
      clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), Math.min(1600, 500 + added * 30));
      spawnDust(Math.min(14, 4 + added * 2), clean.length);
    }
  }

  // solta poeirinha perto de onde a letra esta sendo gravada
  function spawnDust(count: number, length: number) {
    const line = Math.min(3, Math.floor(Math.max(0, length - 1) / LINE));
    const col = Math.max(0, length - 1) % LINE;
    const baseX = 8 + (col / LINE) * 84;
    const baseY = 34 + line * 13;
    const fresh: Dust[] = Array.from({ length: count }, () => ({
      id: dustId.current++,
      x: baseX + (Math.random() - 0.5) * 10,
      y: baseY + (Math.random() - 0.5) * 6,
      dx: (Math.random() - 0.5) * 70,
      dy: -10 - Math.random() * 40,
      size: 2 + Math.random() * 4,
    }));
    setDust((d) => [...d, ...fresh]);
    const ids = new Set(fresh.map((f) => f.id));
    setTimeout(() => setDust((d) => d.filter((p) => !ids.has(p.id))), 800);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!valid) {
      setErrorMsg("That's not a Solana address. Coffy is crying.");
      return;
    }
    setSubmitting(true);
    // reinicia a animacao de tremida
    const stone = stoneRef.current;
    stone?.classList.remove("thud");
    void stone?.offsetWidth;
    stone?.classList.add("thud");

    // descobre se e token ou wallet e vai pra pagina certa
    const started = Date.now();
    try {
      const res = await fetch(`/api/inspect?address=${value}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Coffy dropped his shovel. Try again in a minute.");
      const wait = 700 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      router.push(data.kind === "token" ? `/premortem/${value}` : `/autopsy/${value}`);
    } catch (err) {
      setSubmitting(false);
      setErrorMsg(err instanceof Error ? err.message : "Coffy dropped his shovel. Try again in a minute.");
    }
  }

  // chips de exemplo preenchem o campo (e gravam na lapide)
  function tryExample(address: string) {
    setValue(address);
    setCarveFrom(0);
    setErrorMsg(null);
    setTyping(true);
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => setTyping(false), 1600);
    spawnDust(14, address.length);
  }

  // inclina a lapide e move a luz conforme o mouse (so em telas com hover)
  function onPointerMove(e: React.PointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    glowRef.current?.style.setProperty("--mx", `${px * 100}%`);
    glowRef.current?.style.setProperty("--my", `${py * 100}%`);
    const stone = stoneRef.current;
    if (stone) {
      const r = stone.getBoundingClientRect();
      const sx = (e.clientX - (r.left + r.width / 2)) / rect.width;
      const sy = (e.clientY - (r.top + r.height / 2)) / rect.height;
      stone.style.transform = `rotateY(${sx * 22}deg) rotateX(${-sy * 16}deg)`;
      stone.style.setProperty("--gx", `${50 + sx * 120}%`);
      stone.style.setProperty("--gy", `${40 + sy * 120}%`);
    }
    if (!tilting) setTilting(true);
  }

  function onPointerLeave() {
    if (stoneRef.current) stoneRef.current.style.transform = "";
    setTilting(false);
  }

  useEffect(() => () => clearTimeout(typingTimer.current), []);

  // imagem ja em cache pode carregar antes do onLoad existir; garante a gravacao visivel
  useEffect(() => {
    if (tombRef.current?.complete) setStoneReady(true);
    const t = setTimeout(() => setStoneReady(true), 1500);
    return () => clearTimeout(t);
  }, []);

  const lines: string[] = [];
  for (let i = 0; i < Math.min(value.length, LINE * 4); i += LINE) lines.push(value.slice(i, i + LINE));

  return (
    <section
      className="relative overflow-hidden"
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <Graveyard />
      {/* luz quente seguindo o mouse */}
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-screen transition-opacity duration-500"
        style={{
          opacity: tilting ? 1 : 0,
          background:
            "radial-gradient(circle 260px at var(--mx, 50%) var(--my, 40%), rgba(242,140,40,0.22), transparent 70%)",
        }}
      />
      {header}

      <div className="relative mx-auto grid w-full max-w-5xl items-center gap-6 px-4 pb-14 pt-2 md:grid-cols-2 md:gap-10 md:pb-20 md:pt-8">
        <div className="flex flex-col gap-4">
          <Stamp className="bg-night/70">Pre-mortem · Autopsy</Stamp>
          <h1 className="cartoon-text font-display text-4xl font-bold leading-[1.1] sm:text-6xl">
            Paste a token or a wallet.{" "}
            <span className="text-pumpkin">Coffy tells you if it&apos;s already dead.</span>
          </h1>
          <p className="hidden max-w-md font-mono text-base leading-relaxed text-bone drop-shadow-[0_2px_0_#120b1a] md:block">
            Paste a token CA before you ape: Coffy checks how many coins the dev
            already buried, who holds the supply and if the authorities are
            revoked. Paste a wallet to see what killed it.
          </p>

          {/* form no desktop fica na coluna do texto */}
          <WalletInput
            id="wallet-desktop"
            className="hidden md:flex"
            inputRef={inputRef}
            value={value}
            onChange={onChange}
            onSubmit={onSubmit}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            caption={caption}
            alert={error || badChars}
            onExample={tryExample}
            submitting={submitting}
          />
        </div>

        {/* lapide + coffy */}
        <div className="relative mx-auto w-[min(78vw,340px)] [perspective:900px] md:w-[400px]">
          <div
            ref={stoneRef}
            onClick={() => inputRef.current?.focus()}
            className="relative cursor-text transition-transform duration-200 ease-out [transform-style:preserve-3d] @container"
            style={tilting ? undefined : { animation: "sway 6s ease-in-out infinite" }}
          >
            <Image
              src="/art/tombstone.png"
              alt=""
              width={744}
              height={900}
              priority
              ref={tombRef}
              onLoad={() => setStoneReady(true)}
              className="h-auto w-full drop-shadow-[0_14px_0_rgba(18,11,26,0.55)]"
            />
            {/* brilho na pedra acompanhando o mouse */}
            <div
              aria-hidden
              className="pointer-events-none absolute left-[24%] top-[14%] h-[70%] w-[60%] rounded-t-[50%] mix-blend-soft-light transition-opacity duration-300"
              style={{
                opacity: tilting ? 0.9 : 0,
                background:
                  "radial-gradient(circle at var(--gx, 50%) var(--gy, 40%), rgba(255,255,255,0.75), transparent 55%)",
              }}
            />

            {/* face da lapide com o texto gravado */}
            <div
              className={`absolute left-[27%] top-[19%] flex h-[60%] w-[54%] flex-col items-center transition-opacity duration-300 ${
                stoneReady ? "opacity-100" : "opacity-0"
              }`}
            >
              <span className="engraved font-display font-bold leading-none" style={{ fontSize: "13cqw" }}>
                R.I.P.
              </span>
              <span className="engraved mt-[3cqw] h-[1cqw] w-[60%] rounded-full bg-[#5d6378]/60" />

              <div
                className="relative mt-[4cqw] flex w-full flex-col items-center font-mono font-bold leading-[1.25]"
                style={{ fontSize: "6.2cqw" }}
              >
                {lines.length ? (
                  lines.map((line, li) => (
                    <span key={li} className="engraved whitespace-pre">
                      {line.split("").map((ch, ci) => {
                        const i = li * LINE + ci;
                        const fresh = i >= carveFrom;
                        return (
                          <span
                            key={`${i}-${ch}`}
                            className={fresh ? "chisel" : "inline-block"}
                            style={fresh ? { animationDelay: `${Math.min(900, (i - carveFrom) * 28)}ms` } : undefined}
                          >
                            {ch}
                          </span>
                        );
                      })}
                    </span>
                  ))
                ) : (
                  <span className="engraved text-center opacity-60" style={{ fontSize: "5.4cqw" }}>
                    token or wallet
                    <br />
                    goes here
                  </span>
                )}
                {focused && !submitting && (
                  <span aria-hidden className="engraved animate-pulse">▍</span>
                )}

              </div>

              {/* poeira saindo da gravacao */}
              {dust.map((p) => (
                <span
                  key={p.id}
                  className="dust"
                  style={
                    {
                      left: `${p.x}%`,
                      top: `${p.y}%`,
                      width: p.size,
                      height: p.size,
                      "--dx": `${p.dx}px`,
                      "--dy": `${p.dy}px`,
                    } as React.CSSProperties
                  }
                />
              ))}
            </div>
          </div>

          {/* coffy reagindo, com as expressoes pre-carregadas pra trocar sem piscar */}
          <div className="pointer-events-none absolute -bottom-3 -right-8 h-[46%] w-[46%] md:-right-16">
            {MOODS.map((m) => (
              <Image
                key={m}
                src={coffySources[m]}
                alt={m === mood ? `Coffy looks ${m}` : ""}
                width={260}
                height={260}
                priority
                className={`absolute inset-0 h-full w-full drop-shadow-[0_8px_0_rgba(18,11,26,0.6)] transition-opacity duration-200 ${
                  m === mood ? "opacity-100" : "opacity-0"
                } ${m === "digging" ? "animate-dig" : "animate-float"}`}
              />
            ))}
          </div>
        </div>

        {/* form no celular fica embaixo da lapide */}
        <WalletInput
          id="wallet-mobile"
          className="flex md:hidden"
          inputRef={inputRef}
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          caption={caption}
          alert={error || badChars}
          onExample={tryExample}
          submitting={submitting}
        />
      </div>
    </section>
  );
}

function WalletInput({
  id,
  className,
  inputRef,
  value,
  onChange,
  onSubmit,
  onFocus,
  onBlur,
  caption,
  alert,
  submitting,
  onExample,
}: {
  id: string;
  className: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onFocus: () => void;
  onBlur: () => void;
  caption: string;
  alert: boolean;
  submitting: boolean;
  onExample: (address: string) => void;
}) {
  return (
    <form
      onSubmit={onSubmit}
      className={`${className} flex-col gap-3 rounded-2xl border-4 border-outline bg-night/80 p-4 backdrop-blur-sm`}
    >
      <label className="sr-only" htmlFor={id}>
        Solana wallet address
      </label>
      <input
        id={id}
        // so um dos dois forms (celular/desktop) fica visivel; o ref vai pro que estiver na tela
        ref={(el) => {
          if (el && el.offsetParent !== null) inputRef.current = el;
        }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Paste a token CA or a wallet"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-xl border-4 border-outline bg-bone px-4 py-3 font-mono text-sm text-outline placeholder:text-stone-dark focus:outline-none focus:ring-4 focus:ring-pumpkin/50"
      />
      <button
        type="submit"
        disabled={submitting}
        className="cartoon-shadow rounded-xl border-4 border-outline bg-pumpkin px-6 py-3 font-display text-xl font-bold text-outline transition-transform hover:-translate-y-0.5 active:translate-y-1 disabled:opacity-80"
      >
        {submitting ? "Digging..." : "Check it"}
      </button>
      <p
        aria-live="polite"
        className={`font-mono text-xs ${alert ? "text-pumpkin" : "text-bone/80"}`}
      >
        {caption}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onExample(examples.token)}
          className="rounded-full border-[3px] border-outline bg-panel px-3 py-1 font-display text-sm font-bold text-goo hover:bg-night"
        >
          Try a token
        </button>
        <button
          type="button"
          onClick={() => onExample(examples.wallet)}
          className="rounded-full border-[3px] border-outline bg-panel px-3 py-1 font-display text-sm font-bold text-pumpkin hover:bg-night"
        >
          Try a wallet
        </button>
        <span className="font-mono text-xs text-bone/80">Read-only, no wallet connect.</span>
      </div>
    </form>
  );
}
