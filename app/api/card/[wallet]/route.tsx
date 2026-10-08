import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getAutopsy } from "@/lib/autopsy";
import { coffySources, expressionForScore } from "@/lib/coffy";
import { siteUrl } from "@/lib/site";
import { isSolanaAddress, shortAddress } from "@/lib/wallet";

const c = {
  night: "#241733",
  outline: "#120b1a",
  bone: "#f3ead6",
  pumpkin: "#f28c28",
  goo: "#9be564",
  stoneLight: "#b2b8ca",
};

const fontsDir = join(process.cwd(), "assets/fonts");
const fonts = Promise.all([
  readFile(join(fontsDir, "fredoka-latin-700-normal.woff")),
  readFile(join(fontsDir, "space-mono-latin-400-normal.woff")),
  readFile(join(fontsDir, "space-mono-latin-700-normal.woff")),
]);

// le um asset de /public e devolve como data uri pro satori
async function dataUri(src: string) {
  const file = await readFile(join(process.cwd(), "public", src));
  const mime = src.endsWith(".svg") ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${file.toString("base64")}`;
}

const background = dataUri("/art/bg-graveyard.png");
const tombstone = dataUri("/art/tombstone.png");

// lapide: 744x900 no arquivo, desenhada com 540 de altura
const TOMB_H = 540;
const TOMB_W = Math.round((744 / 900) * TOMB_H);
const TOMB_LEFT = 60;
const TOMB_TOP = 630 - 64 - TOMB_H;

export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/card/[wallet]">,
) {
  const { wallet } = await ctx.params;
  if (!isSolanaAddress(wallet)) {
    return new Response("Invalid wallet", { status: 400 });
  }

  const [autopsy, [fredoka, mono, monoBold], bg, tomb] = await Promise.all([
    getAutopsy(wallet).catch(() => null),
    fonts,
    background,
    tombstone,
  ]);
  if (!autopsy) return new Response("Autopsy unavailable", { status: 404 });
  const coffy = await dataUri(coffySources[expressionForScore(autopsy.score)]);
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
        {/* cenario + escurecida pra dar contraste */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bg} width={1200} height={670} style={{ position: "absolute", left: 0, top: -20 }} alt="" />
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "rgba(36,23,51,0.45)" }} />

        {/* lapide com o texto gravado */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={tomb}
          width={TOMB_W}
          height={TOMB_H}
          style={{ position: "absolute", left: TOMB_LEFT, top: TOMB_TOP }}
          alt=""
        />
        <div
          style={{
            position: "absolute",
            left: TOMB_LEFT + Math.round(TOMB_W * 0.27),
            top: TOMB_TOP + Math.round(TOMB_H * 0.16),
            width: Math.round(TOMB_W * 0.54),
            height: Math.round(TOMB_H * 0.66),
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: c.outline,
          }}
        >
          <span style={{ fontFamily: "Fredoka", fontSize: 84, lineHeight: 1 }}>R.I.P.</span>
          <span style={{ fontWeight: 700, fontSize: 30, marginTop: 10 }}>{shortAddress(wallet)}</span>
          <div style={{ width: 200, height: 5, background: "#5d6378", borderRadius: 4, margin: "18px 0" }} />
          <span style={{ fontFamily: "Fredoka", fontSize: 27, lineHeight: 1.15, textAlign: "center" }}>
            {`“${autopsy.report.epitaph}”`}
          </span>
        </div>

        {/* causa e nota num painel escuro pra ler bem em miniatura */}
        <div
          style={{
            position: "absolute",
            left: 560,
            top: 44,
            width: 600,
            display: "flex",
            flexDirection: "column",
            padding: "26px 32px",
            background: "rgba(18,11,26,0.82)",
            border: `6px solid ${c.outline}`,
            borderRadius: 28,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: 4, color: c.stoneLight }}>CAUSE OF DEATH</span>
          <span style={{ fontFamily: "Fredoka", fontSize: 54, lineHeight: 1.05, color: c.pumpkin, marginTop: 6 }}>
            {autopsy.causeOfDeath}
          </span>
          <span style={{ fontWeight: 700, fontSize: 22, letterSpacing: 4, color: c.stoneLight, marginTop: 22 }}>SCORE</span>
          <div style={{ display: "flex", alignItems: "flex-end" }}>
            <span style={{ fontFamily: "Fredoka", fontSize: 120, lineHeight: 1, color: c.goo }}>{autopsy.score}</span>
            <span style={{ fontFamily: "Fredoka", fontSize: 44, color: c.stoneLight, marginLeft: 8, marginBottom: 12 }}>/100</span>
          </div>
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coffy} width={250} height={250} style={{ position: "absolute", right: 36, bottom: 58 }} alt="" />

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

// fila da helius em pico pode demorar; da folga antes do timeout da funcao
export const maxDuration = 60;
