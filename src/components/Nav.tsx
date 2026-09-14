import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/login/actions";

export default async function Nav() {
  const session = await getSession();
  // A cookie can outlive the player it names (e.g. an admin removed the account) —
  // confirm the player still exists rather than trusting the cookie alone.
  const signedIn = session.playerId
    ? Boolean(await prisma.player.findUnique({ where: { id: session.playerId }, select: { id: true } }))
    : false;

  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">
          ⚽ PL Pick&apos;em
        </Link>
        {signedIn ? (
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/" className="hover:underline">
              This Week
            </Link>
            <Link href="/standings" className="hover:underline">
              Standings
            </Link>
            <Link href="/rules" className="hover:underline">
              Rules
            </Link>
            {session.isAdmin && (
              <Link href="/admin" className="hover:underline text-emerald-700">
                Admin
              </Link>
            )}
            <span className="text-zinc-400">|</span>
            <span className="text-zinc-600">{session.playerName}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-zinc-500 hover:text-zinc-900 hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        ) : (
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/rules" className="hover:underline">
              Rules
            </Link>
            <Link href="/login" className="hover:underline">
              Sign in
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
