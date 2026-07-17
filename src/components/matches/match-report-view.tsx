"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

import { MatchStatsTable } from "@/components/matches/match-stats-table";
import { RoundDetail } from "@/components/matches/round-detail";
import type { MatchReport } from "@/lib/dissect/report";
import { cn } from "@/lib/utils";

const shortSite = (site: string) => site.split(",")[0]?.trim() ?? site;

export function MatchReportView({ report }: { report: MatchReport }) {
  const t = useTranslations("matches");
  const format = useFormatter();
  const [active, setActive] = useState(0);

  const { myTeam } = report;
  const [scoreA, scoreB] = report.finalScore;
  const mine = myTeam === 0 ? scoreA : scoreB;
  const theirs = myTeam === 0 ? scoreB : scoreA;
  const won = mine > theirs;

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">{report.map}</h2>
            <p className="mt-1 font-mono text-xs text-muted-foreground">
              {report.type} · {report.mode} · {report.version} ·{" "}
              {format.dateTime(new Date(report.date), { dateStyle: "medium" })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-3 font-mono">
              <span className="text-3xl font-bold text-sky-400 tabular-nums">
                {mine}
              </span>
              <span className="text-muted-foreground">:</span>
              <span className="text-3xl font-bold text-rose-400 tabular-nums">
                {theirs}
              </span>
              <span
                className={cn(
                  "ml-1 rounded-full px-2 py-0.5 text-xs font-medium tracking-wide uppercase",
                  won
                    ? "bg-emerald-500/10 text-emerald-400"
                    : "bg-rose-500/10 text-rose-400",
                )}
              >
                {won ? t("victory") : t("defeat")}
              </span>
            </div>
            <div className="flex gap-1.5">
              {report.rounds.map((round) => {
                const w = round.winner === myTeam;
                return (
                  <span
                    key={round.n}
                    title={t(w ? "won" : "lost")}
                    className={cn(
                      "grid size-6 place-items-center rounded font-mono text-[11px] font-bold",
                      w
                        ? "bg-emerald-500/10 text-emerald-400"
                        : "bg-rose-500/10 text-rose-400",
                    )}
                  >
                    {w ? "W" : "L"}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
          {t("rounds")}
        </h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {report.rounds.map((round, index) => {
            const w = round.winner === myTeam;
            return (
              <button
                key={round.n}
                type="button"
                aria-pressed={index === active}
                onClick={() => setActive(index)}
                className={cn(
                  "flex flex-col gap-1 rounded-lg border p-2.5 text-left transition-colors",
                  index === active
                    ? "border-amber-500/60 bg-amber-500/5"
                    : "border-border hover:border-muted-foreground/40",
                )}
              >
                <span className="font-mono text-[11px] text-muted-foreground">
                  {t("roundN", { n: round.n })}
                </span>
                <span
                  className={cn(
                    "font-mono text-sm font-bold",
                    w ? "text-emerald-400" : "text-rose-400",
                  )}
                >
                  {t(w ? "won" : "lost")}
                </span>
                <span className="min-h-8 text-[11px] leading-tight text-muted-foreground/70">
                  {shortSite(round.site)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <RoundDetail
        round={report.rounds[active] ?? report.rounds[0]!}
        myTeam={myTeam}
      />
      <MatchStatsTable stats={report.stats} myTeam={myTeam} />
    </div>
  );
}
