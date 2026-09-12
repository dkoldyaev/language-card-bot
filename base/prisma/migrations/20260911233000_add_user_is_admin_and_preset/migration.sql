-- AlterTable User
ALTER TABLE "User" ADD COLUMN "is_admin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable Preset
CREATE TABLE "Preset" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "for_language" TEXT NOT NULL,
    "body" JSONB NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Preset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Preset_for_language_idx" ON "Preset"("for_language");
