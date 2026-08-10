"use client";

import { useTranslations } from "next-intl";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { APP_VERSION, buildLabel, COMMIT_SHA, shortSha } from "@/lib/version";

/**
 * Which build the reader is looking at. Small and muted — nobody needs it until
 * something is wrong, and then it is the first question worth answering.
 */
export function AppVersion() {
  const t = useTranslations("version");
  const label = buildLabel(APP_VERSION, COMMIT_SHA);

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span
            tabIndex={0}
            aria-label={t("label", { version: label })}
            className="w-fit rounded-md px-2 py-0.5 text-[0.65rem] text-muted-foreground tabular-nums"
          >
            {label}
          </span>
        }
      />
      <TooltipContent side="right">
        {COMMIT_SHA
          ? t("withCommit", {
              version: APP_VERSION,
              commit: shortSha(COMMIT_SHA),
            })
          : t("local", { version: APP_VERSION })}
      </TooltipContent>
    </Tooltip>
  );
}
