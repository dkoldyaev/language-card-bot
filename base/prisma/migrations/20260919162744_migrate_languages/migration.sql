-- Migrate Dictionary languages
UPDATE "Dictionary" 
SET "targetLanguage" = split_part("targetLanguage", '-', 1) 
WHERE "targetLanguage" LIKE '%-%';

UPDATE "Dictionary" 
SET "baseLanguage" = split_part("baseLanguage", '-', 1) 
WHERE "baseLanguage" LIKE '%-%';

-- Migrate Preset languages
UPDATE "Preset" 
SET "for_language" = split_part("for_language", '-', 1) 
WHERE "for_language" LIKE '%-%';
