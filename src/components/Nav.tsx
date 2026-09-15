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
    <header className="relative border-b-[3px] border-forest-dark bg-forest text-cream">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-display text-base tracking-tight text-cream">
          Not LMS 2
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-5 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={
                "admin" in l && l.admin
                  ? "hover:underline text-mustard font-semibold"
                  : "hover:text-white hover:underline"
              }
            >
              {l.label}
            </Link>
          ))}
          {signedIn && (
            <>
              <span className="text-forest-dark">|</span>
              <span className="text-cream/80">{session.playerName}</span>
              <form action={logoutAction}>
                <button type="submit" className="text-cream/70 hover:text-white hover:underline">
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
                  ? "py-2 text-mustard font-semibold"
                  : "py-2 text-cream hover:text-white"
              }
            >
              {l.label}
            </Link>
          ))}
          {signedIn && (
            <>
              <div className="border-t border-forest-dark my-1" />
              <span className="py-2 text-cream/70">{session.playerName}</span>
              <form action={logoutAction}>
                <button type="submit" className="py-2 text-cream/70 hover:text-white text-left w-full">
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
