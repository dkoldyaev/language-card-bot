-- CreateTable
CREATE TABLE "_DefinitionToPreset" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_DefinitionToPreset_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_PresetToWord" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_PresetToWord_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_DefinitionToPreset_B_index" ON "_DefinitionToPreset"("B");

-- CreateIndex
CREATE INDEX "_PresetToWord_B_index" ON "_PresetToWord"("B");

-- AddForeignKey
ALTER TABLE "_DefinitionToPreset" ADD CONSTRAINT "_DefinitionToPreset_A_fkey" FOREIGN KEY ("A") REFERENCES "Definition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DefinitionToPreset" ADD CONSTRAINT "_DefinitionToPreset_B_fkey" FOREIGN KEY ("B") REFERENCES "Preset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PresetToWord" ADD CONSTRAINT "_PresetToWord_A_fkey" FOREIGN KEY ("A") REFERENCES "Preset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PresetToWord" ADD CONSTRAINT "_PresetToWord_B_fkey" FOREIGN KEY ("B") REFERENCES "Word"("id") ON DELETE CASCADE ON UPDATE CASCADE;
