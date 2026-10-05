import Link from "next/link";
import { site } from "@/lib/site";

export function SiteHeader() {
  return (
    <header className="relative mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
      <Link href="/" className="font-display text-2xl font-bold text-bone">
        Coffy
      </Link>
      <Link
        href="/#token"
        className="rounded-lg border-[3px] border-outline bg-panel px-3 py-1 font-display font-bold text-pumpkin"
      >
        {site.ticker}
      </Link>
    </header>
  );
}
