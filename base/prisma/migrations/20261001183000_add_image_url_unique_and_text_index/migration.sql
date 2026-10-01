-- CreateIndex
CREATE UNIQUE INDEX "Image_url_key" ON "Image"("url");

-- DropIndex
DROP INDEX IF EXISTS "Image_source_idx";

-- CreateIndex
CREATE INDEX "Image_text_idx" ON "Image"("text");
