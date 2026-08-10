import { describe, expect, it } from "vitest";

import { resolveAssetOrigin } from "@/lib/asset-origin";

const MAIN = "https://main.supabase.co";
const MAIN_KEY = "sb_publishable_main";
const ASSETS = "https://assets.supabase.co";
const ASSETS_KEY = "sb_publishable_assets";

describe("choosing where board assets are read from", () => {
  it("uses this environment's own project when nothing is overridden", () => {
    expect(resolveAssetOrigin(MAIN, MAIN_KEY)).toEqual({
      url: MAIN,
      key: MAIN_KEY,
      shared: false,
    });
  });

  it("uses the override when both halves are given", () => {
    expect(resolveAssetOrigin(MAIN, MAIN_KEY, ASSETS, ASSETS_KEY)).toEqual({
      url: ASSETS,
      key: ASSETS_KEY,
      shared: true,
    });
  });

  // A URL without its key would authenticate against the wrong project, so a
  // half-set pair must not be honoured — it falls back rather than breaking in
  // the browser.
  it("ignores a half-configured override", () => {
    expect(resolveAssetOrigin(MAIN, MAIN_KEY, ASSETS, undefined)).toEqual({
      url: MAIN,
      key: MAIN_KEY,
      shared: false,
    });
    expect(resolveAssetOrigin(MAIN, MAIN_KEY, undefined, ASSETS_KEY)).toEqual({
      url: MAIN,
      key: MAIN_KEY,
      shared: false,
    });
  });

  it("does not call it shared when the override is the main project", () => {
    const origin = resolveAssetOrigin(MAIN, MAIN_KEY, MAIN, ASSETS_KEY);
    expect(origin.shared).toBe(false);
    // ...and keeps the main key, not the override's.
    expect(origin.key).toBe(MAIN_KEY);
  });

  it("treats empty strings as unset", () => {
    expect(resolveAssetOrigin(MAIN, MAIN_KEY, "", "").shared).toBe(false);
  });
});
