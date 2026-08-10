/**
 * Where the shared, read-only board assets are read from — blueprints, gadget
 * icons and the replay decoder.
 *
 * Kept out of `env.ts` on purpose: that module parses the environment as a side
 * effect of being imported, which is right for a running app and wrong for a
 * pure function that anything should be able to call or test.
 */
export type AssetOrigin = {
  url: string;
  key: string;
  /** True when assets come from a different project than this env's data. */
  shared: boolean;
};

/**
 * Both override values must be present together — a URL without its key would
 * authenticate against the wrong project — so a half-configured pair falls back
 * to the main project rather than failing at runtime in the browser. An
 * override pointing at the main project is a no-op, not a share.
 */
export function resolveAssetOrigin(
  mainUrl: string,
  mainKey: string,
  assetUrl?: string,
  assetKey?: string,
): AssetOrigin {
  if (assetUrl && assetKey && assetUrl !== mainUrl) {
    return { url: assetUrl, key: assetKey, shared: true };
  }
  return { url: mainUrl, key: mainKey, shared: false };
}
