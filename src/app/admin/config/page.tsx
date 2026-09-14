import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ConfigForm from "@/components/admin/ConfigForm";

export default async function AdminConfigPage() {
  await requireAdmin();
  const config = await prisma.poolConfig.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  const split: Record<string, number> = JSON.parse(config.payoutSplit);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Pool settings</h1>
      <ConfigForm
        poolName={config.poolName}
        entryFeeEuro={config.entryFeeEuro}
        numGameweeks={config.numGameweeks}
        splitFirst={Math.round((split["1"] ?? 0) * 100)}
        splitSecond={Math.round((split["2"] ?? 0) * 100)}
        splitThird={Math.round((split["3"] ?? 0) * 100)}
      />
    </div>
  );
}
