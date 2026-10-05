import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AutopsyResult } from "@/components/AutopsyResult";
import { NightSky } from "@/components/NightSky";
import { SiteHeader } from "@/components/SiteHeader";
import { isSolanaAddress, shortAddress } from "@/lib/wallet";

export async function generateMetadata({
  params,
}: PageProps<"/autopsy/[wallet]">): Promise<Metadata> {
  const { wallet } = await params;
  if (!isSolanaAddress(wallet)) return {};
  const title = `R.I.P. ${shortAddress(wallet)} · Coffy Wallet Autopsy`;
  const description = "Coffy performed the autopsy. See what killed this wallet.";
  const card = `/api/card/${wallet}`;
  // og image aponta pro card da lapide
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: card, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", title, description, images: [card] },
  };
}

export default async function AutopsyPage({
  params,
}: PageProps<"/autopsy/[wallet]">) {
  const { wallet } = await params;
  if (!isSolanaAddress(wallet)) notFound();

  return (
    <main className="relative flex flex-1 flex-col">
      <NightSky />
      <SiteHeader />
      <AutopsyResult wallet={wallet} />
    </main>
  );
}
