"use client";

import { UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRef } from "react";

import { MatchReportView } from "@/components/matches/match-report-view";
import { Button } from "@/components/ui/button";
import { useMatchDecode } from "@/hooks/use-match-decode";

export function MatchUploader() {
  const t = useTranslations("matches");
  const { decode, report, isDecoding, error, progress, reset } =
    useMatchDecode();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFiles = (list: FileList | null) => {
    if (list && list.length > 0) void decode(Array.from(list));
  };

  if (report) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={reset}>
            {t("loadAnother")}
          </Button>
        </div>
        <MatchReportView report={report} />
        <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.04] px-4 py-3 text-sm text-amber-200/80">
          {t("noPositions")}
        </p>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border border-dashed border-border bg-card/40 px-6 py-14 text-center"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFiles(event.dataTransfer.files);
      }}
    >
      <UploadCloud className="size-8 text-muted-foreground" />
      <div>
        <p className="font-medium">{t("dropTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("dropHint")}</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".rec"
        multiple
        className="hidden"
        onChange={(event) => onFiles(event.target.files)}
      />
      <Button onClick={() => inputRef.current?.click()} disabled={isDecoding}>
        {isDecoding
          ? progress
            ? t("decodingN", { done: progress.done, total: progress.total })
            : t("decoding")
          : t("choose")}
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground/70">{t("privacy")}</p>
    </div>
  );
}
