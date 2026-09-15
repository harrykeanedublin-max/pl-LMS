import { ChipType, type Fixture, type Pick, type Team } from "@prisma/client";

export const CHIP_LABEL: Record<ChipType, string> = {
  [ChipType.DOUBLE_UP]: "2x Double up",
  [ChipType.GAMBLE]: "🎲 Gamble",
  [ChipType.CLEAN_SHEET]: "🧤 Clean sheet",
};

export type MatchOutcome = "WIN" | "DRAW" | "LOSS";

export interface TeamFixtureResult {
  outcome: MatchOutcome;
  goalsFor: number;
  goalsAgainst: number;
}

/** Reads a played fixture from one team's point of view. Returns null if the fixture hasn't been played. */
export function resultForTeam(fixture: Fixture, teamId: string): TeamFixtureResult | null {
  if (!fixture.played || fixture.homeGoals === null || fixture.awayGoals === null) return null;

  const isHome = fixture.homeTeamId === teamId;
  const goalsFor = isHome ? fixture.homeGoals : fixture.awayGoals;
  const goalsAgainst = isHome ? fixture.awayGoals : fixture.homeGoals;

  const outcome: MatchOutcome = goalsFor > goalsAgainst ? "WIN" : goalsFor < goalsAgainst ? "LOSS" : "DRAW";

  return { outcome, goalsFor, goalsAgainst };
}

/**
 * Points for a single pick, given the chips the player had active for that pick's gameweek.
 * - Base: win 3, draw 1, loss 0.
 * - Gamble chip: replaces base scoring with win 6, draw 0, loss -3.
 * - Clean sheet chip: +2 if the picked team conceded no goals, on top of whichever scoring applied.
 * Returns null if the fixture hasn't been played yet (pick is still pending).
 * A pick the system auto-assigned for a missed deadline always scores 0, win or draw included.
 */
export function pointsForPick(
  result: TeamFixtureResult | null,
  activeChips: Set<ChipType>,
  isAutoAssigned = false
): number | null {
  if (!result) return null;
  if (isAutoAssigned) return 0;

  let points: number;
  if (activeChips.has(ChipType.GAMBLE)) {
    points = result.outcome === "WIN" ? 6 : result.outcome === "DRAW" ? 0 : -3;
  } else {
    points = result.outcome === "WIN" ? 3 : result.outcome === "DRAW" ? 1 : 0;
  }

  if (activeChips.has(ChipType.CLEAN_SHEET) && result.goalsAgainst === 0) {
    points += 2;
  }

  return points;
}

export interface StandingsRow {
  playerId: string;
  playerName: string;
  points: number;
  pendingPicks: number;
  playedPicks: number;
  chipsUsed: ChipType[];
}

/**
 * Computes the full leaderboard from raw rows. `picks` must include their `fixture`
 * (matched on gameweekId + teamId) and `activeChipsByPlayerAndGameweek` maps
 * `${playerId}:${gameweekId}` to the set of chips that player had active that week.
 */
export function computeStandings(params: {
  players: { id: string; name: string }[];
  picks: (Pick & { team: Team })[];
  fixturesByGameweekAndTeam: Map<string, Fixture>;
  activeChipsByPlayerAndGameweek: Map<string, Set<ChipType>>;
  chipsUsedByPlayer: Map<string, ChipType[]>;
}): StandingsRow[] {
  const {
    players,
    picks,
    fixturesByGameweekAndTeam,
    activeChipsByPlayerAndGameweek,
    chipsUsedByPlayer,
  } = params;

  const rows = new Map<string, StandingsRow>();
  for (const p of players) {
    rows.set(p.id, {
      playerId: p.id,
      playerName: p.name,
      points: 0,
      pendingPicks: 0,
      playedPicks: 0,
      chipsUsed: chipsUsedByPlayer.get(p.id) ?? [],
    });
  }

  for (const pick of picks) {
    const row = rows.get(pick.playerId);
    if (!row) continue;

    const fixture = fixturesByGameweekAndTeam.get(`${pick.gameweekId}:${pick.teamId}`);
    const result = fixture ? resultForTeam(fixture, pick.teamId) : null;
    const activeChips =
      activeChipsByPlayerAndGameweek.get(`${pick.playerId}:${pick.gameweekId}`) ?? new Set();

    const points = pointsForPick(result, activeChips, pick.autoAssigned);
    if (points === null) {
      row.pendingPicks += 1;
    } else {
      row.points += points;
      row.playedPicks += 1;
    }
  }

  return Array.from(rows.values()).sort((a, b) => b.points - a.points);
}
