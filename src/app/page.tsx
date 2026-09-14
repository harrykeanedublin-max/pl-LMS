import { ChipType } from "@prisma/client";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PickForm, { type ChipStatus } from "@/components/PickForm";
import { pointsForPick, resultForTeam } from "@/lib/scoring";

export default async function DashboardPage() {
  const player = await requirePlayer();
  const now = new Date();

  const [currentGameweek, allTeams, myPicks, myChipUsages] = await Promise.all([
    prisma.gameweek.findFirst({
      where: { isLocked: false, deadline: { gt: now } },
      orderBy: { number: "asc" },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.pick.findMany({
      where: { playerId: player.id },
      include: { team: true, gameweek: true },
      orderBy: { gameweek: { number: "asc" } },
    }),
    prisma.chipUsage.findMany({
      where: { playerId: player.id },
      include: { gameweek: true },
    }),
  ]);

  const usedTeamIdsElsewhere = new Set(
    myPicks.filter((p) => p.gameweekId !== currentGameweek?.id).map((p) => p.teamId)
  );
  const availableTeams = allTeams
    .filter((t) => !usedTeamIdsElsewhere.has(t.id))
    .map((t) => ({ id: t.id, name: t.name }));

  const picksThisWeek = currentGameweek
    ? myPicks.filter((p) => p.gameweekId === currentGameweek.id)
    : [];

  function chipStatus(chipType: ChipType): ChipStatus {
    const usage = myChipUsages.find((c) => c.chipType === chipType);
    if (!usage) return { activeThisWeek: false, usedInGameweekNumber: null };
    if (usage.gameweekId === currentGameweek?.id) {
      return { activeThisWeek: true, usedInGameweekNumber: null };
    }
    return { activeThisWeek: false, usedInGameweekNumber: usage.gameweek.number };
  }

  // Only fetch fixtures we actually need to show played-pick results.
  const myGameweekIds = [...new Set(myPicks.map((p) => p.gameweekId))];
  const fixtures = myGameweekIds.length
    ? await prisma.fixture.findMany({ where: { gameweekId: { in: myGameweekIds }, played: true } })
    : [];
  const fixtureByGwTeam = new Map(
    fixtures.flatMap((f) => [
      [`${f.gameweekId}:${f.homeTeamId}`, f],
      [`${f.gameweekId}:${f.awayTeamId}`, f],
    ] as const)
  );
  const chipsByGw = new Map<string, Set<ChipType>>();
  for (const usage of myChipUsages) {
    const key = usage.gameweekId;
    if (!chipsByGw.has(key)) chipsByGw.set(key, new Set());
    chipsByGw.get(key)!.add(usage.chipType);
  }

  return (
    <div className="flex flex-col gap-10">
      {!player.paid && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          You&apos;re marked as not yet paid for this pool. Sort your €20 entry with the organiser.
        </div>
      )}

      <section>
        <h1 className="text-2xl font-semibold mb-1">
          {currentGameweek ? `Gameweek ${currentGameweek.number}` : "No open gameweek"}
        </h1>
        {currentGameweek ? (
          <>
            <p className="text-zinc-600 mb-6">
              Deadline: {currentGameweek.deadline.toLocaleString()}
            </p>
            <PickForm
              gameweekId={currentGameweek.id}
              availableTeams={availableTeams}
              currentTeam1Id={picksThisWeek[0]?.teamId}
              currentTeam2Id={picksThisWeek[1]?.teamId}
              doubleUp={chipStatus(ChipType.DOUBLE_UP)}
              gamble={chipStatus(ChipType.GAMBLE)}
              cleanSheet={chipStatus(ChipType.CLEAN_SHEET)}
            />
          </>
        ) : (
          <p className="text-zinc-600">
            There&apos;s no gameweek currently open for picks. Check back once the organiser opens the
            next one.
          </p>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Your picks so far</h2>
        {myPicks.length === 0 ? (
          <p className="text-zinc-500 text-sm">No picks yet.</p>
        ) : (
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-zinc-500 border-b border-zinc-200">
                <th className="py-2 pr-4">GW</th>
                <th className="py-2 pr-4">Team</th>
                <th className="py-2 pr-4">Result</th>
                <th className="py-2 pr-4">Points</th>
              </tr>
            </thead>
            <tbody>
              {myPicks.map((pick) => {
                const fixture = fixtureByGwTeam.get(`${pick.gameweekId}:${pick.teamId}`);
                const result = fixture ? resultForTeam(fixture, pick.teamId) : null;
                const activeChips = chipsByGw.get(pick.gameweekId) ?? new Set<ChipType>();
                const points = pointsForPick(result, activeChips);
                return (
                  <tr key={pick.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4">{pick.gameweek.number}</td>
                    <td className="py-2 pr-4">{pick.team.name}</td>
                    <td className="py-2 pr-4">
                      {result ? result.outcome + ` (${result.goalsFor}-${result.goalsAgainst})` : "Pending"}
                    </td>
                    <td className="py-2 pr-4">{points === null ? "—" : points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
