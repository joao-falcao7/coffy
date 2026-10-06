"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { isSolanaAddress } from "@/lib/wallet";

export function WalletForm() {
  const router = useRouter();
  const [wallet, setWallet] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = wallet.trim();
    if (!isSolanaAddress(value)) {
      setError("That's not a Solana wallet. Even the dead have valid addresses.");
      return;
    }
    setError(null);
    router.push(`/autopsy/${value}`);
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
      <label htmlFor="wallet" className="sr-only">
        Solana wallet address
      </label>
      <input
        id="wallet"
        value={wallet}
        onChange={(e) => setWallet(e.target.value)}
        placeholder="Paste a Solana wallet address"
        autoComplete="off"
        spellCheck={false}
        className="w-full rounded-xl border-4 border-outline bg-bone px-4 py-3 font-mono text-sm text-outline placeholder:text-stone-dark focus:outline-none focus:ring-4 focus:ring-pumpkin/50"
      />
      <button
        type="submit"
        className="rounded-xl border-4 border-outline bg-pumpkin px-6 py-3 font-display text-xl font-bold text-outline shadow-[0_6px_0_#120b1a] transition-transform hover:-translate-y-0.5 active:translate-y-1 active:shadow-[0_2px_0_#120b1a]"
      >
        Perform autopsy
      </button>
      {error && <p className="font-mono text-xs text-pumpkin">{error}</p>}
      <p className="font-mono text-xs text-bone/80">
        Read-only. No wallet connect, no signatures. Just your on-chain history.
      </p>
    </form>
  );
}
