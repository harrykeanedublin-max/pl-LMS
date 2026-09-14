"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPasscode } from "@/lib/auth";
import { fetchCrestUrl } from "@/lib/crests";
import { irishLocalToUtc } from "@/lib/time";

export interface ActionState {
  error?: string;
  success?: string;
}

const ok = (msg = "Saved."): ActionState => ({ success: msg });
const fail = (msg: string): ActionState => ({ error: msg });

export async function createGameweekAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const number = Number(formData.get("number"));
  const deadlineRaw = String(formData.get("deadline") ?? "");
  if (!number || number < 1) return fail("Enter a valid gameweek number.");
  const deadline = irishLocalToUtc(deadlineRaw);
  if (!deadline) return fail("Enter a valid deadline.");

  const existing = await prisma.gameweek.findUnique({ where: { number } });
  if (existing) return fail(`Gameweek ${number} already exists.`);

  await prisma.gameweek.create({ data: { number, deadline } });
  revalidatePath("/admin");
  return ok("Gameweek created.");
}

export async function toggleGameweekLockAction(gameweekId: string): Promise<void> {
  await requireAdmin();
  const gw = await prisma.gameweek.findUnique({ where: { id: gameweekId } });
  if (!gw) return;
  await prisma.gameweek.update({ where: { id: gameweekId }, data: { isLocked: !gw.isLocked } });
  revalidatePath("/admin");
  revalidatePath("/");
}

export async function updateGameweekDeadlineAction(
  gameweekId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const deadlineRaw = String(formData.get("deadline") ?? "");
  const deadline = irishLocalToUtc(deadlineRaw);
  if (!deadline) return fail("Enter a valid deadline.");
  await prisma.gameweek.update({ where: { id: gameweekId }, data: { deadline } });
  revalidatePath("/admin");
  revalidatePath("/");
  return ok("Deadline updated.");
}

export async function addFixtureAction(
  gameweekId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const homeTeamId = String(formData.get("homeTeamId") ?? "");
  const awayTeamId = String(formData.get("awayTeamId") ?? "");
  const kickoffRaw = String(formData.get("kickoff") ?? "");
  if (!homeTeamId || !awayTeamId || homeTeamId === awayTeamId) {
    return fail("Pick two different teams.");
  }

  const existing = await prisma.fixture.findFirst({ where: { gameweekId, homeTeamId, awayTeamId } });
  if (existing) return fail("That fixture already exists for this gameweek.");

  const kickoff = kickoffRaw ? new Date(kickoffRaw) : null;
  await prisma.fixture.create({ data: { gameweekId, homeTeamId, awayTeamId, kickoff } });
  revalidatePath(`/admin/gameweeks/${gameweekId}`);
  revalidatePath("/fixtures");
  return ok("Fixture added.");
}

/**
 * Parses lines like "Arsenal vs Chelsea" (team names matched case-insensitively
 * against full name or short code) and creates any fixtures that don't already
 * exist. Reports lines it couldn't match rather than failing the whole batch.
 */
export async function addFixturesBulkAction(
  gameweekId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const raw = String(formData.get("fixtures") ?? "");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return fail("Paste at least one fixture, one per line.");

  const teams = await prisma.team.findMany();
  const byKey = new Map(teams.map((t) => [t.name.toLowerCase(), t]));
  for (const t of teams) byKey.set(t.shortName.toLowerCase(), t);

  const existingFixtures = await prisma.fixture.findMany({ where: { gameweekId } });
  const existingKey = (homeId: string, awayId: string) => `${homeId}:${awayId}`;
  const existingSet = new Set(existingFixtures.map((f) => existingKey(f.homeTeamId, f.awayTeamId)));

  const toCreate: { homeTeamId: string; awayTeamId: string }[] = [];
  const problems: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s+vs?\.?\s+(.+)$/i);
    if (!match) {
      problems.push(`"${line}" — couldn't parse (expected "Home vs Away")`);
      continue;
    }
    const home = byKey.get(match[1].trim().toLowerCase());
    const away = byKey.get(match[2].trim().toLowerCase());
    if (!home || !away) {
      const unknown = [!home ? match[1].trim() : null, !away ? match[2].trim() : null]
        .filter(Boolean)
        .join(", ");
      problems.push(`"${line}" — unrecognised team: ${unknown}`);
      continue;
    }
    if (home.id === away.id) {
      problems.push(`"${line}" — same team twice`);
      continue;
    }
    const key = existingKey(home.id, away.id);
    if (existingSet.has(key)) continue; // already added, skip quietly
    existingSet.add(key);
    toCreate.push({ homeTeamId: home.id, awayTeamId: away.id });
  }

  if (toCreate.length > 0) {
    await prisma.fixture.createMany({
      data: toCreate.map((f) => ({ gameweekId, ...f })),
    });
    revalidatePath(`/admin/gameweeks/${gameweekId}`);
  }

  if (problems.length > 0) {
    return {
      error: `Added ${toCreate.length} fixture(s). Couldn't add: ${problems.join("; ")}`,
    };
  }
  return ok(`Added ${toCreate.length} fixture(s).`);
}

export async function updateFixtureResultAction(
  fixtureId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const homeGoalsRaw = String(formData.get("homeGoals") ?? "");
  const awayGoalsRaw = String(formData.get("awayGoals") ?? "");
  const kickoffRaw = String(formData.get("kickoff") ?? "");
  const played = formData.get("played") === "on";

  const homeGoals = homeGoalsRaw === "" ? null : Number(homeGoalsRaw);
  const awayGoals = awayGoalsRaw === "" ? null : Number(awayGoalsRaw);
  const kickoff = kickoffRaw ? new Date(kickoffRaw) : null;

  if (played && (homeGoals === null || awayGoals === null || homeGoals < 0 || awayGoals < 0)) {
    return fail("Enter both scores before marking the fixture as played.");
  }

  const fixture = await prisma.fixture.update({
    where: { id: fixtureId },
    data: { homeGoals, awayGoals, played, kickoff },
  });

  revalidatePath(`/admin/gameweeks/${fixture.gameweekId}`);
  revalidatePath("/fixtures");
  revalidatePath("/standings");
  revalidatePath("/");
  return ok("Result saved.");
}

export async function deleteFixtureAction(fixtureId: string): Promise<void> {
  await requireAdmin();
  const fixture = await prisma.fixture.delete({ where: { id: fixtureId } });
  revalidatePath(`/admin/gameweeks/${fixture.gameweekId}`);
}

export async function setPlayerPaidAction(playerId: string, paid: boolean): Promise<void> {
  await requireAdmin();
  await prisma.player.update({ where: { id: playerId }, data: { paid } });
  revalidatePath("/admin/players");
  revalidatePath("/standings");
}

export async function setPlayerAdminAction(playerId: string, isAdmin: boolean): Promise<void> {
  await requireAdmin();
  await prisma.player.update({ where: { id: playerId }, data: { isAdmin } });
  revalidatePath("/admin/players");
}

export async function resetPlayerPasscodeAction(
  playerId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const passcode = String(formData.get("passcode") ?? "");
  if (passcode.length < 4) return fail("Passcode must be at least 4 characters.");

  const passcodeHash = await hashPasscode(passcode);
  await prisma.player.update({ where: { id: playerId }, data: { passcodeHash } });
  revalidatePath("/admin/players");
  return ok("Passcode reset. Tell them their new passcode.");
}

export async function addTeamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim().toUpperCase();
  if (!name || !shortName) return fail("Enter both a full name and a short code.");

  const existing = await prisma.team.findFirst({ where: { OR: [{ name }, { shortName }] } });
  if (existing) return fail("A team with that name or short code already exists.");

  const crestUrl = await fetchCrestUrl(name);
  await prisma.team.create({ data: { name, shortName, crestUrl } });
  revalidatePath("/admin/teams");
  return ok(crestUrl ? "Team added." : "Team added (couldn't find a crest automatically).");
}

export async function deleteTeamAction(
  teamId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const [pickCount, fixtureCount] = await Promise.all([
    prisma.pick.count({ where: { teamId } }),
    prisma.fixture.count({ where: { OR: [{ homeTeamId: teamId }, { awayTeamId: teamId }] } }),
  ]);
  if (pickCount > 0 || fixtureCount > 0) {
    return fail("Can't remove a team that already has picks or fixtures.");
  }
  await prisma.team.delete({ where: { id: teamId } });
  revalidatePath("/admin/teams");
  return ok("Team removed.");
}

export async function refreshTeamCrestAction(
  teamId: string,
  _prev: ActionState,
  _formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return fail("Team not found.");

  const crestUrl = await fetchCrestUrl(team.name);
  if (!crestUrl) return fail("Couldn't find a crest for that name.");

  await prisma.team.update({ where: { id: teamId }, data: { crestUrl } });
  revalidatePath("/admin/teams");
  return ok("Crest updated.");
}

export async function updateConfigAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const poolName = String(formData.get("poolName") ?? "").trim();
  const entryFeeEuro = Number(formData.get("entryFeeEuro"));
  const numGameweeks = Number(formData.get("numGameweeks"));
  const first = Number(formData.get("splitFirst"));
  const second = Number(formData.get("splitSecond"));
  const third = Number(formData.get("splitThird"));

  if (!poolName) return fail("Enter a pool name.");
  if (!entryFeeEuro || entryFeeEuro <= 0) return fail("Enter a valid entry fee.");
  if (!numGameweeks || numGameweeks <= 0) return fail("Enter a valid number of gameweeks.");

  const total = (first || 0) + (second || 0) + (third || 0);
  if (Math.round(total) !== 100) return fail("Payout shares must add up to 100%.");

  const payoutSplit: Record<string, number> = {};
  if (first) payoutSplit["1"] = first / 100;
  if (second) payoutSplit["2"] = second / 100;
  if (third) payoutSplit["3"] = third / 100;

  await prisma.poolConfig.upsert({
    where: { id: "singleton" },
    update: { poolName, entryFeeEuro, numGameweeks, payoutSplit: JSON.stringify(payoutSplit) },
    create: {
      id: "singleton",
      poolName,
      entryFeeEuro,
      numGameweeks,
      payoutSplit: JSON.stringify(payoutSplit),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/rules");
  revalidatePath("/standings");
  return ok("Pool settings updated.");
}
