-- CreateEnum
CREATE TYPE "UserFeature" AS ENUM ('MULTIPLE_DICTIONARIES', 'CARD_IMAGES');

-- CreateTable
CREATE TABLE "UserFeatureFlag" (
    "userId" INTEGER NOT NULL,
    "feature" "UserFeature" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserFeatureFlag_pkey" PRIMARY KEY ("userId", "feature")
);

-- CreateIndex
CREATE INDEX "UserFeatureFlag_feature_idx" ON "UserFeatureFlag"("feature");

-- AddForeignKey
ALTER TABLE "UserFeatureFlag" ADD CONSTRAINT "UserFeatureFlag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
