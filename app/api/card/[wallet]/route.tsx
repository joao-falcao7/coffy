import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getAutopsy } from "@/lib/autopsy";
import { coffySources, expressionForScore } from "@/lib/coffy";
import { siteUrl } from "@/lib/site";
import { isSolanaAddress, shortAddress } from "@/lib/wallet";

const c = {
  night: "#241733",
  panel: "#3a2752",
  outline: "#120b1a",
  bone: "#f3ead6",
  pumpkin: "#f28c28",
  goo: "#9be564",
  stone: "#9aa0b4",
  stoneLight: "#b2b8ca",
  stoneDark: "#5d6378",
};

const fontsDir = join(process.cwd(), "assets/fonts");
const fonts = Promise.all([
  readFile(join(fontsDir, "fredoka-latin-700-normal.woff")),
  readFile(join(fontsDir, "space-mono-latin-400-normal.woff")),
  readFile(join(fontsDir, "space-mono-latin-700-normal.woff")),
]);

// le o asset do mascote e devolve como data uri pro satori
async function coffyDataUri(src: string) {
  const file = await readFile(join(process.cwd(), "public", src));
  const mime = src.endsWith(".svg") ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${file.toString("base64")}`;
}

const stars = [
  [60, 50, 4], [210, 30, 3], [420, 70, 3], [700, 40, 4], [880, 110, 3],
  [1010, 200, 3], [40, 300, 3], [1150, 330, 4], [660, 90, 2],
];

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/card/[wallet]">,
) {
  const { wallet } = await ctx.params;
  if (!isSolanaAddress(wallet)) {
    return new Response("Invalid wallet", { status: 400 });
  }

  const [autopsy, [fredoka, mono, monoBold]] = await Promise.all([
    getAutopsy(wallet).catch(() => null),
    fonts,
  ]);
  if (!autopsy) return new Response("Autopsy unavailable", { status: 404 });
  const coffy = await coffyDataUri(coffySources[expressionForScore(autopsy.score)]);
  const host = siteUrl().replace(/^https?:\/\//, "");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: c.night,
          fontFamily: "Space Mono",
          color: c.bone,
        }}
      >
        {/* estrelas e lua */}
        {stars.map(([x, y, r], i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: r * 2,
              height: r * 2,
              borderRadius: 999,
              background: c.bone,
              opacity: 0.8,
            }}
          />
        ))}
        <div style={{ position: "absolute", right: 70, top: 40, width: 90, height: 90, borderRadius: 999, background: c.bone, display: "flex" }} />
        <div style={{ position: "absolute", right: 48, top: 28, width: 80, height: 80, borderRadius: 999, background: c.night, display: "flex" }} />

        {/* grama */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 64, height: 26, background: c.goo, borderTop: `6px solid ${c.outline}`, display: "flex" }} />
        {/* rodape */}
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 64,
            background: c.outline,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 48px",
            fontSize: 24,
            color: c.stoneLight,
          }}
        >
          <span style={{ fontFamily: "Fredoka", color: c.pumpkin, fontSize: 30 }}>COFFY · Wallet Autopsy</span>
          <span>{host}</span>
        </div>

        {/* lapide */}
        <div
          style={{
            position: "absolute",
            left: 70,
            bottom: 84,
            width: 560,
            height: 500,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            padding: "52px 44px 0",
            background: c.stone,
            border: `10px solid ${c.outline}`,
            borderRadius: "280px 280px 16px 16px",
            boxShadow: `inset -24px 0 0 ${c.stoneDark}`,
          }}
        >
          <span style={{ fontFamily: "Fredoka", fontSize: 104, color: c.outline, lineHeight: 1 }}>R.I.P.</span>
          <span style={{ fontWeight: 700, fontSize: 38, color: c.outline, marginTop: 12 }}>
            {shortAddress(wallet)}
          </span>
          <div style={{ width: 300, height: 6, background: c.stoneDark, borderRadius: 4, margin: "22px 0" }} />
          <span
            style={{
              fontFamily: "Fredoka",
              fontSize: 40,
              lineHeight: 1.15,
              color: c.outline,
              textAlign: "center",
            }}
          >
            {`“${autopsy.report.epitaph}”`}
          </span>
        </div>

        {/* lado direito: causa, nota, mascote */}
        <div
          style={{
            position: "absolute",
            left: 680,
            top: 60,
            width: 470,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 24, letterSpacing: 4, color: c.stoneLight }}>CAUSE OF DEATH</span>
          <span style={{ fontFamily: "Fredoka", fontSize: 58, lineHeight: 1.05, color: c.pumpkin, marginTop: 6 }}>
            {autopsy.causeOfDeath}
          </span>
          <span style={{ fontWeight: 700, fontSize: 24, letterSpacing: 4, color: c.stoneLight, marginTop: 28 }}>SCORE</span>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <span style={{ fontFamily: "Fredoka", fontSize: 140, lineHeight: 1, color: c.goo }}>{autopsy.score}</span>
            <span style={{ fontFamily: "Fredoka", fontSize: 48, color: c.stoneLight, marginLeft: 8, marginBottom: 14 }}>/100</span>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coffy} width={230} height={230} style={{ position: "absolute", right: 30, bottom: 70 }} alt="" />

      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Fredoka", data: fredoka, weight: 700, style: "normal" },
        { name: "Space Mono", data: mono, weight: 400, style: "normal" },
        { name: "Space Mono", data: monoBold, weight: 700, style: "normal" },
      ],
    },
  );
}
