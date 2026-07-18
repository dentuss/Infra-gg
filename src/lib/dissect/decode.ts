// Loads the r6-dissect WebAssembly decoder and runs it entirely in the browser.
// The Go runtime glue (wasm_exec.js) is vendored in /public/wasm; the decoder
// binary lives in Supabase Storage and is fetched once, then cached by the
// browser. Replay bytes never leave the client.

import type { RoundRaw } from "@/lib/dissect/report";
import { createClient } from "@/lib/supabase/client";

declare global {
  interface Window {
    Go?: new () => {
      importObject: WebAssembly.Imports;
      run: (instance: WebAssembly.Instance) => void;
    };
    dissectRound?: (bytes: Uint8Array) => string;
  }
}

const WASM_OBJECT = "dissect/dissect.wasm";
let ready: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-src="${src}"]`)) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.dataset.src = src;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(el);
  });
}

async function init(): Promise<void> {
  await loadScript("/wasm/wasm_exec.js");
  if (!window.Go) throw new Error("WASM runtime did not load");

  const { publicUrl } = createClient()
    .storage.from("tools")
    .getPublicUrl(WASM_OBJECT).data;
  const res = await fetch(publicUrl);
  if (!res.ok)
    throw new Error(`Could not fetch the decoder (HTTP ${res.status})`);

  const go = new window.Go();
  const { instance } = await WebAssembly.instantiate(
    await res.arrayBuffer(),
    go.importObject,
  );
  go.run(instance); // registers window.dissectRound, then parks on select{}

  // main() sets the export synchronously, but guard against any scheduling gap.
  for (let i = 0; i < 100 && !window.dissectRound; i++) {
    await new Promise((r) => setTimeout(r, 10));
  }
  if (!window.dissectRound) throw new Error("Decoder failed to initialize");
}

export function ensureDecoder(): Promise<void> {
  if (!ready) ready = init();
  return ready;
}

/** Decode one .rec (a single round) into structured data. */
export async function decodeRec(bytes: Uint8Array): Promise<RoundRaw> {
  await ensureDecoder();
  const parsed = JSON.parse(window.dissectRound!(bytes)) as
    RoundRaw | { error: string };
  if ("error" in parsed) throw new Error(parsed.error);
  return parsed;
}
