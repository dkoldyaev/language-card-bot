-- CreateTable
CREATE TABLE "Dictionary" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "baseLanguage" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dictionary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dictionary_userId_idx" ON "Dictionary"("userId");

-- AddForeignKey
ALTER TABLE "Dictionary" ADD CONSTRAINT "Dictionary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing UserSettings to Dictionary if table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'UserSettings') THEN
        INSERT INTO "Dictionary" ("name", "targetLanguage", "baseLanguage", "userId", "createdAt")
        SELECT 
            UPPER("targetLanguage") || ' (' || UPPER("baseLanguage") || ')',
            "targetLanguage", 
            "baseLanguage", 
            "userId", 
            NOW()
        FROM "UserSettings";
    END IF;
END $$;

-- AlterTable UserState
ALTER TABLE "UserState" ADD COLUMN "activeDictionaryId" INTEGER;

-- Set activeDictionaryId for existing users
UPDATE "UserState" us
SET "activeDictionaryId" = (
    SELECT d."id" FROM "Dictionary" d WHERE d."userId" = us."userId" LIMIT 1
);

-- AddForeignKey for UserState
ALTER TABLE "UserState" ADD CONSTRAINT "UserState_activeDictionaryId_fkey" FOREIGN KEY ("activeDictionaryId") REFERENCES "Dictionary"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Word
ALTER TABLE "Word" ADD COLUMN "dictionaryId" INTEGER;

-- Link existing words to user dictionary
UPDATE "Word" w
SET "dictionaryId" = (
    SELECT d."id" FROM "Dictionary" d WHERE d."userId" = w."userId" LIMIT 1
);

DELETE FROM "Word" WHERE "dictionaryId" IS NULL;

ALTER TABLE "Word" ALTER COLUMN "dictionaryId" SET NOT NULL;

-- Drop old constraints and column on Word
ALTER TABLE "Word" DROP CONSTRAINT IF EXISTS "Word_userId_fkey";
DROP INDEX IF EXISTS "Word_userId_text_key";
ALTER TABLE "Word" DROP COLUMN "userId";

-- Add new constraints on Word
ALTER TABLE "Word" ADD CONSTRAINT "Word_dictionaryId_fkey" FOREIGN KEY ("dictionaryId") REFERENCES "Dictionary"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Word_dictionaryId_text_key" ON "Word"("dictionaryId", "text");

-- DropTable UserSettings
DROP TABLE IF EXISTS "UserSettings";
