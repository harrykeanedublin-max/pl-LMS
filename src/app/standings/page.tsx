import { ChipType } from "@prisma/client";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { computeStandings } from "@/lib/scoring";

const CHIP_ICON: Record<ChipType, string> = {
  [ChipType.DOUBLE_UP]: "2x",
  [ChipType.GAMBLE]: "🎲",
  [ChipType.CLEAN_SHEET]: "🧤",
};

export default async function StandingsPage() {
  await requirePlayer();

  const [players, picks, fixtures, chipUsages, config] = await Promise.all([
    prisma.player.findMany({ orderBy: { name: "asc" } }),
    prisma.pick.findMany({ include: { team: true } }),
    prisma.fixture.findMany({ where: { played: true } }),
    prisma.chipUsage.findMany(),
    prisma.poolConfig.findUnique({ where: { id: "singleton" } }),
  ]);

  const fixturesByGameweekAndTeam = new Map<string, (typeof fixtures)[number]>();
  for (const f of fixtures) {
    fixturesByGameweekAndTeam.set(`${f.gameweekId}:${f.homeTeamId}`, f);
    fixturesByGameweekAndTeam.set(`${f.gameweekId}:${f.awayTeamId}`, f);
  }

  const activeChipsByPlayerAndGameweek = new Map<string, Set<ChipType>>();
  const chipsUsedByPlayer = new Map<string, ChipType[]>();
  for (const usage of chipUsages) {
    const key = `${usage.playerId}:${usage.gameweekId}`;
    if (!activeChipsByPlayerAndGameweek.has(key)) activeChipsByPlayerAndGameweek.set(key, new Set());
    activeChipsByPlayerAndGameweek.get(key)!.add(usage.chipType);

    if (!chipsUsedByPlayer.has(usage.playerId)) chipsUsedByPlayer.set(usage.playerId, []);
    chipsUsedByPlayer.get(usage.playerId)!.push(usage.chipType);
  }

  const standings = computeStandings({
    players,
    picks,
    fixturesByGameweekAndTeam,
    activeChipsByPlayerAndGameweek,
    chipsUsedByPlayer,
  });

  const paidPlayers = players.filter((p) => p.paid).length;
  const pot = paidPlayers * (config?.entryFeeEuro ?? 20);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Standings</h1>
        <p className="text-zinc-600 text-sm">
          Pot so far: €{pot} ({paidPlayers} paid entries × €{config?.entryFeeEuro ?? 20})
        </p>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-zinc-200">
            <th className="py-2 pr-4">#</th>
            <th className="py-2 pr-4">Player</th>
            <th className="py-2 pr-4">Points</th>
            <th className="py-2 pr-4">Pending</th>
            <th className="py-2 pr-4">Chips used</th>
          </tr>
        </thead>
        <tbody>
          {standings.map((row, i) => (
            <tr key={row.playerId} className="border-b border-zinc-100">
              <td className="py-2 pr-4 text-zinc-500">{i + 1}</td>
              <td className="py-2 pr-4 font-medium">{row.playerName}</td>
              <td className="py-2 pr-4">{row.points}</td>
              <td className="py-2 pr-4 text-zinc-500">{row.pendingPicks || ""}</td>
              <td className="py-2 pr-4">
                {row.chipsUsed.map((c) => (
                  <span key={c} title={c} className="mr-1">
                    {CHIP_ICON[c]}
                  </span>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
