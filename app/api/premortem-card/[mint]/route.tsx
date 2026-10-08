import { ImageResponse } from "next/og";
import { coffySources } from "@/lib/coffy";
import { cardColors as c, cardFonts, publicDataUri } from "@/lib/og";
import { getPremortem } from "@/lib/premortem";
import { DISCLAIMER, bodyCountShort, tokenLabel, verdictColor } from "@/lib/premortem/present";
import { verdictExpression } from "@/lib/premortem/score";
import { siteUrl } from "@/lib/site";
import { isSolanaAddress, shortAddress } from "@/lib/wallet";

const background = publicDataUri("/art/bg-graveyard.png");

// card do pre-mortem: ?format=square gera 1080x1080 pra download, senao 1200x630 (og)
export async function GET(request: Request, ctx: RouteContext<"/api/premortem-card/[mint]">) {
  const { mint } = await ctx.params;
  if (!isSolanaAddress(mint)) return new Response("Invalid mint", { status: 400 });

  const square = new URL(request.url).searchParams.get("format") === "square";
  const W = square ? 1080 : 1200;
  const H = square ? 1080 : 630;

  const [p, fonts, bg] = await Promise.all([
    getPremortem(mint).catch(() => null),
    cardFonts(),
    background,
  ]);
  if (!p) return new Response("Pre-mortem unavailable", { status: 404 });

  const coffy = await publicDataUri(coffySources[verdictExpression(p.verdict)]);
  const color = verdictColor[p.verdict];
  const host = siteUrl().replace(/^https?:\/\//, "");
  const body = bodyCountShort(p);

  // medidas do prontuario em cada formato
  const panel = square
    ? { left: 60, top: 170, width: 960, height: 640 }
    : { left: 48, top: 30, width: 760, height: 500 };
  const bigSize = square ? 180 : 118;
  const coffySize = square ? 290 : 270;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: c.night, fontFamily: "Space Mono", color: c.outline }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bg} width={square ? 1934 : 1200} height={square ? 1080 : 670} style={{ position: "absolute", left: square ? -427 : 0, top: square ? 0 : -20 }} alt="" />
        <div style={{ position: "absolute", inset: 0, display: "flex", background: "rgba(36,23,51,0.62)" }} />

        {/* prontuario */}
        <div
          style={{
            position: "absolute",
            ...panel,
            display: "flex",
            flexDirection: "column",
            padding: square ? "40px 48px" : "28px 36px",
            background: c.bone,
            border: `8px solid ${c.outline}`,
            borderRadius: 24,
            transform: "rotate(-1.2deg)",
            boxShadow: `0 10px 0 ${c.outline}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: square ? 24 : 20, fontWeight: 700, color: c.stoneDark, letterSpacing: 2 }}>
            <span>PRE-MORTEM REPORT</span>
            <span>{shortAddress(mint)}</span>
          </div>
          <div style={{ display: "flex", height: 4, background: c.stone, margin: "12px 0" }} />

          <span style={{ fontFamily: "Fredoka", fontSize: square ? 72 : 48, lineHeight: 1.05 }}>
            {tokenLabel(p)}
          </span>

          {/* body count do dev em destaque */}
          <div style={{ display: "flex", alignItems: "flex-end", marginTop: square ? 18 : 6 }}>
            <span style={{ fontFamily: "Fredoka", fontSize: bigSize, lineHeight: 0.95, color: c.outline }}>
              {body ?? "?"}
            </span>
            <div style={{ display: "flex", flexDirection: "column", marginLeft: 18, marginBottom: square ? 22 : 14 }}>
              <span style={{ fontFamily: "Fredoka", fontSize: square ? 54 : 42, color: c.pumpkin, lineHeight: 1 }}>
                {body ? "BURIED" : "DEV UNKNOWN"}
              </span>
              <span style={{ fontSize: square ? 22 : 18, fontWeight: 700, color: c.stoneDark }}>
                {body ? "coins by this dev" : "not a pump.fun launch"}
              </span>
            </div>
          </div>

          {/* holders */}
          <div style={{ display: "flex", gap: 14, marginTop: square ? 26 : 14 }}>
            {[
              ["TOP 10", p.holders.available ? `${p.holders.top10Pct.toFixed(1)}%` : "n/a"],
              ["DEV HOLDS", `${p.holders.devHoldingPct.toFixed(1)}%`],
            ].map(([label, value]) => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", border: `4px solid ${c.outline}`, borderRadius: 12, background: "#e4dac2" }}>
                <span style={{ fontSize: square ? 22 : 18, fontWeight: 700, color: c.stoneDark }}>{label}</span>
                <span style={{ fontFamily: "Fredoka", fontSize: square ? 40 : 32 }}>{value}</span>
              </div>
            ))}
          </div>

          <span style={{ fontSize: square ? 26 : 19, fontWeight: 700, lineHeight: 1.3, marginTop: square ? 24 : 12 }}>
            {p.diagnosis}
          </span>
          {!square && (
            <span style={{ fontSize: 13, color: c.stoneDark, marginTop: "auto", paddingTop: 8 }}>{DISCLAIMER}</span>
          )}
        </div>

        {/* carimbo do veredito */}
        <div
          style={{
            position: "absolute",
            right: square ? 50 : 36,
            top: square ? 40 : 60,
            width: square ? 470 : 340,
            display: "flex",
            justifyContent: "center",
            textAlign: "center",
            padding: "10px 18px",
            background: "rgba(18,11,26,0.9)",
            border: `8px solid ${color}`,
            borderRadius: 18,
            transform: square ? "rotate(5deg)" : "rotate(7deg)",
            fontFamily: "Fredoka",
            fontSize: square ? 50 : 44,
            lineHeight: 1.05,
            color,
          }}
        >
          {p.verdict}
        </div>

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={coffy} width={coffySize} height={coffySize} style={{ position: "absolute", right: square ? 40 : 24, bottom: square ? 12 : 56 }} alt="" />

        {/* rodape */}
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: square ? 0 : 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 48px", background: c.outline, fontSize: 22, color: c.stoneLight }}>
          {!square && <span style={{ fontFamily: "Fredoka", color: c.pumpkin, fontSize: 28 }}>COFFY · Pre-mortem</span>}
          {!square && <span>{host}</span>}
        </div>
        {square && (
          <span style={{ position: "absolute", left: 64, bottom: 56, width: 640, fontSize: 21, lineHeight: 1.35, color: c.bone }}>
            {DISCLAIMER}
          </span>
        )}
        {square && (
          <div style={{ position: "absolute", left: 60, top: 60, display: "flex", flexDirection: "column" }}>
            <span style={{ fontFamily: "Fredoka", color: c.pumpkin, fontSize: 44 }}>COFFY · Pre-mortem</span>
            <span style={{ fontSize: 22, color: c.stoneLight }}>{host}</span>
          </div>
        )}
      </div>
    ),
    { width: W, height: H, fonts },
  );
}

// fila da helius em pico pode demorar; da folga antes do timeout da funcao
export const maxDuration = 60;
