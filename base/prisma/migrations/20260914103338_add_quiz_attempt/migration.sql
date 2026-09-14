-- DropIndex
DROP INDEX "Preset_for_language_idx";

-- CreateTable
CREATE TABLE "QuizAttempt" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "wordId" INTEGER NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuizAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_createdAt_idx" ON "QuizAttempt"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "QuizAttempt_userId_wordId_idx" ON "QuizAttempt"("userId", "wordId");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE INDEX "Definition_wordId_idx" ON "Definition"("wordId");

-- CreateIndex
CREATE INDEX "Preset_for_language_createdAt_idx" ON "Preset"("for_language", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "UserState_activeDictionaryId_idx" ON "UserState"("activeDictionaryId");

-- CreateIndex
CREATE INDEX "UserState_currentWordId_idx" ON "UserState"("currentWordId");

-- CreateIndex
CREATE INDEX "UserState_currentDefinitionId_idx" ON "UserState"("currentDefinitionId");

-- CreateIndex
CREATE INDEX "Word_dictionaryId_id_idx" ON "Word"("dictionaryId", "id");

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuizAttempt" ADD CONSTRAINT "QuizAttempt_wordId_fkey" FOREIGN KEY ("wordId") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
