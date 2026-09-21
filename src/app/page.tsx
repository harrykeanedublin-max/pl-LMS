import { ChipType, type Fixture, type Team } from "@prisma/client";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import PickForm, { type ChipStatus } from "@/components/PickForm";
import TeamCrest from "@/components/TeamCrest";
import { CHIP_LABEL, pointsForPick, resultForTeam } from "@/lib/scoring";
import { formatIrishDateTime, formatIrishKickoff } from "@/lib/time";

function FixtureList({ fixtures }: { fixtures: (Fixture & { homeTeam: Team; awayTeam: Team })[] }) {
  if (fixtures.length === 0) {
    return <p className="text-sub text-sm">No fixtures added yet.</p>;
  }
  return (
    <ul className="flex flex-col divide-y divide-dashed divide-line border-y border-dashed border-line">
      {fixtures.map((f) => (
        <li
          key={f.id}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-2 text-sm"
        >
          <span className="flex items-center gap-2 flex-wrap">
            <TeamCrest src={f.homeTeam.crestUrl} name={f.homeTeam.name} />
            <span>{f.homeTeam.name}</span>
            <span className="text-sub/60">vs</span>
            <span>{f.awayTeam.name}</span>
            <TeamCrest src={f.awayTeam.crestUrl} name={f.awayTeam.name} />
          </span>
          <span className="text-sub whitespace-nowrap">
            {f.played ? (
              <span className="font-medium text-ink">
                {f.homeGoals}–{f.awayGoals}
              </span>
            ) : (
              formatIrishKickoff(f.kickoff)
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const player = await requirePlayer();
  const now = new Date();

  const [currentGameweek, allTeams, myPicks, myChipUsages, previousGameweek] = await Promise.all([
    // "Coming up": whichever gameweek is currently open for picks - its
    // fixture schedule isn't sensitive (it's already public on /fixtures),
    // only picks are, so this doesn't need the reveal gating below.
    prisma.gameweek.findFirst({
      where: { isLocked: false, deadline: { gt: now } },
      orderBy: { number: "asc" },
      include: {
        fixtures: { include: { homeTeam: true, awayTeam: true }, orderBy: [{ kickoff: "asc" }, { id: "asc" }] },
      },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.pick.findMany({
      where: { playerId: player.id },
      include: { team: true, gameweek: true },
      orderBy: [{ gameweek: { number: "asc" } }, { createdAt: "asc" }],
    }),
    prisma.chipUsage.findMany({
      where: { playerId: player.id },
      include: { gameweek: true },
    }),
    // "Previous week": the most recently revealed gameweek (deadline passed,
    // or locked) - same rule /picks and /teams use for picks/chips - fully
    // resolved (or close to it) by now.
    prisma.gameweek.findFirst({
      where: { OR: [{ isLocked: true }, { deadline: { lte: now } }] },
      orderBy: { number: "desc" },
      include: {
        fixtures: { include: { homeTeam: true, awayTeam: true }, orderBy: [{ kickoff: "asc" }, { id: "asc" }] },
      },
    }),
  ]);

  const usedTeamIdsElsewhere = new Set(
    myPicks.filter((p) => p.gameweekId !== currentGameweek?.id).map((p) => p.teamId)
  );
  const availableTeams = allTeams
    .filter((t) => !usedTeamIdsElsewhere.has(t.id))
    .map((t) => ({ id: t.id, name: t.name, crestUrl: t.crestUrl }));

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
        <div className="rounded-md border border-mustard bg-mustard/10 px-4 py-3 text-sm text-forest-dark">
          You&apos;re marked as not yet paid for this pool. Sort your €20 entry with the organiser.
        </div>
      )}

      <section>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="font-display text-xl text-ink">
            {currentGameweek ? "Gameweek" : "No open gameweek"}
          </h1>
          {currentGameweek && (
            <span className="font-display text-xs text-forest border border-forest rounded-full px-2.5 py-1">
              GW {String(currentGameweek.number).padStart(2, "0")}
            </span>
          )}
        </div>
        {currentGameweek ? (
          <>
            <p className="text-sub mb-6">
              Deadline: {formatIrishDateTime(currentGameweek.deadline)}
            </p>
            <PickForm
              key={picksThisWeek.map((p) => p.teamId).join(",")}
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
          <p className="text-sub">
            There&apos;s no gameweek currently open for picks. Check back once the organiser opens the
            next one.
          </p>
        )}
      </section>

      {currentGameweek && (
        <section>
          <h2 className="font-display text-sm text-ink mb-3">
            Coming up: Gameweek {currentGameweek.number}
          </h2>
          <FixtureList fixtures={currentGameweek.fixtures} />
        </section>
      )}

      {previousGameweek && (
        <section>
          <h2 className="font-display text-sm text-ink mb-3">
            Previous week: Gameweek {previousGameweek.number} results
          </h2>
          <FixtureList fixtures={previousGameweek.fixtures} />
        </section>
      )}

      <section>
        <h2 className="font-display text-sm text-ink mb-3">Your picks so far</h2>
        {myPicks.length === 0 ? (
          <p className="text-sub text-sm">No picks yet.</p>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-sub border-b border-line">
                <th className="py-2 pr-4 font-medium">GW</th>
                <th className="py-2 pr-4 font-medium">Team</th>
                <th className="py-2 pr-4 font-medium">Chip</th>
                <th className="py-2 pr-4 font-medium">Result</th>
                <th className="py-2 pr-4 font-medium">Points</th>
              </tr>
            </thead>
            <tbody>
              {myPicks.map((pick) => {
                const fixture = fixtureByGwTeam.get(`${pick.gameweekId}:${pick.teamId}`);
                const result = fixture ? resultForTeam(fixture, pick.teamId) : null;
                const activeChips = chipsByGw.get(pick.gameweekId) ?? new Set<ChipType>();
                const points = pointsForPick(result, activeChips, pick.autoAssigned);
                const chip = [...activeChips][0];
                return (
                  <tr key={pick.id} className="border-b border-dashed border-line">
                    <td className="py-2 pr-4">{pick.gameweek.number}</td>
                    <td className="py-2 pr-4">
                      <span className="flex items-center gap-2">
                        <TeamCrest src={pick.team.crestUrl} name={pick.team.name} />
                        {pick.team.name}
                        {pick.autoAssigned && (
                          <span
                            className="inline-flex items-center rounded-full bg-mustard/15 text-mustard-dark text-[11px] font-medium px-2 py-0.5"
                            title="You missed the deadline, so this team was assigned automatically. It scores zero either way."
                          >
                            Missed deadline
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-mustard-dark">{chip ? CHIP_LABEL[chip] : ""}</td>
                    <td className="py-2 pr-4 text-sub">
                      {result ? result.outcome + ` (${result.goalsFor}-${result.goalsAgainst})` : "Pending"}
                    </td>
                    <td className="py-2 pr-4 font-semibold">{points === null ? "—" : points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        )}
      </section>
    </div>
  );
}
