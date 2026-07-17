"use client";

import { useTranslations } from "next-intl";

import type { PlayerStat } from "@/lib/dissect/report";
import { cn } from "@/lib/utils";

export function MatchStatsTable({
  stats,
  myTeam,
}: {
  stats: PlayerStat[];
  myTeam: number;
}) {
  const t = useTranslations("matches");
  const topKills = Math.max(0, ...stats.map((s) => s.kills));

  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {t("matchStats")}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
        <table className="w-full tabular-nums">
          <thead>
            <tr className="border-b border-border font-mono text-[10px] tracking-wider text-muted-foreground/70 uppercase">
              <th className="p-2.5 text-left font-medium">{t("statPlayer")}</th>
              <th className="p-2.5 text-right font-medium">{t("statK")}</th>
              <th className="p-2.5 text-right font-medium">{t("statD")}</th>
              <th className="p-2.5 text-right font-medium">{t("statA")}</th>
              <th className="p-2.5 text-right font-medium">{t("statHS")}</th>
              <th className="p-2.5 text-right font-medium">{t("statHSPct")}</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((stat) => (
              <tr
                key={stat.user}
                className="border-b border-white/5 last:border-0 hover:bg-muted/20"
              >
                <td className="p-2.5 text-left">
                  <span className="flex items-center gap-2 font-semibold">
                    <span
                      className={cn(
                        "size-2 rounded-sm",
                        stat.team === myTeam ? "bg-sky-500" : "bg-rose-500",
                      )}
                    />
                    {stat.user}
                    {stat.kills === topKills ? (
                      <span title={t("topFragger")} className="text-amber-400">
                        ★
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="p-2.5 text-right font-mono">{stat.kills}</td>
                <td className="p-2.5 text-right font-mono text-muted-foreground">
                  {stat.deaths}
                </td>
                <td className="p-2.5 text-right font-mono text-muted-foreground">
                  {stat.assists}
                </td>
                <td className="p-2.5 text-right font-mono">{stat.headshots}</td>
                <td className="p-2.5 text-right font-mono text-amber-400">
                  {stat.hsPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
