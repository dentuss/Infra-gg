"use client";

import { useMemo } from "react";

import {
  analyzeBlueprint,
  type BlueprintAnalysis,
} from "@/lib/blueprint-analyze";
import { getBlueprintImageData } from "@/lib/blueprint-image";

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
    const data = getBlueprintImageData(image, url);
    if (!data) return null;
    const analysis = analyzeBlueprint(data);
    analysisCache.set(url, analysis);
    return analysis;
  }, [image, url, enabled]);
}
