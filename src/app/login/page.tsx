import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import LoginForm from "@/components/LoginForm";

export default async function LoginPage() {
  const session = await getSession();

  if (session.playerId) {
    const player = await prisma.player.findUnique({ where: { id: session.playerId } });
    // Only redirect away if the session actually points at a real player. A stale
    // cookie referencing a deleted player falls through to the form below instead
    // of bouncing forever between "/" (which would also fail this lookup) and here;
    // signing in or registering again overwrites the stale cookie.
    if (player) redirect("/");
  }

  return <LoginForm />;
}
