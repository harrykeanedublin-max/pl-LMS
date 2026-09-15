import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddTeamForm from "@/components/admin/AddTeamForm";
import DeleteTeamButton from "@/components/admin/DeleteTeamButton";
import RefreshCrestButton from "@/components/admin/RefreshCrestButton";
import TeamCrest from "@/components/TeamCrest";

export default async function AdminTeamsPage() {
  await requireAdmin();
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl text-ink mb-1">Teams</h1>
        <p className="text-sub text-sm">
          Keep this list in sync with whichever 20 clubs are actually in the Premier League this
          season — edit it here if promotion/relegation means it&apos;s out of date. Crests are
          looked up automatically from Wikipedia when a team is added.
        </p>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-sub border-b border-line">
            <th className="py-2 pr-4"></th>
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id} className="border-b border-dashed border-line">
              <td className="py-2 pr-4">
                <TeamCrest src={t.crestUrl} name={t.name} size={24} />
              </td>
              <td className="py-2 pr-4">{t.name}</td>
              <td className="py-2 pr-4">{t.shortName}</td>
              <td className="py-2 pr-4 flex items-center gap-3">
                <RefreshCrestButton teamId={t.id} />
                <DeleteTeamButton teamId={t.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      <AddTeamForm />
    </div>
  );
}
