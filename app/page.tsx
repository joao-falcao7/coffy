import { Coffy } from "@/components/Coffy";
import { CopyButton } from "@/components/CopyButton";
import { NightSky } from "@/components/NightSky";
import { SiteHeader } from "@/components/SiteHeader";
import { Stamp } from "@/components/Stamp";
import { WalletForm } from "@/components/WalletForm";
import { site } from "@/lib/site";

const steps = [
  {
    title: "Paste a wallet",
    text: "Any Solana address. Yours, your friend's, that guy who keeps calling tops.",
  },
  {
    title: "Coffy digs",
    text: "He reads the on-chain trades and runs the numbers: PnL, worst trade, rugs held to zero.",
  },
  {
    title: "Get buried",
    text: "A full autopsy report plus a tombstone card with your epitaph, ready to post on X.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* hero */}
      <section className="relative overflow-hidden">
        <NightSky />
        <SiteHeader />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-8 px-4 pb-16 pt-6 md:flex-row md:gap-12 md:pb-24 md:pt-12">
          <div className="flex w-full flex-col gap-5 md:flex-1">
            <Stamp>Wallet Autopsy</Stamp>
            <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
              Paste your wallet.{" "}
              <span className="text-pumpkin">Coffy performs the autopsy.</span>
            </h1>
            <p className="font-mono text-sm leading-relaxed text-stone-light">
              Find out what killed your portfolio: cause of death, worst trade,
              bad habits and a final score. Then get a tombstone to share.
            </p>
            <WalletForm />
          </div>

          <div className="relative order-first md:order-none">
            <Coffy priority size={260} className="h-52 w-52 sm:h-64 sm:w-64" />
            <Stamp rotate={10} className="absolute -right-2 top-4 bg-night">
              REKT
            </Stamp>
          </div>
        </div>

        {/* grama */}
        <div aria-hidden className="h-4 border-t-4 border-outline bg-goo" />
      </section>

      {/* como funciona */}
      <section className="bg-panel px-4 py-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <h2 className="font-display text-3xl font-bold">How it works</h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex flex-col gap-2 rounded-2xl border-4 border-outline bg-night p-5"
              >
                <span className="font-display text-4xl font-bold text-goo">
                  {i + 1}
                </span>
                <h3 className="font-display text-xl font-bold">{step.title}</h3>
                <p className="font-mono text-sm leading-relaxed text-stone-light">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* token */}
      <section id="token" className="px-4 py-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
          <div className="flex flex-col gap-3">
            <Stamp rotate={-4}>Next of kin</Stamp>
            <h2 className="font-display text-3xl font-bold">
              <span className="text-pumpkin">{site.ticker}</span> is the coin
              behind the coroner
            </h2>
            <p className="max-w-2xl font-mono text-sm leading-relaxed text-stone-light">
              Coffy is a tech memecoin on Solana. The token is the brand behind a
              tool that actually works: every autopsy shared on X is a little
              funeral procession for {site.ticker}. No fees, no treasury, no
              wallet connect. Just a coffin with a shovel and opinions.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-2xl border-4 border-outline bg-panel p-4">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-stone">
              Contract address
            </span>
            {site.contractAddress ? (
              <div className="flex items-center gap-3">
                <code className="min-w-0 flex-1 truncate font-mono text-sm">
                  {site.contractAddress}
                </code>
                <CopyButton value={site.contractAddress} />
              </div>
            ) : (
              <span className="font-mono text-sm text-pumpkin">
                Soon. Launching on pump.fun on Halloween week.
              </span>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <TokenLink href={site.pumpFunUrl} label="Buy on pump.fun" />
            <TokenLink href={site.xUrl} label="Follow on X" />
          </div>
        </div>
      </section>

      <footer className="mt-auto border-t-4 border-outline bg-outline px-4 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 font-mono text-xs text-stone sm:flex-row sm:justify-between">
          <span>Coffy · Wallet Autopsy</span>
          <span>Not financial advice. Mostly roasts.</span>
        </div>
      </footer>
    </main>
  );
}

// link do token; sem url mostra desabilitado com "soon"
function TokenLink({ href, label }: { href: string | null; label: string }) {
  const base =
    "flex-1 rounded-xl border-4 border-outline px-5 py-3 text-center font-display text-lg font-bold";
  if (!href) {
    return (
      <span aria-disabled className={`${base} bg-stone-dark text-stone-light`}>
        {label} · soon
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} bg-goo text-outline shadow-[0_6px_0_#120b1a]`}
    >
      {label}
    </a>
  );
}
