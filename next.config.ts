import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: "standalone",
};

export default nextConfig;

// Initialise the OpenNext Cloudflare dev context so `next dev` can access
// Cloudflare bindings locally. No-op outside of the dev server.
import("@opennextjs/cloudflare").then((m) => m.initOpenNextCloudflareForDev());
