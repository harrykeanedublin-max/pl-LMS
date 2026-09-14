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
   `DIRECT_URL`, `SESSION_SECRET`, `ADMIN_SETUP_CODE`) in the Vercel project
   settings.
4. Set the build command to run migrations first: `npx prisma migrate deploy && next build`.
5. Deploy. Run `npm run db:seed` once (locally, pointed at the production
   `DATABASE_URL`) to seed the 20 PL teams.

## Notes

- The seeded team list ([prisma/seed.ts](prisma/seed.ts)) reflects one Premier League
  season's clubs — promotion/relegation will make it stale eventually. Fix it any
  time from `/admin/teams` without touching code.
- Picks and chip choices can be changed freely up until a gameweek's deadline. The
  admin locks or sets the deadline for each gameweek.
- The app tracks who has paid their entry as a simple flag (`/admin/players`) — it
  doesn't move real money. Collect the €20 entries yourselves (bank transfer, etc.)
  and mark players paid once you've received it.
