# Match Replay decoder (`.rec` → report)

Phase-A proof of concept. Decodes Rainbow Six Siege match-replay (`.rec`) files
into a **post-match report** (rosters, operators, kill feed, per-player stats)
and renders it on the `/matches` page. Decoding runs **entirely in the browser**
via WebAssembly — replay bytes never leave the client.

## What it does and does not do

- ✅ Metadata, bomb site, rosters + operators, timestamped kill feed, K/D/A/HS.
- ❌ **No player positions / movement.** Replay files expose events, not
  coordinates, so a spatial (r6tv-style) replay is not possible from this data.
- One operator from a newer season than the decoder shows as **Unknown** — see
  maintenance below.

## Architecture

- `report.ts` — pure transforms: assemble decoded rounds → `MatchReport`
  (winners are derived from `startingScore` deltas; the per-round `won` flag is
  unreliable).
- `decode.ts` — loads Go's `wasm_exec.js` (vendored in `public/wasm/`) and the
  decoder binary (`dissect.wasm`, fetched from the public Supabase Storage
  `tools` bucket), then exposes `decodeRec(bytes)`.
- `use-match-decode.ts` / `components/matches/*` — hook + UI.

## Rebuilding `dissect.wasm` (per season)

The binary is built from [`r6-dissect`](https://github.com/redraskal/r6-dissect)
`main` with one patch: `dissect/operator_roles.go` `Operator.Role()` returns `""`
instead of `panic` for unknown operators, so a replay from a season newer than
the build still parses (the unknown operator just renders as "Unknown"). To
refresh (needs Go ≥ 1.23):

```sh
git clone https://github.com/redraskal/r6-dissect
# patch Role() to return "" instead of panic (see above)
GOOS=js GOARCH=wasm go build -o dissect.wasm ./wasm-wrapper   # syscall/js: dissectRound(Uint8Array)->JSON
cp "$(go env GOROOT)/misc/wasm/wasm_exec.js" public/wasm/      # must match the Go version used
```

Then upload `dissect.wasm` to the `tools` bucket at `dissect/dissect.wasm`
(`contentType: application/wasm`). Naming the unknown operator only needs its
ID added to the upstream tables — otherwise it stays "Unknown".
