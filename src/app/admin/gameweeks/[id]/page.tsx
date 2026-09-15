import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddFixtureForm from "@/components/admin/AddFixtureForm";
import BulkAddFixturesForm from "@/components/admin/BulkAddFixturesForm";
import FixtureResultForm from "@/components/admin/FixtureResultForm";
import { formatIrishDateTime } from "@/lib/time";

export default async function ManageGameweekPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;

  const [gameweek, teams] = await Promise.all([
    prisma.gameweek.findUnique({
      where: { id },
      include: {
        fixtures: {
          include: { homeTeam: true, awayTeam: true },
          orderBy: { id: "asc" },
        },
      },
    }),
    prisma.team.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!gameweek) notFound();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-xl text-ink mb-1">Gameweek {gameweek.number}</h1>
        <p className="text-sub text-sm">
          Deadline: {formatIrishDateTime(gameweek.deadline)} · {gameweek.isLocked ? "Locked" : "Open"}
        </p>
      </div>

      <section>
        <h2 className="font-display text-sm text-ink mb-3">Fixtures &amp; results</h2>
        <div className="mb-4">
          {gameweek.fixtures.length === 0 && (
            <p className="text-sub text-sm mb-2">No fixtures added yet.</p>
          )}
          {gameweek.fixtures.map((f) => (
            <FixtureResultForm
              key={f.id}
              fixtureId={f.id}
              homeTeamName={f.homeTeam.name}
              homeTeamCrestUrl={f.homeTeam.crestUrl}
              awayTeamName={f.awayTeam.name}
              awayTeamCrestUrl={f.awayTeam.crestUrl}
              kickoff={f.kickoff ? f.kickoff.toISOString() : null}
              homeGoals={f.homeGoals}
              awayGoals={f.awayGoals}
              played={f.played}
            />
          ))}
        </div>
        <div className="flex flex-col gap-3">
          <AddFixtureForm gameweekId={gameweek.id} teams={teams} />
          <BulkAddFixturesForm gameweekId={gameweek.id} />
        </div>
      </section>
    </div>
  );
}
