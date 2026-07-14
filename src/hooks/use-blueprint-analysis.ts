"use client";

import { useMemo } from "react";

import {
  analyzeBlueprint,
  type BlueprintAnalysis,
} from "@/lib/blueprint-analyze";
import { BOARD_HEIGHT, BOARD_WIDTH } from "@/lib/strategy";

// One full-image scan per floor (~150ms); cached for the session.
const analysisCache = new Map<string, BlueprintAnalysis>();

export function useBlueprintAnalysis(
  image: HTMLImageElement | null,
  url: string | null,
  enabled: boolean,
): BlueprintAnalysis | null {
  return useMemo(() => {
    if (!enabled || !image || !url) return null;
    const cached = analysisCache.get(url);
    if (cached) return cached;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = BOARD_WIDTH;
      canvas.height = BOARD_HEIGHT;
      const context = canvas.getContext("2d");
      if (!context) return null;
      context.drawImage(image, 0, 0, BOARD_WIDTH, BOARD_HEIGHT);
      const analysis = analyzeBlueprint(
        context.getImageData(0, 0, BOARD_WIDTH, BOARD_HEIGHT),
      );
      analysisCache.set(url, analysis);
      return analysis;
    } catch {
      // Tainted canvas (no CORS) — no highlights; click tools still work.
      return null;
    }
  }, [image, url, enabled]);
}
