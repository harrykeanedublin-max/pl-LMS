import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fetchPLStandings, type FDStandingRow } from "@/lib/footballData";
import TeamCrest from "@/components/TeamCrest";

export default async function TablePage() {
  await requirePlayer();

  let rows: FDStandingRow[] = [];
  let failed = false;
  try {
    rows = await fetchPLStandings();
  } catch {
    failed = true;
  }

  // Use our own crests and short codes where we can match the team, so it
  // looks like the rest of the app; fall back to football-data's otherwise.
  const teams = await prisma.team.findMany({ where: { externalId: { not: null } } });
  const teamByExternalId = new Map(teams.map((t) => [t.externalId as number, t]));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl text-ink mb-1">Premier League table</h1>
        <p className="text-sub text-sm">Live league standings. Updates every few minutes.</p>
      </div>

      {failed || rows.length === 0 ? (
        <p className="text-sub text-sm">Couldn&apos;t load the table right now. Try again in a minute.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-line text-left text-sub">
                  <th className="py-2 pr-2 font-medium w-8">#</th>
                  <th className="py-2 pr-3 font-medium">Team</th>
                  <th className="py-2 px-2 text-center font-medium">P</th>
                  <th className="py-2 px-2 text-center font-medium">W</th>
                  <th className="py-2 px-2 text-center font-medium">D</th>
                  <th className="py-2 px-2 text-center font-medium">L</th>
                  <th className="py-2 px-2 text-center font-medium">GD</th>
                  <th className="py-2 pl-2 text-center font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const ours = teamByExternalId.get(row.team.id);
                  const zone =
                    row.position <= 4
                      ? "border-l-4 border-l-forest"
                      : row.position >= rows.length - 2
                        ? "border-l-4 border-l-mustard"
                        : "border-l-4 border-l-transparent";
                  return (
                    <tr key={row.team.id} className={`border-b border-dashed border-line ${zone}`}>
                      <td className="py-2 pl-2 pr-2 text-sub">{row.position}</td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        <span className="flex items-center gap-2">
                          <TeamCrest src={ours?.crestUrl ?? row.team.crest} name={row.team.name} size={20} />
                          <span className="font-medium text-ink sm:hidden">{ours?.shortName ?? row.team.tla}</span>
                          <span className="hidden font-medium text-ink sm:inline">
                            {ours?.name ?? row.team.shortName}
                          </span>
                        </span>
                      </td>
                      <td className="py-2 px-2 text-center">{row.playedGames}</td>
                      <td className="py-2 px-2 text-center">{row.won}</td>
                      <td className="py-2 px-2 text-center">{row.draw}</td>
                      <td className="py-2 px-2 text-center">{row.lost}</td>
                      <td className="py-2 px-2 text-center">
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </td>
                      <td className="py-2 pl-2 text-center font-semibold text-ink">{row.points}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-sub">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-1 bg-forest" /> Top four
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-1 bg-mustard" /> Relegation zone
            </span>
          </p>
        </>
      )}
    </div>
  );
}
