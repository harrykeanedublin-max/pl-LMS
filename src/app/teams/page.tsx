import { ChipType } from "@prisma/client";
import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { CHIP_LABEL } from "@/lib/scoring";
import TeamCrest from "@/components/TeamCrest";

const CHIP_ORDER = [ChipType.DOUBLE_UP, ChipType.GAMBLE, ChipType.CLEAN_SHEET];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[1][0]).toUpperCase();
}

export default async function TeamsPage() {
  await requirePlayer();
  const now = new Date();

  // Only revealed once their gameweek's deadline has passed (or it's locked) -
  // same rule as /picks, so nobody can infer a team, or that a chip's been
  // played, for the still-open gameweek before its deadline.
  const revealed = { gameweek: { OR: [{ isLocked: true }, { deadline: { lte: now } }] } };

  const [teams, players, picks, chipUsages] = await Promise.all([
    prisma.team.findMany({ orderBy: { name: "asc" } }),
    prisma.player.findMany({ orderBy: { name: "asc" } }),
    prisma.pick.findMany({ where: revealed, select: { playerId: true, teamId: true } }),
    prisma.chipUsage.findMany({ where: revealed, select: { playerId: true, chipType: true } }),
  ]);

  const usedByPlayer = new Map<string, Set<string>>();
  for (const pick of picks) {
    if (!usedByPlayer.has(pick.playerId)) usedByPlayer.set(pick.playerId, new Set());
    usedByPlayer.get(pick.playerId)!.add(pick.teamId);
  }

  const usedChipsByPlayer = new Map<string, Set<ChipType>>();
  for (const usage of chipUsages) {
    if (!usedChipsByPlayer.has(usage.playerId)) usedChipsByPlayer.set(usage.playerId, new Set());
    usedChipsByPlayer.get(usage.playerId)!.add(usage.chipType);
  }

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h1 className="font-display text-xl text-ink mb-1">Teams</h1>
        <p className="text-sub text-sm">
          Which teams each player has already used. The current gameweek&apos;s picks stay hidden until
          its deadline passes.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="sticky left-0 bg-paper py-2 pr-4"></th>
              {players.map((p) => (
                <th key={p.id} className="py-2 px-1.5 text-center font-normal" title={p.name}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-forest text-cream text-[10px] font-semibold">
                    {initials(p.name)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team.id} className="border-b border-dashed border-line">
                <td className="sticky left-0 bg-paper py-1.5 pr-4 whitespace-nowrap">
                  <span className="flex items-center gap-1.5">
                    <TeamCrest src={team.crestUrl} name={team.name} size={18} />
                    <span className="font-medium text-ink">{team.shortName}</span>
                  </span>
                </td>
                {players.map((p) => {
                  const used = usedByPlayer.get(p.id)?.has(team.id) ?? false;
                  return (
                    <td key={p.id} className="py-1.5 px-1.5 text-center">
                      {used ? <span className="text-mustard-dark font-semibold">✓</span> : <span className="text-sub/40">–</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <h2 className="font-display text-sm text-ink mb-3">Chips used</h2>
        <div className="overflow-x-auto">
          <table className="border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="sticky left-0 bg-paper py-2 pr-4"></th>
                {players.map((p) => (
                  <th key={p.id} className="py-2 px-1.5 text-center font-normal" title={p.name}>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-forest text-cream text-[10px] font-semibold">
                      {initials(p.name)}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CHIP_ORDER.map((chip) => (
                <tr key={chip} className="border-b border-dashed border-line">
                  <td className="sticky left-0 bg-paper py-1.5 pr-4 whitespace-nowrap font-medium text-ink">
                    {CHIP_LABEL[chip]}
                  </td>
                  {players.map((p) => {
                    const used = usedChipsByPlayer.get(p.id)?.has(chip) ?? false;
                    return (
                      <td key={p.id} className="py-1.5 px-1.5 text-center">
                        {used ? <span className="text-mustard-dark font-semibold">✓</span> : <span className="text-sub/40">–</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
