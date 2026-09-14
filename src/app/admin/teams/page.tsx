import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AddTeamForm from "@/components/admin/AddTeamForm";
import DeleteTeamButton from "@/components/admin/DeleteTeamButton";

export default async function AdminTeamsPage() {
  await requireAdmin();
  const teams = await prisma.team.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold mb-1">Teams</h1>
        <p className="text-zinc-600 text-sm">
          Keep this list in sync with whichever 20 clubs are actually in the Premier League this
          season — edit it here if promotion/relegation means it&apos;s out of date.
        </p>
      </div>

      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-zinc-500 border-b border-zinc-200">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Code</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t) => (
            <tr key={t.id} className="border-b border-zinc-100">
              <td className="py-2 pr-4">{t.name}</td>
              <td className="py-2 pr-4">{t.shortName}</td>
              <td className="py-2 pr-4">
                <DeleteTeamButton teamId={t.id} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <AddTeamForm />
    </div>
  );
}
