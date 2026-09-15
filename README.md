# PL Pick'em

A weekly Premier League team pick'em pool for a group of friends. Each gameweek every
player picks one PL team they think will win (never the same team twice across the
pool). Wins score 3 points, draws 1, losses 0. Three one-time chips add variety:

- **Double up** — pick two teams in one gameweek instead of one.
- **Gamble** — that gameweek's pick scores win 6 / draw 0 / loss -3 instead of the normal scoring.
- **Clean sheet** — +2 points if your picked team doesn't concede.

Players sign in with a name + passcode (no email required). The pool organiser signs
up with the `ADMIN_SETUP_CODE` to get admin rights, then manages gameweeks, fixtures,
results, teams, and who's paid from `/admin`.

## Local setup

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - `DATABASE_URL` / `DIRECT_URL` — a Postgres connection string (see below)
   - `SESSION_SECRET` — a random 64-char hex string (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `ADMIN_SETUP_CODE` — a one-time code you'll enter when you register, to become admin
3. Push the schema and seed the 20 PL teams:
   ```
   npx prisma migrate dev --name init
   npm run db:seed
   ```
4. Run the app: `npm run dev`, then open http://localhost:3000
5. Register as the first player using your `ADMIN_SETUP_CODE` to get admin access,
   then go to `/admin` to create gameweeks and add that week's fixtures.

## Database

This app uses Postgres via Prisma. A free option that works well with Vercel:

1. Create a project at [neon.com](https://neon.com) (free tier).
2. Copy the pooled connection string into `DATABASE_URL`, and the direct
   (non-pooled) connection string into `DIRECT_URL`. If your provider only gives
   you one string, use it for both.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it into [vercel.com](https://vercel.com/new).
3. Add the same environment variables from your `.env` (`DATABASE_URL`,
   `DIRECT_URL`, `SESSION_SECRET`, `ADMIN_SETUP_CODE`, `FOOTBALL_DATA_API_KEY`,
   `CRON_SECRET`) in the Vercel project settings.
4. Set the build command to run migrations first: `npx prisma migrate deploy && next build`.
5. Deploy. Run `npm run db:seed` once (locally, pointed at the production
   `DATABASE_URL`) to seed the 20 PL teams.
6. Vercel reads [vercel.json](vercel.json) automatically and schedules the
   daily fixture/result sync — nothing extra to configure there, just make
   sure Cron Jobs are enabled for the project (they are by default on Hobby).

## Fixture &amp; result sync

Fixtures, kickoff times, and results can sync automatically from
[football-data.org](https://www.football-data.org/) instead of being typed in
by hand:

- A free API key from football-data.org goes in `FOOTBALL_DATA_API_KEY`.
- `CRON_SECRET` is a random string you generate yourself; it authorizes the
  scheduled job (Vercel sends it automatically once set).
- The sync ([src/lib/sync.ts](src/lib/sync.ts)) runs once a day via Vercel Cron
  ([src/app/api/cron/sync/route.ts](src/app/api/cron/sync/route.ts),
  configured in [vercel.json](vercel.json)) and can also be triggered any time
  from `/admin` ("Sync fixtures & results now").
- It also creates gameweeks for you — any of gameweek 1 through
  `PoolConfig.numGameweeks` that don't exist yet, matched against
  football-data.org's matchday number, with the deadline set 2 hours before
  that gameweek's first kickoff. It never backfills a gameweek whose deadline
  would already have passed (e.g. matchdays played before the pool started).
- If a fixture gets rearranged (TV pick, postponement) before its deadline
  passes, the sync moves the deadline to match — but only for a gameweek it
  created itself. The moment you create a gameweek by hand, or edit a
  deadline yourself from `/admin/gameweeks/[id]`, the sync leaves that
  gameweek's deadline alone from then on (it still keeps its fixtures/results
  in sync).
- Teams are matched by name the first time (using each team's name, short
  code, and aliases from `/admin/teams`), and the match is remembered
  (`Team.externalId`) so later syncs don't need to re-match by name.
- The free football-data.org plan is rate-limited (10 requests/minute) and
  covers this comfortably at once a day.

## Notes

- The seeded team list ([prisma/seed.ts](prisma/seed.ts)) reflects one Premier League
  season's clubs — promotion/relegation will make it stale eventually. Fix it any
  time from `/admin/teams` without touching code.
- Team crests are looked up automatically from Wikipedia's public API
  ([src/lib/crests.ts](src/lib/crests.ts)) whenever a team is added, and can be
  retried per-team from `/admin/teams` ("Refresh crest") if one is missing or wrong.
  Crests are third-party club trademarks, used here only for identification in a
  private, non-commercial pool among friends.
- Picks and chip choices can be changed freely up until a gameweek's deadline. The
  admin locks or sets the deadline for each gameweek.
- The app tracks who has paid their entry as a simple flag (`/admin/players`) — it
  doesn't move real money. Collect the €20 entries yourselves (bank transfer, etc.)
  and mark players paid once you've received it.
