import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Graveyard } from "@/components/Graveyard";
import { PremortemResult } from "@/components/PremortemResult";
import { SiteHeader } from "@/components/SiteHeader";
import { isSolanaAddress, shortAddress } from "@/lib/wallet";

export async function generateMetadata({
  params,
}: PageProps<"/premortem/[mint]">): Promise<Metadata> {
  const { mint } = await params;
  if (!isSolanaAddress(mint)) return {};
  const title = `Pre-mortem ${shortAddress(mint)} · Coffy`;
  const description = "Coffy checked this token: dev body count, holders and authorities.";
  const card = `/api/premortem-card/${mint}`;
  // og image aponta pro card do prontuario
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: card, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", title, description, images: [card] },
  };
}

export default async function PremortemPage({ params }: PageProps<"/premortem/[mint]">) {
  const { mint } = await params;
  if (!isSolanaAddress(mint)) notFound();

  return (
    <main className="relative flex flex-1 flex-col">
      <Graveyard dim="strong" className="inset-x-0 top-0 h-[85vh]" />
      <SiteHeader />
      <PremortemResult mint={mint} />
    </main>
  );
}
