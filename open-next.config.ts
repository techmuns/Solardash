import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// The static-assets incremental cache serves prerendered pages straight from
// Cloudflare's asset storage, which keeps heavy `force-static` pages well under
// the Worker resource limits.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
