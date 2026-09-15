import { prisma } from "@/lib/db";
import { fetchPLMatches, type FDMatch } from "@/lib/footballData";
import type { Team } from "@prisma/client";

/** Strips common club suffixes so e.g. "Manchester United FC" lines up with our "Manchester United". */
function normalize(name: string): string {
  return name
    .toLowerCase()
    .replace(/\bafc\b/g, "")
    .replace(/\bfc\b/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/** Resolves a football-data.org team to one of our Teams: by externalId first, else by name/alias match. */
function resolveTeam(
  fdTeam: FDMatch["homeTeam"],
  teamsByExternalId: Map<number, Team>,
  teamsByNormalizedName: Map<string, Team>
): Team | null {
  const byId = teamsByExternalId.get(fdTeam.id);
  if (byId) return byId;

  const candidates = [fdTeam.name, fdTeam.shortName, fdTeam.tla];
  for (const candidate of candidates) {
    const match = teamsByNormalizedName.get(normalize(candidate));
    if (match) return match;
  }
  return null;
}

/** Picks stay open until 2 hours before the first match of a gameweek kicks off. */
const DEADLINE_BUFFER_MS = 2 * 60 * 60 * 1000;

export interface SyncSummary {
  matchdaysChecked: number[];
  gameweeksCreated: number;
  deadlinesAdjusted: number;
  fixturesCreated: number;
  fixturesUpdated: number;
  resultsUpdated: number;
  teamsLinked: number;
  unmatchedTeams: string[];
}

/**
 * Syncs fixtures/kickoffs/results from football-data.org into every Gameweek
 * whose number has matches for it (matched by number == football-data
 * matchday), creating gameweeks 1..PoolConfig.numGameweeks that don't exist
 * yet with their deadline set 2 hours before that gameweek's first kickoff.
 * Only ever touches the deadline of gameweeks it created itself
 * (Gameweek.autoManaged) - one the admin created or hand-edited is synced for
 * fixtures/results but its deadline is left alone. Backfills Team.externalId
 * the first time a team is matched by name so future syncs are id-based.
 */
export async function syncFromFootballData(): Promise<SyncSummary> {
  const [gameweeks, teams, allMatches, poolConfig] = await Promise.all([
    prisma.gameweek.findMany(),
    prisma.team.findMany(),
    fetchPLMatches(),
    prisma.poolConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const gameweekByNumber = new Map(gameweeks.map((gw) => [gw.number, gw]));
  const teamsByExternalId = new Map(
    teams.filter((t) => t.externalId !== null).map((t) => [t.externalId as number, t])
  );
  const teamsByNormalizedName = new Map(teams.map((t) => [normalize(t.name), t]));
  for (const t of teams) {
    teamsByNormalizedName.set(normalize(t.shortName), t);
    for (const alias of t.aliases) teamsByNormalizedName.set(normalize(alias), t);
  }

  const summary: SyncSummary = {
    matchdaysChecked: [],
    gameweeksCreated: 0,
    deadlinesAdjusted: 0,
    fixturesCreated: 0,
    fixturesUpdated: 0,
    resultsUpdated: 0,
    teamsLinked: 0,
    unmatchedTeams: [],
  };

  const matchesByMatchday = new Map<number, FDMatch[]>();
  for (const match of allMatches) {
    const list = matchesByMatchday.get(match.matchday);
    if (list) list.push(match);
    else matchesByMatchday.set(match.matchday, [match]);
  }

  const firstKickoff = (matches: FDMatch[]) =>
    new Date(Math.min(...matches.map((m) => new Date(m.utcDate).getTime())));

  const numGameweeks = poolConfig?.numGameweeks ?? 0;
  for (let number = 1; number <= numGameweeks; number += 1) {
    if (gameweekByNumber.has(number)) continue;
    const matches = matchesByMatchday.get(number);
    if (!matches || matches.length === 0) continue;

    const deadline = new Date(firstKickoff(matches).getTime() - DEADLINE_BUFFER_MS);
    // Never auto-create a gameweek whose deadline has already passed (e.g.
    // matchdays played before this pool/this feature started) - it'd be dead
    // on arrival, nobody could ever pick for it.
    if (deadline.getTime() <= Date.now()) continue;
    const created = await prisma.gameweek.create({ data: { number, deadline, autoManaged: true } });
    gameweekByNumber.set(number, created);
    summary.gameweeksCreated += 1;
  }

  for (const [matchday, gameweek] of gameweekByNumber) {
    const matches = matchesByMatchday.get(matchday);
    if (!matches || matches.length === 0) continue;
    summary.matchdaysChecked.push(matchday);

    if (gameweek.autoManaged && !gameweek.isLocked && gameweek.deadline.getTime() > Date.now()) {
      const deadline = new Date(firstKickoff(matches).getTime() - DEADLINE_BUFFER_MS);
      if (deadline.getTime() !== gameweek.deadline.getTime()) {
        await prisma.gameweek.update({ where: { id: gameweek.id }, data: { deadline } });
        gameweek.deadline = deadline;
        summary.deadlinesAdjusted += 1;
      }
    }

    const existingFixtures = await prisma.fixture.findMany({ where: { gameweekId: gameweek.id } });
    const existingByTeamPair = new Map(existingFixtures.map((f) => [`${f.homeTeamId}:${f.awayTeamId}`, f]));

    for (const match of matches) {
      const home = resolveTeam(match.homeTeam, teamsByExternalId, teamsByNormalizedName);
      const away = resolveTeam(match.awayTeam, teamsByExternalId, teamsByNormalizedName);

      if (!home) summary.unmatchedTeams.push(match.homeTeam.name);
      if (!away) summary.unmatchedTeams.push(match.awayTeam.name);
      if (!home || !away) continue;

      if (home.externalId !== match.homeTeam.id) {
        await prisma.team.update({ where: { id: home.id }, data: { externalId: match.homeTeam.id } });
        home.externalId = match.homeTeam.id;
        teamsByExternalId.set(match.homeTeam.id, home);
        summary.teamsLinked += 1;
      }
      if (away.externalId !== match.awayTeam.id) {
        await prisma.team.update({ where: { id: away.id }, data: { externalId: match.awayTeam.id } });
        away.externalId = match.awayTeam.id;
        teamsByExternalId.set(match.awayTeam.id, away);
        summary.teamsLinked += 1;
      }

      const kickoff = new Date(match.utcDate);
      const played = match.status === "FINISHED";
      const homeGoals = played ? match.score.fullTime.home : null;
      const awayGoals = played ? match.score.fullTime.away : null;

      const key = `${home.id}:${away.id}`;
      const existing = existingByTeamPair.get(key);
      if (existing) {
        const needsUpdate =
          existing.kickoff?.getTime() !== kickoff.getTime() ||
          existing.played !== played ||
          existing.homeGoals !== homeGoals ||
          existing.awayGoals !== awayGoals;
        if (needsUpdate) {
          await prisma.fixture.update({
            where: { id: existing.id },
            data: { kickoff, played, homeGoals, awayGoals },
          });
          if (played && !existing.played) summary.resultsUpdated += 1;
          else summary.fixturesUpdated += 1;
        }
      } else {
        const created = await prisma.fixture.create({
          data: { gameweekId: gameweek.id, homeTeamId: home.id, awayTeamId: away.id, kickoff, played, homeGoals, awayGoals },
        });
        existingByTeamPair.set(key, created);
        summary.fixturesCreated += 1;
      }
    }
  }

  summary.unmatchedTeams = [...new Set(summary.unmatchedTeams)];
  return summary;
}
