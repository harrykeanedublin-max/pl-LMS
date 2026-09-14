"use server";

import { revalidatePath } from "next/cache";
import { ChipType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePlayer } from "@/lib/auth";

export interface PickFormState {
  error?: string;
  success?: string;
}

const CHIP_LABELS: Record<ChipType, string> = {
  [ChipType.DOUBLE_UP]: "double up",
  [ChipType.GAMBLE]: "gamble",
  [ChipType.CLEAN_SHEET]: "clean sheet",
};

export async function submitPicksAction(
  gameweekId: string,
  _prev: PickFormState,
  formData: FormData
): Promise<PickFormState> {
  const player = await requirePlayer();

  const gameweek = await prisma.gameweek.findUnique({ where: { id: gameweekId } });
  if (!gameweek) return { error: "Gameweek not found." };
  if (gameweek.isLocked || gameweek.deadline.getTime() <= Date.now()) {
    return { error: "The deadline for this gameweek has passed." };
  }

  const useDoubleUp = formData.get("chip_double_up") === "on";
  const useGamble = formData.get("chip_gamble") === "on";
  const useCleanSheet = formData.get("chip_clean_sheet") === "on";

  const team1 = String(formData.get("team1") ?? "");
  const team2 = useDoubleUp ? String(formData.get("team2") ?? "") : "";

  if (!team1) return { error: "Pick a team." };
  if (useDoubleUp && (!team2 || team2 === team1)) {
    return { error: "Pick two different teams to play the double up chip." };
  }

  const teamIds = useDoubleUp ? [team1, team2] : [team1];

  const chipsRequested: ChipType[] = [
    ...(useDoubleUp ? [ChipType.DOUBLE_UP] : []),
    ...(useGamble ? [ChipType.GAMBLE] : []),
    ...(useCleanSheet ? [ChipType.CLEAN_SHEET] : []),
  ];

  const existingChipUsages = await prisma.chipUsage.findMany({ where: { playerId: player.id } });
  for (const chip of chipsRequested) {
    const used = existingChipUsages.find((c) => c.chipType === chip);
    if (used && used.gameweekId !== gameweekId) {
      return { error: `You've already used your ${CHIP_LABELS[chip]} chip in a different gameweek.` };
    }
  }

  const existingPicks = await prisma.pick.findMany({ where: { playerId: player.id } });
  for (const teamId of teamIds) {
    const usedPick = existingPicks.find((p) => p.teamId === teamId && p.gameweekId !== gameweekId);
    if (usedPick) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      return { error: `You've already picked ${team?.name ?? "that team"} earlier this season.` };
    }
  }

  await prisma.$transaction([
    prisma.pick.deleteMany({ where: { playerId: player.id, gameweekId } }),
    prisma.chipUsage.deleteMany({ where: { playerId: player.id, gameweekId } }),
    ...teamIds.map((teamId) =>
      prisma.pick.create({ data: { playerId: player.id, gameweekId, teamId } })
    ),
    ...chipsRequested.map((chipType) =>
      prisma.chipUsage.create({ data: { playerId: player.id, gameweekId, chipType } })
    ),
  ]);

  revalidatePath("/");
  return { success: "Pick saved." };
}
