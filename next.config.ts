import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// Wichtig: cacheComponents und partialPrefetching NICHT einschalten (Worker hängt, HTTP 500)
const nextConfig: NextConfig = {
  experimental: {
    // Rezeptfotos und Import-Dateien gehen per Server Action hoch. Fotos werden im Browser verkleinert,
    // ein Import-PDF darf bis 10 MB groß sein (Server prüft selbst nach). 11 MB lässt Platz für den Rest.
    serverActions: { bodySizeLimit: "11mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;

// Stellt bei `next dev` die Cloudflare-Bindings (D1) lokal bereit
initOpenNextCloudflareForDev();
