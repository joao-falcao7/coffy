import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // o card le fontes e mascote via fs, garante que vao junto na funcao da vercel
  outputFileTracingIncludes: {
    "/api/card/*": ["./assets/fonts/**/*", "./public/art/**/*"],
    "/api/premortem-card/*": ["./assets/fonts/**/*", "./public/art/**/*"],
  },
};

export default nextConfig;
