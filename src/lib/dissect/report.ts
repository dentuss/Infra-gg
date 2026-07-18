// Assemble decoded rounds (r6-dissect output, one per .rec) into a match report.
// Replay files carry events + rosters + stats, but no player positions — so this
// is a post-match report, never a spatial replay.

export type OpRef = { name: string; id: number };

/** The subset of a decoded round we rely on. */
export type RoundRaw = {
  gameVersion: string;
  timestamp: string;
  matchType: { name: string };
  map: { name: string };
  gamemode: { name: string };
  site: string;
  roundNumber: number;
  recordingProfileID: string;
  teams: { name: string; startingScore: number; won: boolean; role: string }[];
  players: {
    username: string;
    teamIndex: number;
    profileID: string;
    operator: OpRef;
    spawn: string;
  }[];
  matchFeedback: {
    type: { name: string };
    username: string;
    target: string;
    headshot: boolean;
    time: string;
  }[];
  stats: {
    username: string;
    kills: number;
    died: number;
    assists: number;
    headshots: number;
  }[];
};

export type Kill = {
  t: string;
  killer: string;
  victim: string;
  killerTeam: number;
  victimTeam: number;
  hs: boolean;
};
export type LineupOp = { user: string; op: string };
export type RoundReport = {
  n: number;
  site: string;
  winner: number;
  kills: Kill[];
  lineup: [LineupOp[], LineupOp[]];
};
export type PlayerStat = {
  user: string;
  team: number;
  kills: number;
  deaths: number;
  assists: number;
  headshots: number;
  hsPct: number;
};
export type MatchReport = {
  map: string;
  version: string;
  type: string;
  mode: string;
  date: string;
  myTeam: number;
  finalScore: [number, number];
  rounds: RoundReport[];
  stats: PlayerStat[];
};

/** Unknown operators (a newer season than the decoder) stringify as "Operator(<id>)". */
const opName = (o: OpRef): string =>
  /^Operator\(/.test(o.name) ? "Unknown" : o.name;
/** "ChaletY10" -> "Chalet"; "ClubHouse" -> "Club House". */
const cleanMap = (n: string): string =>
  n
    .replace(/Y\d+.*$/, "")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .trim() || n;

export function buildMatchReport(rawRounds: RoundRaw[]): MatchReport {
  const rounds = [...rawRounds].sort((a, b) => a.roundNumber - b.roundNumber);
  const first = rounds[0]!;
  const me = first.players.find(
    (p) => p.profileID === first.recordingProfileID,
  );
  const myTeam = me ? me.teamIndex : 0;

  // The per-round `won` flag is unreliable; recover winners from score deltas.
  const starts = rounds.map(
    (r) => [r.teams[0]!.startingScore, r.teams[1]!.startingScore] as const,
  );
  const winners = rounds.map((r, i) => {
    if (i < rounds.length - 1) return starts[i + 1]![0] > starts[i]![0] ? 0 : 1;
    const w = r.teams.findIndex((t) => t.won);
    return w < 0 ? (starts[i]![0] >= starts[i]![1] ? 0 : 1) : w;
  });
  const finalScore: [number, number] = [
    winners.filter((w) => w === 0).length,
    winners.filter((w) => w === 1).length,
  ];

  const roundReports: RoundReport[] = rounds.map((r, i) => {
    const teamOf: Record<string, number> = {};
    r.players.forEach((p) => (teamOf[p.username] = p.teamIndex));
    const lineup: [LineupOp[], LineupOp[]] = [[], []];
    r.players.forEach((p) =>
      lineup[p.teamIndex]?.push({ user: p.username, op: opName(p.operator) }),
    );
    return {
      n: i + 1,
      site: r.site,
      winner: winners[i]!,
      kills: r.matchFeedback
        .filter((f) => f.type.name === "Kill")
        .map((f) => ({
          t: f.time,
          killer: f.username,
          victim: f.target,
          killerTeam: teamOf[f.username] ?? -1,
          victimTeam: teamOf[f.target] ?? -1,
          hs: !!f.headshot,
        })),
      lineup,
    };
  });

  const agg: Record<string, PlayerStat> = {};
  for (const r of rounds) {
    for (const s of r.stats) {
      const a = (agg[s.username] ??= {
        user: s.username,
        team: 0,
        kills: 0,
        deaths: 0,
        assists: 0,
        headshots: 0,
        hsPct: 0,
      });
      a.kills += s.kills;
      a.deaths += s.died;
      a.assists += s.assists;
      a.headshots += s.headshots;
    }
    for (const p of r.players)
      if (agg[p.username]) agg[p.username]!.team = p.teamIndex;
  }
  const stats = Object.values(agg)
    .map((s) => ({
      ...s,
      hsPct: s.kills ? Math.round((s.headshots / s.kills) * 100) : 0,
    }))
    .sort((a, b) => a.team - b.team || b.kills - a.kills);

  return {
    map: cleanMap(first.map.name),
    version: first.gameVersion,
    type: first.matchType.name,
    mode: first.gamemode.name,
    date: first.timestamp,
    myTeam,
    finalScore,
    rounds: roundReports,
    stats,
  };
}
