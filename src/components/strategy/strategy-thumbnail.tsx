"use client";

import { Map as MapIcon } from "lucide-react";
import { useState } from "react";

import type { StrategyRow } from "@/hooks/use-strategies";
import { strategyThumbnailUrl } from "@/services/strategy-thumbnails";

function ThumbnailImage({ url, alt }: { url: string; alt: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <MapIcon className="size-8 text-muted-foreground" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-full object-cover"
    />
  );
}

/** 16:9 board preview; falls back to a map icon until the first autosave. */
export function StrategyThumbnail({
  strategy,
  className = "",
}: {
  strategy: StrategyRow;
  className?: string;
}) {
  const url = strategyThumbnailUrl(strategy.id, strategy.updated_at);
  return (
    <div
      className={`flex aspect-video items-center justify-center overflow-hidden rounded-md border border-border bg-muted/30 ${className}`}
    >
      {/* Keyed so a refreshed URL retries after an earlier miss. */}
      <ThumbnailImage key={url} url={url} alt={strategy.title} />
    </div>
  );
}
