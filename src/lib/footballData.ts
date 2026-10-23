const BASE_URL = "https://api.football-data.org/v4";

export interface FDTeam {
  id: number;
  name: string;
  shortName: string;
  tla: string;
}

export interface FDMatch {
  id: number;
  matchday: number;
  status: string;
  utcDate: string;
  homeTeam: FDTeam;
  awayTeam: FDTeam;
  score: { fullTime: { home: number | null; away: number | null } };
}

export interface FDStandingRow {
  position: number;
  team: FDTeam & { crest: string };
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

/** Fetches the current Premier League table. Cached for 10 minutes so page views don't eat the free-tier rate limit. */
export async function fetchPLStandings(): Promise<FDStandingRow[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not set.");

  const res = await fetch(`${BASE_URL}/competitions/PL/standings`, {
    headers: { "X-Auth-Token": apiKey },
    next: { revalidate: 600 },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data.org request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { standings: { type: string; table: FDStandingRow[] }[] };
  return data.standings.find((s) => s.type === "TOTAL")?.table ?? [];
}

/** Fetches every match in the current Premier League season, in one call. */
export async function fetchPLMatches(): Promise<FDMatch[]> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) throw new Error("FOOTBALL_DATA_API_KEY is not set.");

  const res = await fetch(`${BASE_URL}/competitions/PL/matches`, {
    headers: { "X-Auth-Token": apiKey },
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`football-data.org request failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as { matches: FDMatch[] };
  return data.matches;
}
