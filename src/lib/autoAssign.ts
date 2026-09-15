import { prisma } from "@/lib/db";

export interface AutoAssignSummary {
  gameweeksChecked: number[];
  picksAssigned: number;
  playersWithNoTeamsLeft: string[];
}

/**
 * For every gameweek whose deadline has passed, gives every player who never
 * submitted a pick the alphabetically-first team they haven't used yet. The
 * pick is marked autoAssigned so scoring always counts it as zero (see
 * pointsForPick), but it still uses up that team for the rest of the season
 * like any other pick. Safe to run repeatedly - a player who already has a
 * pick for a gameweek (real or previously auto-assigned) is left alone.
 */
export async function autoAssignMissedPicks(): Promise<AutoAssignSummary> {
  const [gameweeks, players, teams, allPicks] = await Promise.all([
    prisma.gameweek.findMany({ where: { deadline: { lte: new Date() } } }),
    prisma.player.findMany(),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.pick.findMany(),
  ]);

  const summary: AutoAssignSummary = {
    gameweeksChecked: gameweeks.map((gw) => gw.number).sort((a, b) => a - b),
    picksAssigned: 0,
    playersWithNoTeamsLeft: [],
  };

  const usedTeamIdsByPlayer = new Map<string, Set<string>>();
  const pickedGameweeksByPlayer = new Map<string, Set<string>>();
  for (const pick of allPicks) {
    if (!usedTeamIdsByPlayer.has(pick.playerId)) usedTeamIdsByPlayer.set(pick.playerId, new Set());
    usedTeamIdsByPlayer.get(pick.playerId)!.add(pick.teamId);

    if (!pickedGameweeksByPlayer.has(pick.playerId)) pickedGameweeksByPlayer.set(pick.playerId, new Set());
    pickedGameweeksByPlayer.get(pick.playerId)!.add(pick.gameweekId);
  }

  for (const gameweek of gameweeks) {
    for (const player of players) {
      if (pickedGameweeksByPlayer.get(player.id)?.has(gameweek.id)) continue;

      const usedTeamIds = usedTeamIdsByPlayer.get(player.id) ?? new Set<string>();
      const team = teams.find((t) => !usedTeamIds.has(t.id));
      if (!team) {
        summary.playersWithNoTeamsLeft.push(player.name);
        continue;
      }

      await prisma.pick.create({
        data: { playerId: player.id, gameweekId: gameweek.id, teamId: team.id, autoAssigned: true },
      });
      usedTeamIds.add(team.id);
      usedTeamIdsByPlayer.set(player.id, usedTeamIds);
      if (!pickedGameweeksByPlayer.has(player.id)) pickedGameweeksByPlayer.set(player.id, new Set());
      pickedGameweeksByPlayer.get(player.id)!.add(gameweek.id);
      summary.picksAssigned += 1;
    }
  }

  return summary;
}
