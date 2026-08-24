-- AlterTable
ALTER TABLE "UserState" ADD COLUMN     "currentDefinitionId" INTEGER,
ADD COLUMN     "showDefinitionTranslation" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "showVariants" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "UserState" ADD CONSTRAINT "UserState_currentDefinitionId_fkey" FOREIGN KEY ("currentDefinitionId") REFERENCES "Definition"("id") ON DELETE SET NULL ON UPDATE CASCADE;
