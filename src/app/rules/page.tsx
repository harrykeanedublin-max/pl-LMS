import { prisma } from "@/lib/db";

export default async function RulesPage() {
  const config = await prisma.poolConfig.findUnique({ where: { id: "singleton" } });
  const payoutSplit: Record<string, number> = config ? JSON.parse(config.payoutSplit) : {};

  return (
    <div className="max-w-2xl flex flex-col gap-6">
      <div>
        <h1 className="font-display text-xl text-ink mb-1">{config?.poolName ?? "Premier League Pick'em"}</h1>
        <p className="text-sub text-sm">Entry: €{config?.entryFeeEuro ?? 20} · {config?.numGameweeks ?? 19} gameweeks</p>
      </div>

      <section>
        <h2 className="font-display text-sm text-ink mb-2">How it works</h2>
        <ul className="list-disc pl-5 text-sm text-ink space-y-1">
          <li>Each gameweek, pick one Premier League team you think will win.</li>
          <li>You can never pick the same team twice across the whole pool.</li>
          <li>Picks lock at the gameweek deadline set by the organiser.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-sm text-ink mb-2">Scoring</h2>
        <ul className="list-disc pl-5 text-sm text-ink space-y-1">
          <li>Win: 3 points</li>
          <li>Draw: 1 point</li>
          <li>Loss: 0 points</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-sm text-ink mb-2">Chips</h2>
        <p className="text-sm text-ink mb-2">
          Each chip can be played once across the whole pool, and you can only play one chip per
          gameweek.
        </p>
        <ul className="list-disc pl-5 text-sm text-ink space-y-2">
          <li>
            <strong>Double up</strong> — pick two teams instead of one for that gameweek. Both are
            scored normally and add to your total; both count as teams used.
          </li>
          <li>
            <strong>Gamble</strong> — for that gameweek, scoring changes to: win = 6, draw = 0,
            loss = −3.
          </li>
          <li>
            <strong>Clean sheet</strong> — add +2 points if your picked team doesn&apos;t concede a
            goal that gameweek, on top of normal scoring.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="font-display text-sm text-ink mb-2">The pot</h2>
        <p className="text-sm text-ink">
          Everyone pays €{config?.entryFeeEuro ?? 20} to enter. At the end of the pool, the pot is
          split:
        </p>
        <ul className="list-disc pl-5 text-sm text-ink space-y-1">
          {Object.entries(payoutSplit)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([place, share]) => (
              <li key={place}>
                {place === "1" ? "1st" : place === "2" ? "2nd" : place === "3" ? "3rd" : `${place}th`}{" "}
                place: {Math.round(share * 100)}% of the pot
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
