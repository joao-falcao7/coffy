// dados do token e links; null = ainda nao existe, o site mostra "soon"
export const site = {
  name: "Coffy",
  ticker: "$COFFY",
  contractAddress: null as string | null,
  xUrl: null as string | null,
  pumpFunUrl: null as string | null,
};

// url publica do site: dominio proprio via env, senao a url de producao da vercel
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL)
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}
