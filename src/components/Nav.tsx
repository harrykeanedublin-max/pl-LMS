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
    <header
      className="border-b-4 border-emerald-950 bg-emerald-900 text-emerald-50"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 40px, transparent 40px, transparent 80px)",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-white">
          ⚽ PL Pick&apos;em
        </Link>
        {signedIn ? (
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/" className="hover:text-white hover:underline">
              This Week
            </Link>
            <Link href="/fixtures" className="hover:text-white hover:underline">
              Fixtures
            </Link>
            <Link href="/standings" className="hover:text-white hover:underline">
              Standings
            </Link>
            <Link href="/rules" className="hover:text-white hover:underline">
              Rules
            </Link>
            {session.isAdmin && (
              <Link href="/admin" className="hover:underline text-amber-300 font-medium">
                Admin
              </Link>
            )}
            <span className="text-emerald-700">|</span>
            <span className="text-emerald-100">{session.playerName}</span>
            <form action={logoutAction}>
              <button type="submit" className="text-emerald-200 hover:text-white hover:underline">
                Sign out
              </button>
            </form>
          </nav>
        ) : (
          <nav className="flex items-center gap-5 text-sm">
            <Link href="/rules" className="hover:text-white hover:underline">
              Rules
            </Link>
            <Link href="/login" className="hover:text-white hover:underline">
              Sign in
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}
