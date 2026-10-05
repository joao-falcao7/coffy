"use client";

import { useState } from "react";

export function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-lg border-[3px] border-outline bg-goo px-3 py-1 font-display font-bold text-outline"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  );
}
