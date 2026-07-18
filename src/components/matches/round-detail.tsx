"use client";

import { useTranslations } from "next-intl";

import type { RoundReport } from "@/lib/dissect/report";
import { cn } from "@/lib/utils";

export function RoundDetail({
  round,
  myTeam,
}: {
  round: RoundReport;
  myTeam: number;
}) {
  const t = useTranslations("matches");
  const teamText = (team: number) =>
    team === myTeam ? "text-sky-400" : "text-rose-400";
  const order: (0 | 1)[] = myTeam === 0 ? [0, 1] : [1, 0];

  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 flex items-center justify-between text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          <span>{t("killFeed")}</span>
          <span className="font-mono text-[11px] text-muted-foreground/60 normal-case">
            {round.site}
          </span>
        </h3>
        <div className="flex flex-col gap-0.5">
          {round.kills.length === 0 ? (
            <p className="p-1.5 text-sm text-muted-foreground">
              {t("noKills")}
            </p>
          ) : (
            round.kills.map((kill, index) => (
              <div
                key={index}
                className="grid grid-cols-[3rem_1fr_auto] items-center gap-2.5 rounded px-2 py-1.5 odd:bg-muted/30"
              >
                <span className="font-mono text-xs text-muted-foreground/70 tabular-nums">
                  {kill.t}
                </span>
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className={cn("font-semibold", teamText(kill.killerTeam))}
                  >
                    {kill.killer}
                  </span>
                  <span className="text-xs text-muted-foreground/60">▸</span>
                  <span className="text-muted-foreground line-through decoration-muted-foreground/40">
                    {kill.victim}
                  </span>
                </span>
                {kill.hs ? (
                  <span
                    title={t("headshot")}
                    className="grid size-4 place-items-center rounded-full border border-amber-500/50 bg-amber-500/10 font-mono text-[9px] font-bold text-amber-400"
                  >
                    HS
                  </span>
                ) : (
                  <span className="size-4" />
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {t("lineups")}
        </h3>
        <div className="flex flex-col gap-4">
          {order.map((team) => (
            <div key={team}>
              <div
                className={cn(
                  "mb-2 flex items-center gap-2 font-mono text-[11px] tracking-wider uppercase",
                  teamText(team),
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-sm",
                    team === myTeam ? "bg-sky-500" : "bg-rose-500",
                  )}
                />
                {team === myTeam ? t("yourTeam") : t("enemy")}
              </div>
              <div className="flex flex-col gap-1">
                {round.lineup[team].map((op, index) => (
                  <div
                    key={index}
                    className="flex items-baseline justify-between gap-2 rounded-md border border-white/5 bg-muted/20 px-2.5 py-1.5 text-sm"
                  >
                    <span
                      className={cn(
                        "font-semibold",
                        op.op === "Unknown" && "text-amber-400",
                      )}
                    >
                      {op.op === "Unknown" ? t("unknownOp") : op.op}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {op.user}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
