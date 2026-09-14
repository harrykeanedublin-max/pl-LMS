import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toggleGameweekLockAction } from "./actions";
import CreateGameweekForm from "@/components/admin/CreateGameweekForm";
import { formatIrishDateTime } from "@/lib/time";

export default async function AdminPage() {
  await requireAdmin();

  const gameweeks = await prisma.gameweek.findMany({
    orderBy: { number: "asc" },
    include: { _count: { select: { fixtures: true, picks: true } } },
  });

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <nav className="flex gap-4 text-sm">
          <Link href="/admin/players" className="text-emerald-700 hover:underline">
            Players
          </Link>
          <Link href="/admin/teams" className="text-emerald-700 hover:underline">
            Teams
          </Link>
          <Link href="/admin/config" className="text-emerald-700 hover:underline">
            Pool settings
          </Link>
        </nav>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Gameweeks</h2>
        <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="text-left text-zinc-500 border-b border-zinc-200">
              <th className="py-2 pr-4">GW</th>
              <th className="py-2 pr-4">Deadline</th>
              <th className="py-2 pr-4">Fixtures</th>
              <th className="py-2 pr-4">Picks in</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {gameweeks.map((gw) => {
              const toggleLock = toggleGameweekLockAction.bind(null, gw.id);
              return (
                <tr key={gw.id} className="border-b border-zinc-100">
                  <td className="py-2 pr-4">{gw.number}</td>
                  <td className="py-2 pr-4">{formatIrishDateTime(gw.deadline)}</td>
                  <td className="py-2 pr-4">{gw._count.fixtures}</td>
                  <td className="py-2 pr-4">{gw._count.picks}</td>
                  <td className="py-2 pr-4">{gw.isLocked ? "Locked" : "Open"}</td>
                  <td className="py-2 pr-4 flex gap-3">
                    <Link href={`/admin/gameweeks/${gw.id}`} className="text-emerald-700 hover:underline">
                      Manage
                    </Link>
                    <form action={toggleLock}>
                      <button type="submit" className="text-zinc-500 hover:underline">
                        {gw.isLocked ? "Unlock" : "Lock"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {gameweeks.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-zinc-500">
                  No gameweeks yet — create the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
        <CreateGameweekForm />
      </section>
    </div>
  );
}
