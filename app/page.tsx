import { Coffy } from "@/components/Coffy";
import { CopyButton } from "@/components/CopyButton";
import { Graveyard } from "@/components/Graveyard";
import { SiteHeader } from "@/components/SiteHeader";
import { Stamp } from "@/components/Stamp";
import { WalletForm } from "@/components/WalletForm";
import type { CoffyExpression } from "@/lib/coffy";
import { site } from "@/lib/site";

const steps: { title: string; text: string; expression: CoffyExpression }[] = [
  {
    title: "Paste a wallet",
    text: "Any Solana address. Yours, your friend's, that guy who keeps calling tops.",
    expression: "winking",
  },
  {
    title: "Coffy digs",
    text: "He reads the on-chain trades and runs the numbers: PnL, worst trade, rugs held to zero.",
    expression: "digging",
  },
  {
    title: "Get buried",
    text: "A full autopsy report plus a tombstone card with your epitaph, ready to post on X.",
    expression: "laughing",
  },
];

export default function Home() {
  return (
    <main className="flex flex-1 flex-col">
      {/* hero */}
      <section className="relative overflow-hidden">
        <Graveyard />
        <SiteHeader />

        <div className="relative mx-auto flex w-full max-w-5xl flex-col items-center gap-6 px-4 pb-16 pt-2 md:flex-row md:gap-12 md:pb-24 md:pt-10">
          <div className="flex w-full flex-col gap-5 md:flex-1">
            <Stamp className="bg-night/70">Wallet Autopsy</Stamp>
            <h1 className="cartoon-text font-display text-4xl font-bold leading-[1.1] sm:text-6xl">
              Paste your wallet.{" "}
              <span className="text-pumpkin">Coffy performs the autopsy.</span>
            </h1>
            <p className="max-w-md font-mono text-sm leading-relaxed text-bone drop-shadow-[0_2px_0_#120b1a] md:text-base">
              Find out what killed your portfolio: cause of death, worst trade,
              bad habits and a final score. Then get a tombstone to share.
            </p>
            <div className="rounded-2xl border-4 border-outline bg-night/80 p-4 backdrop-blur-sm">
              <WalletForm />
            </div>
          </div>

          <div className="relative order-first md:order-none">
            <Coffy
              priority
              size={420}
              className="animate-float h-60 w-60 sm:h-80 sm:w-80 md:h-96 md:w-96"
            />
            <Stamp rotate={12} className="absolute right-0 top-6 bg-night/80 text-sm">
              REKT
            </Stamp>
          </div>
        </div>
      </section>

      {/* como funciona */}
      <section className="border-y-4 border-outline bg-panel px-4 py-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
          <h2 className="cartoon-text font-display text-4xl font-bold">How it works</h2>
          <ol className="grid gap-5 md:grid-cols-3">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="cartoon-shadow relative flex items-center gap-4 rounded-2xl border-4 border-outline bg-night p-4 md:flex-col md:items-start md:p-5"
              >
                <Coffy
                  expression={step.expression}
                  size={160}
                  className="h-24 w-24 shrink-0 md:h-32 md:w-32 md:self-center"
                />
                <div className="flex flex-col gap-1">
                  <span className="font-display text-sm font-bold uppercase tracking-widest text-goo">
                    Step {i + 1}
                  </span>
                  <h3 className="font-display text-2xl font-bold">{step.title}</h3>
                  <p className="font-mono text-sm leading-relaxed text-bone md:text-base">
                    {step.text}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* token */}
      <section id="token" className="relative px-4 py-14">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-8 md:flex-row">
          <div className="flex w-full flex-col gap-6 md:flex-1">
            <div className="flex flex-col gap-3">
              <Stamp rotate={-4}>Next of kin</Stamp>
              <h2 className="cartoon-text font-display text-4xl font-bold leading-tight">
                <span className="text-pumpkin">{site.ticker}</span> is the coin
                behind the coroner
              </h2>
              <p className="max-w-2xl font-mono text-sm leading-relaxed text-bone md:text-base">
                Coffy is a tech memecoin on Solana. The token is the brand behind
                a tool that actually works: every autopsy shared on X is a little
                funeral procession for {site.ticker}. No fees, no treasury, no
                wallet connect. Just a coffin with a shovel and opinions.
              </p>
            </div>

            <div className="flex flex-col gap-2 rounded-2xl border-4 border-outline bg-panel p-4">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-goo">
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

          <Coffy
            expression="winking"
            size={300}
            className="animate-float hidden h-64 w-64 md:block"
          />
        </div>
      </section>

      <footer className="mt-auto border-t-4 border-outline bg-outline px-4 py-6">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-1 font-mono text-xs text-bone/80 sm:flex-row sm:justify-between">
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
      <span aria-disabled className={`${base} border-dashed bg-panel text-bone/80`}>
        {label} · soon
      </span>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`${base} cartoon-shadow bg-goo text-outline`}
    >
      {label}
    </a>
  );
}
