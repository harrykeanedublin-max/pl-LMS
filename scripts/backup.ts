/**
 * Dumps every table to a timestamped JSON file under backups/. Run before
 * any risky manual change - it's the safety net Neon's free-tier 6-hour
 * point-in-time restore doesn't give you. Pair with scripts/restore.ts.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [players, teams, gameweeks, fixtures, chipUsages, picks, poolConfigs] = await Promise.all([
    prisma.player.findMany(),
    prisma.team.findMany(),
    prisma.gameweek.findMany(),
    prisma.fixture.findMany(),
    prisma.chipUsage.findMany(),
    prisma.pick.findMany(),
    prisma.poolConfig.findMany(),
  ]);

  const backup = {
    takenAt: new Date().toISOString(),
    players,
    teams,
    gameweeks,
    fixtures,
    chipUsages,
    picks,
    poolConfigs,
  };

  const dir = join(process.cwd(), "backups");
  mkdirSync(dir, { recursive: true });
  const filename = `backup-${backup.takenAt.replace(/[:.]/g, "-")}.json`;
  const path = join(dir, filename);
  writeFileSync(path, JSON.stringify(backup, null, 2));

  console.log(`Backup written to ${path}`);
  console.log(
    `players=${players.length} teams=${teams.length} gameweeks=${gameweeks.length} ` +
      `fixtures=${fixtures.length} chipUsages=${chipUsages.length} picks=${picks.length} ` +
      `poolConfigs=${poolConfigs.length}`
  );
}

main()
  .catch((err) => {
    console.error("Backup failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
