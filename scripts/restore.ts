/**
 * Restores the database from a JSON file written by scripts/backup.ts.
 * DESTRUCTIVE: replaces every row in every table with what's in the file.
 * Usage:
 *   npx tsx scripts/restore.ts backups/backup-2026-09-20T12-00-00-000Z.json          (dry run - just shows counts)
 *   npx tsx scripts/restore.ts backups/backup-2026-09-20T12-00-00-000Z.json --confirm (actually restores)
 */
import { readFileSync } from "node:fs";
import { PrismaClient, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();

interface Backup {
  takenAt: string;
  players: Prisma.PlayerCreateManyInput[];
  teams: Prisma.TeamCreateManyInput[];
  gameweeks: Prisma.GameweekCreateManyInput[];
  fixtures: Prisma.FixtureCreateManyInput[];
  chipUsages: Prisma.ChipUsageCreateManyInput[];
  picks: Prisma.PickCreateManyInput[];
  poolConfigs: Prisma.PoolConfigCreateManyInput[];
}

/** JSON round-trips Date fields as strings - Prisma's client needs real Date objects. */
function withDates<T extends Record<string, unknown>>(rows: T[], dateFields: (keyof T)[]): T[] {
  return rows.map((row) => {
    const copy = { ...row };
    for (const field of dateFields) {
      if (copy[field] != null) copy[field] = new Date(copy[field] as string) as T[keyof T];
    }
    return copy;
  });
}

async function main() {
  const [filePath, flag] = process.argv.slice(2);
  if (!filePath) {
    console.error("Usage: npx tsx scripts/restore.ts <backup-file.json> [--confirm]");
    process.exitCode = 1;
    return;
  }

  const raw = JSON.parse(readFileSync(filePath, "utf-8")) as Backup;
  const backup: Backup = {
    ...raw,
    players: withDates(raw.players, ["createdAt"]),
    gameweeks: withDates(raw.gameweeks, ["deadline"]),
    fixtures: withDates(raw.fixtures, ["kickoff"]),
    chipUsages: withDates(raw.chipUsages, ["usedAt"]),
    picks: withDates(raw.picks, ["createdAt"]),
  };

  console.log(`Backup taken at: ${backup.takenAt}`);
  console.log(
    `Will restore: players=${backup.players.length} teams=${backup.teams.length} ` +
      `gameweeks=${backup.gameweeks.length} fixtures=${backup.fixtures.length} ` +
      `chipUsages=${backup.chipUsages.length} picks=${backup.picks.length} ` +
      `poolConfigs=${backup.poolConfigs.length}`
  );

  if (flag !== "--confirm") {
    console.log("\nDry run only - nothing was changed. Re-run with --confirm to actually restore.");
    console.log("WARNING: this replaces every row in every table with the contents of the file above.");
    return;
  }

  await prisma.$transaction([
    prisma.chipUsage.deleteMany(),
    prisma.pick.deleteMany(),
    prisma.fixture.deleteMany(),
    prisma.gameweek.deleteMany(),
    prisma.team.deleteMany(),
    prisma.player.deleteMany(),
    prisma.poolConfig.deleteMany(),
    prisma.player.createMany({ data: backup.players }),
    prisma.team.createMany({ data: backup.teams }),
    prisma.gameweek.createMany({ data: backup.gameweeks }),
    prisma.poolConfig.createMany({ data: backup.poolConfigs }),
    prisma.fixture.createMany({ data: backup.fixtures }),
    prisma.pick.createMany({ data: backup.picks }),
    prisma.chipUsage.createMany({ data: backup.chipUsages }),
  ]);

  console.log("\nRestore complete.");
}

main()
  .catch((err) => {
    console.error("Restore failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
