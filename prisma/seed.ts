import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// 2025/26 Premier League clubs.
const TEAMS: { name: string; shortName: string }[] = [
  { name: "Arsenal", shortName: "ARS" },
  { name: "Aston Villa", shortName: "AVL" },
  { name: "Bournemouth", shortName: "BOU" },
  { name: "Brentford", shortName: "BRE" },
  { name: "Brighton & Hove Albion", shortName: "BHA" },
  { name: "Burnley", shortName: "BUR" },
  { name: "Chelsea", shortName: "CHE" },
  { name: "Crystal Palace", shortName: "CRY" },
  { name: "Everton", shortName: "EVE" },
  { name: "Fulham", shortName: "FUL" },
  { name: "Leeds United", shortName: "LEE" },
  { name: "Liverpool", shortName: "LIV" },
  { name: "Manchester City", shortName: "MCI" },
  { name: "Manchester United", shortName: "MUN" },
  { name: "Newcastle United", shortName: "NEW" },
  { name: "Nottingham Forest", shortName: "NFO" },
  { name: "Sunderland", shortName: "SUN" },
  { name: "Tottenham Hotspur", shortName: "TOT" },
  { name: "West Ham United", shortName: "WHU" },
  { name: "Wolverhampton Wanderers", shortName: "WOL" },
];

async function main() {
  for (const team of TEAMS) {
    await prisma.team.upsert({
      where: { name: team.name },
      update: {},
      create: team,
    });
  }

  await prisma.poolConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  console.log(`Seeded ${TEAMS.length} teams and pool config.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
