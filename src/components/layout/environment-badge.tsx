import { useTranslations } from "next-intl";

import { appEnv, isProduction } from "@/lib/env";

/**
 * Marks every non-production deployment. Staging and production are both
 * `*.vercel.app` running near-identical UIs against different databases, so
 * without this the only way to tell which one you are typing into is to read
 * the address bar.
 */
export function EnvironmentBadge() {
  const t = useTranslations("environment");
  if (isProduction) return null;

  return (
    <span
      className="rounded-sm border border-amber-500/40 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-amber-600 uppercase dark:text-amber-400"
      title={t("warning")}
    >
      {t(appEnv)}
    </span>
  );
}
