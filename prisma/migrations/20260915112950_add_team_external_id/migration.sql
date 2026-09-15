-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "externalId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Team_externalId_key" ON "Team"("externalId");
