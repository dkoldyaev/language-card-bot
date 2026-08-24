-- AlterTable
ALTER TABLE "UserState" ADD COLUMN     "currentWordId" INTEGER;

-- AddForeignKey
ALTER TABLE "UserState" ADD CONSTRAINT "UserState_currentWordId_fkey" FOREIGN KEY ("currentWordId") REFERENCES "Word"("id") ON DELETE SET NULL ON UPDATE CASCADE;
