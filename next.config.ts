import { readFileSync } from "node:fs";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// Read rather than import: a JSON import here would need an import attribute
// and pull package.json into the module graph for no benefit.
const { version } = JSON.parse(readFileSync("./package.json", "utf8")) as {
  version: string;
};

const nextConfig: NextConfig = {
  env: {
    // Baked in at build time so the running app can say which build it is —
    // the first thing worth knowing when someone reports a bug.
    NEXT_PUBLIC_APP_VERSION: version,
    // Vercel sets this on every deployment; empty on a local dev server.
    NEXT_PUBLIC_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
  },
};

export default withNextIntl(nextConfig);
