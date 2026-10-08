"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { coffySources } from "@/lib/coffy";
import { site } from "@/lib/site";
import { shortAddress } from "@/lib/wallet";

// atalhos pras secoes da home (funcionam de qualquer pagina)
const links = [
  { href: "/#top", label: "Check a coin" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#token", label: site.ticker },
];

// barra fixa do topo: logo, atalhos, ca da $coffy e x
export function SiteHeader() {
  const [open, setOpen] = useState(false);

  // fecha o menu do celular com esc
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-50 border-b-4 border-outline bg-night/85 backdrop-blur-md">
      <nav className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2.5">
        <Link href="/#top" className="flex shrink-0 items-center gap-2" onClick={() => setOpen(false)}>
          <Image src={coffySources.default} alt="" width={36} height={36} className="h-9 w-9" />
          <span className="font-display text-2xl font-bold text-bone">Coffy</span>
        </Link>

        {/* atalhos no desktop */}
        <ul className="ml-4 hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="rounded-lg px-3 py-1.5 font-display font-bold text-bone/90 transition-colors hover:bg-panel hover:text-pumpkin"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto flex items-center gap-2">
          <ContractChip />
          <XLink className="hidden md:inline-flex" />
          {/* botao do menu no celular */}
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border-[3px] border-outline bg-panel font-display text-xl font-bold text-bone md:hidden"
          >
            {open ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* menu do celular */}
      {open && (
        <div id="mobile-menu" className="border-t-4 border-outline bg-night md:hidden">
          <ul className="mx-auto flex max-w-5xl flex-col px-4 py-2">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-2 py-3 font-display text-lg font-bold text-bone hover:bg-panel"
                >
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="py-2">
              <XLink className="inline-flex" />
            </li>
          </ul>
        </div>
      )}
    </header>
  );
}

// ca da $coffy: "soon" ate o lancamento, depois copia ao clicar
function ContractChip() {
  const [copied, setCopied] = useState(false);
  const ca = site.contractAddress;

  if (!ca) {
    return (
      <span
        title="Contract address drops at launch"
        className="rounded-lg border-[3px] border-dashed border-outline bg-panel px-2.5 py-1 font-mono text-xs font-bold text-bone/80"
      >
        CA: <span className="text-pumpkin">soon</span>
      </span>
    );
  }

  async function copy() {
    await navigator.clipboard.writeText(ca!);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      title={`Copy ${site.ticker} contract address`}
      className="rounded-lg border-[3px] border-outline bg-goo px-2.5 py-1 font-mono text-xs font-bold text-outline"
    >
      {copied ? "Copied!" : `CA: ${shortAddress(ca)}`}
    </button>
  );
}

function XLink({ className }: { className: string }) {
  if (!site.xUrl) {
    return (
      <span
        className={`${className} items-center rounded-lg border-[3px] border-dashed border-outline bg-panel px-2.5 py-1 font-display text-sm font-bold text-bone/80`}
      >
        X · soon
      </span>
    );
  }
  return (
    <a
      href={site.xUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`${className} items-center rounded-lg border-[3px] border-outline bg-panel px-2.5 py-1 font-display text-sm font-bold text-bone hover:text-pumpkin`}
    >
      Follow on X
    </a>
  );
}
