"use client";

import { useCallback, useState } from "react";

import {
  useCreateStrategy,
  useSaveStrategy,
  type StrategySide,
} from "@/hooks/use-strategies";
import { parsePptx } from "@/lib/pptx/parse";
import { lineupFromSlides, slidesToPages } from "@/lib/pptx/scene";
import type { ParsedDeck, ParsedSlide } from "@/lib/pptx/types";
import { emptyLineup, SCENE_VERSION } from "@/lib/strategy";
import { uploadDeckMedia } from "@/services/pptx-import";
import type { Json } from "@/types/database";

export type StratPlan = {
  name: string;
  map: string;
  side: StrategySide;
  firstFloor: string;
  slides: ParsedSlide[];
};

/** Only the media referenced by the given slides, keyed by zip path. */
function mediaForSlides(
  deck: ParsedDeck,
  slides: ParsedSlide[],
): Record<string, Uint8Array> {
  const paths = new Set(slides.flatMap((slide) => slide.mediaPaths));
  const media: Record<string, Uint8Array> = {};
  for (const path of paths) {
    if (deck.media[path]) media[path] = deck.media[path];
  }
  return media;
}

export function usePptxImport() {
  const [deck, setDeck] = useState<ParsedDeck | null>(null);
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const createStrategy = useCreateStrategy();
  const saveStrategy = useSaveStrategy();

  const parseFile = useCallback(
    async (file: File): Promise<ParsedDeck | null> => {
      setParsing(true);
      setError(null);
      setDeck(null);
      try {
        const parsed = parsePptx(await file.arrayBuffer());
        setDeck(parsed);
        return parsed;
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not read the deck.",
        );
        return null;
      } finally {
        setParsing(false);
      }
    },
    [],
  );

  const runImport = useCallback(
    async (source: ParsedDeck, plans: StratPlan[]): Promise<string | null> => {
      setError(null);
      const perPlanMedia = plans.map((plan) =>
        mediaForSlides(source, plan.slides),
      );
      const total = perPlanMedia.reduce((n, m) => n + Object.keys(m).length, 0);
      let uploaded = 0;
      setProgress({ done: 0, total });
      let firstId: string | null = null;

      try {
        for (const [index, plan] of plans.entries()) {
          const media = perPlanMedia[index]!;
          // Create first so the storage RLS can tie uploads to this strategy.
          const created = await createStrategy.mutateAsync({
            title: plan.name,
            map: plan.map,
            side: plan.side,
            scene: { pages: [], lineup: emptyLineup() },
          });
          firstId ??= created.id;

          const srcMap = await uploadDeckMedia(media, created.id, (done) =>
            setProgress({ done: uploaded + done, total }),
          );
          uploaded += Object.keys(media).length;

          const pages = slidesToPages(
            plan.slides,
            plan.firstFloor,
            (path) => srcMap[path] ?? "",
          );
          await saveStrategy.mutateAsync({
            id: created.id,
            patch: {
              data: {
                pages,
                lineup: lineupFromSlides(plan.slides, plan.side),
                version: SCENE_VERSION,
              } as unknown as Json,
            },
          });
        }
        return firstId;
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Import failed.");
        return firstId;
      } finally {
        setProgress(null);
      }
    },
    [createStrategy, saveStrategy],
  );

  const reset = useCallback(() => {
    setDeck(null);
    setError(null);
    setProgress(null);
  }, []);

  return {
    deck,
    parsing,
    error,
    progress,
    importing: progress !== null,
    parseFile,
    runImport,
    reset,
  };
}
