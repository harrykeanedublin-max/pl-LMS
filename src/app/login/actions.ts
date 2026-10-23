"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { hashPasscode, verifyPasscode } from "@/lib/auth";

export interface FormState {
  error?: string;
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim().replace(/\s+/g, " ");
  const firstName = clean(formData.get("firstName"));
  const lastName = clean(formData.get("lastName"));
  const passcode = String(formData.get("passcode") ?? "");
  const confirmPasscode = String(formData.get("confirmPasscode") ?? "");
  const adminCode = String(formData.get("adminCode") ?? "");

  if (!firstName || !lastName) {
    return { error: "Enter both your first and last name." };
  }
  const name = `${firstName} ${lastName}`;
  if (name.length > 40) {
    return { error: "Your full name must be 40 characters or fewer." };
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
