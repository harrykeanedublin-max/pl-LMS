import { ChipType } from "@prisma/client";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { pointsForPick, resultForTeam } from "@/lib/scoring";
import { formatIrishDateTime } from "@/lib/time";
import TeamCrest from "@/components/TeamCrest";

const CHIP_LABEL: Record<ChipType, string> = {
  [ChipType.DOUBLE_UP]: "2x Double up",
  [ChipType.GAMBLE]: "🎲 Gamble",
  [ChipType.CLEAN_SHEET]: "🧤 Clean sheet",
};

export default async function PicksPage() {
  await requirePlayer();
  const now = new Date();

  const [players, gameweeks] = await Promise.all([
    prisma.player.findMany({ orderBy: { name: "asc" } }),
    prisma.gameweek.findMany({
      where: { OR: [{ isLocked: true }, { deadline: { lte: now } }] },
      orderBy: { number: "asc" },
      include: {
        picks: { include: { team: true }, orderBy: [{ playerId: "asc" }, { createdAt: "asc" }] },
        chipUsages: true,
        fixtures: true,
      },
    }),
  ]);

  const upcomingCount = await prisma.gameweek.count({
    where: { isLocked: false, deadline: { gt: now } },
  });

  return (
    <div className="flex flex-col gap-10">
      <h1 className="text-2xl font-semibold">Picks</h1>

      {upcomingCount > 0 && (
        <p className="text-zinc-500 text-sm -mt-6">
          Picks for the current gameweek stay hidden until its deadline passes.
        </p>
      )}

      {gameweeks.length === 0 && (
        <p className="text-zinc-500 text-sm">No gameweeks revealed yet.</p>
      )}

      {gameweeks
        .slice()
        .reverse()
        .map((gw) => {
          const fixtureByTeam = new Map<string, (typeof gw.fixtures)[number]>();
          for (const f of gw.fixtures) {
            fixtureByTeam.set(f.homeTeamId, f);
            fixtureByTeam.set(f.awayTeamId, f);
          }
          const chipsByPlayer = new Map<string, ChipType>();
          for (const c of gw.chipUsages) chipsByPlayer.set(c.playerId, c.chipType);
          const picksByPlayer = new Map<string, typeof gw.picks>();
          for (const p of gw.picks) {
            if (!picksByPlayer.has(p.playerId)) picksByPlayer.set(p.playerId, []);
            picksByPlayer.get(p.playerId)!.push(p);
          }

          return (
            <section key={gw.id}>
              <h2 className="text-lg font-semibold mb-1">Gameweek {gw.number}</h2>
              <p className="text-zinc-500 text-xs mb-3">
                Deadline: {formatIrishDateTime(gw.deadline)}
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left text-zinc-500 border-b border-zinc-200">
                    <th className="py-2 pr-4">Player</th>
                    <th className="py-2 pr-4">Pick(s)</th>
                    <th className="py-2 pr-4">Chip</th>
                    <th className="py-2 pr-4">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player) => {
                    const picks = picksByPlayer.get(player.id) ?? [];
                    const chip = chipsByPlayer.get(player.id);
                    const activeChips = chip ? new Set([chip]) : new Set<ChipType>();

                    let total = 0;
                    let anyPending = picks.length === 0;
                    for (const pick of picks) {
                      const fixture = fixtureByTeam.get(pick.teamId);
                      const result = fixture ? resultForTeam(fixture, pick.teamId) : null;
                      const points = pointsForPick(result, activeChips);
                      if (points === null) anyPending = true;
                      else total += points;
                    }

                    return (
                      <tr key={player.id} className="border-b border-zinc-100 align-top">
                        <td className="py-2 pr-4 font-medium">{player.name}</td>
                        <td className="py-2 pr-4">
                          {picks.length === 0 ? (
                            <span className="text-zinc-400">No pick</span>
                          ) : (
                            <div className="flex flex-col gap-1">
                              {picks.map((pick) => (
                                <span key={pick.id} className="flex items-center gap-1.5">
                                  <TeamCrest src={pick.team.crestUrl} name={pick.team.name} size={18} />
                                  {pick.team.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-2 pr-4 text-zinc-600">{chip ? CHIP_LABEL[chip] : ""}</td>
                        <td className="py-2 pr-4">
                          {picks.length === 0 ? "—" : anyPending ? `${total} (pending)` : total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          );
        })}
    </div>
  );
}
