"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, hashPasscode } from "@/lib/auth";
import { fetchCrestUrl } from "@/lib/crests";
import { irishLocalToUtc } from "@/lib/time";
import { syncFromFootballData } from "@/lib/sync";

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

/**
 * Pulls fixtures/kickoffs/results from football-data.org for every gameweek
 * that already exists here (matched by number == their matchday). Never
 * creates gameweeks - only the admin does that, via createGameweekAction.
 */
export async function syncFixturesAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  await requireAdmin();
  try {
    const summary = await syncFromFootballData();
    revalidatePath("/admin");
    revalidatePath("/fixtures");
    revalidatePath("/standings");
    revalidatePath("/picks");
    revalidatePath("/");

    const parts = [
      `Checked matchday(s) ${summary.matchdaysChecked.join(", ") || "none"}`,
      `${summary.fixturesCreated} fixture(s) added`,
      `${summary.fixturesUpdated} updated`,
      `${summary.resultsUpdated} result(s) filled in`,
    ];
    if (summary.unmatchedTeams.length > 0) {
      parts.push(`couldn't match: ${summary.unmatchedTeams.join(", ")}`);
      return { error: parts.join(". ") + "." };
    }
    return ok(parts.join(". ") + ".");
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Sync failed.");
  }
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

/** Maps every team's name, short code, and aliases (lowercased) to that team. */
async function buildTeamLookup() {
  const teams = await prisma.team.findMany();
  const byKey = new Map(teams.map((t) => [t.name.toLowerCase(), t]));
  for (const t of teams) {
    byKey.set(t.shortName.toLowerCase(), t);
    for (const alias of t.aliases) byKey.set(alias.toLowerCase(), t);
  }
  return byKey;
}

/**
 * Parses lines like "Arsenal vs Chelsea" or "Arsenal vs Chelsea, 20/09/2026 15:00"
 * (team names matched case-insensitively against full name, short code, or any
 * saved alias - e.g. "Spurs", "Man City", "Forest" - so text copied from wherever
 * a fixture list was found tends to just work; the date is optional and always
 * Ireland/UK time). Creates fixtures that don't exist yet; for ones that already
 * exist, updates the kickoff if a new one was given. Reports lines it couldn't
 * match rather than failing the whole batch.
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

  const byKey = await buildTeamLookup();

  const existingFixtures = await prisma.fixture.findMany({ where: { gameweekId } });
  const existingByKey = new Map(existingFixtures.map((f) => [`${f.homeTeamId}:${f.awayTeamId}`, f]));

  let created = 0;
  let updated = 0;
  const problems: string[] = [];

  for (const line of lines) {
    const [fixturePart, dateTimePart] = line.split(",").map((s) => s.trim());
    const match = fixturePart.match(/^(.+?)\s+vs?\.?\s+(.+)$/i);
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

    let kickoff: Date | undefined;
    if (dateTimePart) {
      const dtMatch = dateTimePart.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/);
      if (!dtMatch) {
        problems.push(`"${line}" — couldn't parse date/time (expected DD/MM/YYYY HH:mm)`);
        continue;
      }
      const [, d, mo, y, h, mi] = dtMatch;
      const parsed = irishLocalToUtc(
        `${y}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}T${h.padStart(2, "0")}:${mi}`
      );
      if (!parsed) {
        problems.push(`"${line}" — invalid date/time`);
        continue;
      }
      kickoff = parsed;
    }

    const key = `${home.id}:${away.id}`;
    const existing = existingByKey.get(key);
    if (existing) {
      if (kickoff) {
        await prisma.fixture.update({ where: { id: existing.id }, data: { kickoff } });
        updated += 1;
      }
      continue;
    }
    const createdFixture = await prisma.fixture.create({
      data: { gameweekId, homeTeamId: home.id, awayTeamId: away.id, kickoff: kickoff ?? null },
    });
    existingByKey.set(key, createdFixture); // guards against a repeated line later in the same paste
    created += 1;
  }

  if (created > 0 || updated > 0) {
    revalidatePath(`/admin/gameweeks/${gameweekId}`);
    revalidatePath("/fixtures");
  }

  const summary = `Added ${created} fixture(s), updated kickoff on ${updated}.`;
  if (problems.length > 0) {
    return { error: `${summary} Couldn't add: ${problems.join("; ")}` };
  }
  return ok(summary);
}

/**
 * Parses lines like "Arsenal 2-0 Chelsea" (final score, home team listed
 * first - team names matched the same way as bulk fixture entry: full name,
 * short code, or alias) and marks the matching fixture in this gameweek as
 * played with those goals. The fixture must already exist for that exact
 * home/away pairing - this doesn't create new fixtures, only fills in
 * results for ones already added. Reports lines it couldn't parse, couldn't
 * match to a team, or that don't correspond to an existing fixture here.
 */
export async function updateResultsBulkAction(
  gameweekId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const raw = String(formData.get("results") ?? "");
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) return fail("Paste at least one result, one per line.");

  const byKey = await buildTeamLookup();
  const existingFixtures = await prisma.fixture.findMany({ where: { gameweekId } });
  const existingByKey = new Map(existingFixtures.map((f) => [`${f.homeTeamId}:${f.awayTeamId}`, f]));

  let updated = 0;
  const problems: string[] = [];

  for (const line of lines) {
    const match = line.match(/^(.+?)\s+(\d+)\s*[-:]\s*(\d+)\s+(.+)$/);
    if (!match) {
      problems.push(`"${line}" — couldn't parse (expected "Home 2-0 Away")`);
      continue;
    }
    const [, homeText, homeGoalsRaw, awayGoalsRaw, awayText] = match;
    const home = byKey.get(homeText.trim().toLowerCase());
    const away = byKey.get(awayText.trim().toLowerCase());
    if (!home || !away) {
      const unknown = [!home ? homeText.trim() : null, !away ? awayText.trim() : null]
        .filter(Boolean)
        .join(", ");
      problems.push(`"${line}" — unrecognised team: ${unknown}`);
      continue;
    }

    const fixture = existingByKey.get(`${home.id}:${away.id}`);
    if (!fixture) {
      problems.push(`"${line}" — no matching fixture in this gameweek (add the fixture first)`);
      continue;
    }

    await prisma.fixture.update({
      where: { id: fixture.id },
      data: { homeGoals: Number(homeGoalsRaw), awayGoals: Number(awayGoalsRaw), played: true },
    });
    updated += 1;
  }

  if (updated > 0) {
    revalidatePath(`/admin/gameweeks/${gameweekId}`);
    revalidatePath("/fixtures");
    revalidatePath("/standings");
    revalidatePath("/picks");
    revalidatePath("/");
  }

  const summary = `Updated ${updated} result(s).`;
  if (problems.length > 0) {
    return { error: `${summary} Couldn't update: ${problems.join("; ")}` };
  }
  return ok(summary);
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

function parseAliases(raw: string): string[] {
  return raw
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
}

export async function addTeamAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const shortName = String(formData.get("shortName") ?? "").trim().toUpperCase();
  const aliases = parseAliases(String(formData.get("aliases") ?? ""));
  if (!name || !shortName) return fail("Enter both a full name and a short code.");

  const existing = await prisma.team.findFirst({ where: { OR: [{ name }, { shortName }] } });
  if (existing) return fail("A team with that name or short code already exists.");

  const crestUrl = await fetchCrestUrl(name);
  await prisma.team.create({ data: { name, shortName, aliases, crestUrl } });
  revalidatePath("/admin/teams");
  return ok(crestUrl ? "Team added." : "Team added (couldn't find a crest automatically).");
}

export async function updateTeamAliasesAction(
  teamId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  const aliases = parseAliases(String(formData.get("aliases") ?? ""));
  await prisma.team.update({ where: { id: teamId }, data: { aliases } });
  revalidatePath("/admin/teams");
  return ok("Aliases updated.");
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
