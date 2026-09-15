import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { setPlayerPaidAction, setPlayerAdminAction } from "../actions";
import ResetPasscodeForm from "@/components/admin/ResetPasscodeForm";

export default async function AdminPlayersPage() {
  const me = await requireAdmin();
  const players = await prisma.player.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-xl text-ink">Players</h1>
      <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left text-sub border-b border-line">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Paid</th>
            <th className="py-2 pr-4">Admin</th>
            <th className="py-2 pr-4"></th>
          </tr>
        </thead>
        <tbody>
          {players.map((p) => {
            const togglePaid = setPlayerPaidAction.bind(null, p.id, !p.paid);
            const toggleAdmin = setPlayerAdminAction.bind(null, p.id, !p.isAdmin);
            return (
              <tr key={p.id} className="border-b border-dashed border-line">
                <td className="py-2 pr-4">{p.name}</td>
                <td className="py-2 pr-4">
                  <form action={togglePaid}>
                    <button
                      type="submit"
                      className={p.paid ? "text-forest hover:underline" : "text-sub hover:underline"}
                    >
                      {p.paid ? "Paid ✓" : "Mark paid"}
                    </button>
                  </form>
                </td>
                <td className="py-2 pr-4">
                  <form action={toggleAdmin}>
                    <button
                      type="submit"
                      disabled={p.id === me.id}
                      className="text-sub hover:underline disabled:opacity-40"
                    >
                      {p.isAdmin ? "Admin ✓" : "Make admin"}
                    </button>
                  </form>
                </td>
                <td className="py-2 pr-4">
                  <ResetPasscodeForm playerId={p.id} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
