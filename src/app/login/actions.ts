"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPasscode, verifyPasscode } from "@/lib/auth";

export interface FormState {
  error?: string;
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "");
  const confirmPasscode = String(formData.get("confirmPasscode") ?? "");
  const adminCode = String(formData.get("adminCode") ?? "");

  if (name.length < 2 || name.length > 40) {
    return { error: "Name must be between 2 and 40 characters." };
  }
  if (passcode.length < 4) {
    return { error: "Passcode must be at least 4 characters." };
  }
  if (passcode !== confirmPasscode) {
    return { error: "Passcodes don't match." };
  }

  const nameLower = name.toLowerCase();
  const existing = await prisma.player.findUnique({ where: { nameLower } });
  if (existing) {
    return { error: "That name is already taken. Try signing in, or pick a different name." };
  }

  const isAdmin = Boolean(adminCode) && adminCode === process.env.ADMIN_SETUP_CODE;
  const passcodeHash = await hashPasscode(passcode);

  const player = await prisma.player.create({
    data: { name, nameLower, passcodeHash, isAdmin },
  });

  const session = await getSession();
  session.playerId = player.id;
  session.playerName = player.name;
  session.isAdmin = player.isAdmin;
  await session.save();

  redirect("/");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const name = String(formData.get("name") ?? "").trim();
  const passcode = String(formData.get("passcode") ?? "");

  const player = await prisma.player.findUnique({ where: { nameLower: name.toLowerCase() } });
  if (!player) {
    return { error: "No player found with that name." };
  }

  const valid = await verifyPasscode(passcode, player.passcodeHash);
  if (!valid) {
    return { error: "Wrong passcode." };
  }

  const session = await getSession();
  session.playerId = player.id;
  session.playerName = player.name;
  session.isAdmin = player.isAdmin;
  await session.save();

  redirect("/");
}

export async function logoutAction() {
  "use server";
  const session = await getSession();
  session.destroy();
  redirect("/login");
}
