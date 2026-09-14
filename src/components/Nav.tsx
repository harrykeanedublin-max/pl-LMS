import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/login/actions";
import MobileNavToggle from "@/components/MobileNavToggle";

export default async function Nav() {
  const session = await getSession();
  // A cookie can outlive the player it names (e.g. an admin removed the account) —
  // confirm the player still exists rather than trusting the cookie alone.
  const signedIn = session.playerId
    ? Boolean(await prisma.player.findUnique({ where: { id: session.playerId }, select: { id: true } }))
    : false;

  const links = signedIn
    ? [
        { href: "/", label: "This Week" },
        { href: "/fixtures", label: "Fixtures" },
        { href: "/picks", label: "Picks" },
        { href: "/standings", label: "Standings" },
        { href: "/rules", label: "Rules" },
        ...(session.isAdmin ? [{ href: "/admin", label: "Admin", admin: true }] : []),
      ]
    : [
        { href: "/rules", label: "Rules" },
        { href: "/login", label: "Sign in" },
      ];

  return (
    <header
      className="relative border-b-4 border-emerald-950 bg-emerald-900 text-emerald-50"
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 40px, transparent 40px, transparent 80px)",
      }}
    >
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight text-white">
          ⚽ PL Pick&apos;em
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                "admin" in l && l.admin
                  ? "hover:underline text-amber-300 font-medium"
                  : "hover:text-white hover:underline"
              }
            >
              {l.label}
            </Link>
          ))}
          {signedIn && (
            <>
              <span className="text-emerald-700">|</span>
              <span className="text-emerald-100">{session.playerName}</span>
              <form action={logoutAction}>
                <button type="submit" className="text-emerald-200 hover:text-white hover:underline">
                  Sign out
                </button>
              </form>
            </>
          )}
        </nav>

        {/* Mobile nav */}
        <MobileNavToggle>
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                "admin" in l && l.admin
                  ? "py-2 text-amber-300 font-medium"
                  : "py-2 text-emerald-50 hover:text-white"
              }
            >
              {l.label}
            </Link>
          ))}
          {signedIn && (
            <>
              <div className="border-t border-emerald-800 my-1" />
              <span className="py-2 text-emerald-200">{session.playerName}</span>
              <form action={logoutAction}>
                <button type="submit" className="py-2 text-emerald-200 hover:text-white text-left w-full">
                  Sign out
                </button>
              </form>
            </>
          )}
        </MobileNavToggle>
      </div>
    </header>
  );
}
