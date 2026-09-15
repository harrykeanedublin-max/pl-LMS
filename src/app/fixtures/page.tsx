import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TeamCrest from "@/components/TeamCrest";
import { formatIrishDateTime, formatIrishKickoff } from "@/lib/time";

export default async function FixturesPage() {
  await requirePlayer();

  const gameweeks = await prisma.gameweek.findMany({
    orderBy: { number: "asc" },
    include: {
      fixtures: {
        include: { homeTeam: true, awayTeam: true },
        orderBy: [{ kickoff: "asc" }, { id: "asc" }],
      },
    },
  });

  return (
    <div className="flex flex-col gap-10">
      <h1 className="font-display text-xl text-ink">Fixtures</h1>

      {gameweeks.length === 0 && <p className="text-sub text-sm">No gameweeks yet.</p>}

      {gameweeks.map((gw) => (
        <section key={gw.id}>
          <h2 className="font-display text-sm text-ink mb-1">Gameweek {gw.number}</h2>
          <p className="text-sub text-xs mb-3">
            Pick deadline: {formatIrishDateTime(gw.deadline)}
          </p>
          {gw.fixtures.length === 0 ? (
            <p className="text-sub text-sm">No fixtures added yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-dashed divide-line border-y border-dashed border-line">
              {gw.fixtures.map((f) => (
                <li key={f.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-3 py-2 text-sm">
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
          )}
        </section>
      ))}
    </div>
  );
}
