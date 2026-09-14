import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./db";

export function hashPasscode(passcode: string): Promise<string> {
  return bcrypt.hash(passcode, 10);
}

export function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passcode, hash);
}

/** Redirects to /login if no one is signed in. Returns the current player. */
export async function requirePlayer() {
  const session = await getSession();
  if (!session.playerId) redirect("/login");

  const player = await prisma.player.findUnique({ where: { id: session.playerId } });
  if (!player) redirect("/login");

  return player;
}

/** Redirects to / if the current player is not an admin. */
export async function requireAdmin() {
  const player = await requirePlayer();
  if (!player.isAdmin) redirect("/");
  return player;
}
