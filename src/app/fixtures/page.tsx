import { requirePlayer } from "@/lib/auth";
import { prisma } from "@/lib/db";
import TeamCrest from "@/components/TeamCrest";

function formatKickoff(kickoff: Date | null): string {
  if (!kickoff) return "Kickoff TBC";
  return kickoff.toLocaleString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

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
      <h1 className="text-2xl font-semibold">Fixtures</h1>

      {gameweeks.length === 0 && <p className="text-zinc-500 text-sm">No gameweeks yet.</p>}

      {gameweeks.map((gw) => (
        <section key={gw.id}>
          <h2 className="text-lg font-semibold mb-1">Gameweek {gw.number}</h2>
          <p className="text-zinc-500 text-xs mb-3">
            Pick deadline: {gw.deadline.toLocaleString()}
          </p>
          {gw.fixtures.length === 0 ? (
            <p className="text-zinc-500 text-sm">No fixtures added yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-zinc-100 border-y border-zinc-100">
              {gw.fixtures.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <TeamCrest src={f.homeTeam.crestUrl} name={f.homeTeam.name} />
                    <span>{f.homeTeam.name}</span>
                    <span className="text-zinc-400">vs</span>
                    <span>{f.awayTeam.name}</span>
                    <TeamCrest src={f.awayTeam.crestUrl} name={f.awayTeam.name} />
                  </span>
                  <span className="text-zinc-600 whitespace-nowrap">
                    {f.played ? (
                      <span className="font-medium text-zinc-900">
                        {f.homeGoals}–{f.awayGoals}
                      </span>
                    ) : (
                      formatKickoff(f.kickoff)
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
