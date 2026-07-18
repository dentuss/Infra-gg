"use client";

import { useCallback, useState } from "react";

import { decodeRec } from "@/lib/dissect/decode";
import {
  buildMatchReport,
  type MatchReport,
  type RoundRaw,
} from "@/lib/dissect/report";

export type DecodeProgress = { done: number; total: number };

/** Decode a set of dropped .rec files into a single match report, in-browser. */
export function useMatchDecode() {
  const [report, setReport] = useState<MatchReport | null>(null);
  const [isDecoding, setDecoding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<DecodeProgress | null>(null);

  const decode = useCallback(async (files: File[]) => {
    const recs = files
      .filter((f) => f.name.toLowerCase().endsWith(".rec"))
      .sort((a, b) => a.name.localeCompare(b.name));

    setDecoding(true);
    setError(null);
    setReport(null);
    setProgress({ done: 0, total: recs.length });
    try {
      if (recs.length === 0) {
        throw new Error(
          "No .rec files found — pick the round files from one match.",
        );
      }
      // Sequential: a single WASM instance serves each call in turn.
      const rounds: RoundRaw[] = [];
      for (const [index, file] of recs.entries()) {
        rounds.push(await decodeRec(new Uint8Array(await file.arrayBuffer())));
        setProgress({ done: index + 1, total: recs.length });
      }
      setReport(buildMatchReport(rounds));
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to decode the replay.",
      );
    } finally {
      setDecoding(false);
      setProgress(null);
    }
  }, []);

  return {
    decode,
    report,
    isDecoding,
    error,
    progress,
    reset: () => {
      setReport(null);
      setError(null);
    },
  };
}
