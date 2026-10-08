import { readFile } from "node:fs/promises";
import { join } from "node:path";

// fontes e imagens compartilhadas pelos cards (next/og)

const fontsDir = join(process.cwd(), "assets/fonts");
const fontFiles = Promise.all([
  readFile(join(fontsDir, "fredoka-latin-700-normal.woff")),
  readFile(join(fontsDir, "space-mono-latin-400-normal.woff")),
  readFile(join(fontsDir, "space-mono-latin-700-normal.woff")),
]);

export async function cardFonts() {
  const [fredoka, mono, monoBold] = await fontFiles;
  return [
    { name: "Fredoka", data: fredoka, weight: 700 as const, style: "normal" as const },
    { name: "Space Mono", data: mono, weight: 400 as const, style: "normal" as const },
    { name: "Space Mono", data: monoBold, weight: 700 as const, style: "normal" as const },
  ];
}

// le um asset de /public e devolve como data uri pro satori
export async function publicDataUri(src: string) {
  const file = await readFile(join(process.cwd(), "public", src));
  const mime = src.endsWith(".svg") ? "image/svg+xml" : "image/png";
  return `data:${mime};base64,${file.toString("base64")}`;
}

export const cardColors = {
  night: "#241733",
  panel: "#3a2752",
  outline: "#120b1a",
  bone: "#f3ead6",
  pumpkin: "#f28c28",
  goo: "#9be564",
  amber: "#ffd34d",
  stone: "#9aa0b4",
  stoneLight: "#b2b8ca",
  stoneDark: "#5d6378",
};
