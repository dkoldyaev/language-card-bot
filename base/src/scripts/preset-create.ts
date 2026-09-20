import 'dotenv/config';
import type { PresetDto } from '../features/preset/preset.type';
import { generatePreset } from '../features/preset/preset_generator.service';
import { prisma } from '../prisma';
import type { LanguageCode } from '../types/language';

interface CliParams {
  languages: LanguageCode[];
  presetId?: number;
  wordCounts: number[];
  levels: string[];
  themes: string[];
  translationLanguages?: string[];
  title?: string;
  description?: string;
}

function printUsage() {
  console.log(`
Usage:
  npm run preset:create -- --language <codeOrName> [options]

Required:
  --language, -l <lang>         Language code(s) (e.g. en, es, fr, de, ru).
                                Can be specified multiple times (--language en --language fr)
                                or comma-separated (--language en,fr).

Optional:
  --level <levels>              CEFR level(s) (e.g. A0, A1, A2, B1, B2, C1, C2).
                                Can be specified multiple times (--level B1 --level B2)
                                or comma-separated (--level B1,B2).
  --theme, --topic, -t          Theme(s) for words (e.g. travel, food, IT).
                                Can be specified multiple times (--theme travel --theme IT)
                                or comma-separated (--theme travel,IT).
  --word-count,                 Target number of words per preset (default: 100).
  --words-count, -w             Pass comma-separated values (e.g. 10,10,10) to create
                                multiple presets without repeating words.
  --translationLanguage,        Target language(s) for definition translations.
  --translation-language, -tl   Can be specified multiple times or comma-separated (e.g. ru,es).
                                Default: all available languages (except source language).
  --preset-id <id>              ID of an existing preset to add/update words (single preset only).
  --title <title>               Preset title (default auto-generated).
  --description <desc>          Preset description.

Examples:
  npm run preset:create -- --language en --level B1 --level B2 --theme travel --word-count 10,10,10
  npm run preset:create -- --language en --level B1 --translationLanguage ru --word-count 20
  npm run preset:create -- --language en --language fr --level B2 --word-count 50
  npm run preset:create -- --language es --preset-id 1 --words-count 20
`);
}

function parseCliArgs(): CliParams {
  const args = process.argv.slice(2);
  const rawLanguages: LanguageCode[] = [];
  let presetId: number | undefined;
  const rawWordCounts: number[] = [];
  const rawLevels: string[] = [];
  const rawThemes: string[] = [];
  const rawTranslationLanguages: string[] = [];
  let title: string | undefined;
  let description: string | undefined;

  const addLanguages = (val: string) => {
    val.split(',').forEach((s) => {
      const trimmed = s.trim().toLowerCase();
      if (trimmed) rawLanguages.push(trimmed as LanguageCode);
    });
  };

  const addLevels = (val: string) => {
    val.split(',').forEach((s) => {
      const trimmed = s.trim().toUpperCase();
      if (trimmed) rawLevels.push(trimmed);
    });
  };

  const addThemes = (val: string) => {
    val.split(',').forEach((s) => {
      const trimmed = s.trim();
      if (trimmed) rawThemes.push(trimmed);
    });
  };

  const addWordCounts = (val: string) => {
    val.split(',').forEach((s) => {
      const parsed = parseInt(s.trim(), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        rawWordCounts.push(parsed);
      }
    });
  };

  const addTranslationLanguages = (val: string) => {
    val.split(',').forEach((s) => {
      const trimmed = s.trim().toLowerCase();
      if (trimmed) rawTranslationLanguages.push(trimmed);
    });
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith('--language=')) {
      addLanguages(arg.split('=')[1]);
    } else if (arg.startsWith('-l=')) {
      addLanguages(arg.split('=')[1]);
    } else if (arg === '--language' || arg === '-l') {
      const val = args[++i];
      if (val) addLanguages(val);
    } else if (arg.startsWith('--preset-id=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(val)) presetId = val;
    } else if (arg === '--preset-id') {
      const val = parseInt(args[++i], 10);
      if (!Number.isNaN(val)) presetId = val;
    } else if (arg.startsWith('--word-count=')) {
      addWordCounts(arg.split('=')[1]);
    } else if (arg.startsWith('--words-count=')) {
      addWordCounts(arg.split('=')[1]);
    } else if (arg.startsWith('-w=')) {
      addWordCounts(arg.split('=')[1]);
    } else if (arg === '--word-count' || arg === '--words-count' || arg === '-w') {
      const val = args[++i];
      if (val) addWordCounts(val);
    } else if (arg.startsWith('--level=')) {
      addLevels(arg.split('=')[1]);
    } else if (arg === '--level') {
      const val = args[++i];
      if (val) addLevels(val);
    } else if (arg.startsWith('--theme=') || arg.startsWith('--topic=')) {
      addThemes(arg.split('=')[1]);
    } else if (arg.startsWith('-t=')) {
      addThemes(arg.split('=')[1]);
    } else if (arg === '--theme' || arg === '--topic' || arg === '-t') {
      const val = args[++i];
      if (val) addThemes(val);
    } else if (
      arg.startsWith('--translationLanguage=') ||
      arg.startsWith('--translation-language=') ||
      arg.startsWith('--translate-to=')
    ) {
      addTranslationLanguages(arg.split('=')[1]);
    } else if (arg.startsWith('-tl=')) {
      addTranslationLanguages(arg.split('=')[1]);
    } else if (
      arg === '--translationLanguage' ||
      arg === '--translation-language' ||
      arg === '--translate-to' ||
      arg === '-tl'
    ) {
      const val = args[++i];
      if (val) addTranslationLanguages(val);
    } else if (arg.startsWith('--title=')) {
      title = arg.split('=')[1];
    } else if (arg === '--title') {
      title = args[++i];
    } else if (arg.startsWith('--description=')) {
      description = arg.split('=')[1];
    } else if (arg === '--description') {
      description = args[++i];
    }
  }

  const languages = Array.from(new Set(rawLanguages));
  const levels = Array.from(new Set(rawLevels));
  const themes = Array.from(new Set(rawThemes));
  const wordCounts = rawWordCounts.length > 0 ? rawWordCounts : [100];
  const translationLanguages =
    rawTranslationLanguages.length > 0 ? Array.from(new Set(rawTranslationLanguages)) : undefined;

  return {
    languages,
    presetId,
    wordCounts,
    levels,
    themes,
    translationLanguages,
    title,
    description,
  };
}

interface Combination {
  language: LanguageCode;
  level?: string;
  theme?: string;
}

async function main() {
  const params = parseCliArgs();

  if (params.languages.length === 0) {
    console.error('Error: --language is required.');
    printUsage();
    process.exit(1);
  }

  if (params.presetId !== undefined) {
    if (params.languages.length > 1) {
      console.error('Error: --preset-id cannot be used with multiple languages.');
      process.exit(1);
    }
    if (params.wordCounts.length > 1) {
      console.error('Error: --preset-id cannot be used with multiple word counts.');
      process.exit(1);
    }
  }

  // Generate Cartesian product: languages x levels x themes
  const effectiveLevels: (string | undefined)[] = params.levels.length > 0 ? params.levels : [undefined];
  const effectiveThemes: (string | undefined)[] = params.themes.length > 0 ? params.themes : [undefined];

  const combinations: Combination[] = [];
  for (const language of params.languages) {
    for (const level of effectiveLevels) {
      for (const theme of effectiveThemes) {
        combinations.push({ language, level, theme });
      }
    }
  }

  const totalRuns = combinations.length * params.wordCounts.length;
  console.log(`\n============================================================`);
  console.log(`Preset Creation Plan:`);
  console.log(`- Languages:    ${params.languages.join(', ')}`);
  console.log(`- Levels:       ${params.levels.length > 0 ? params.levels.join(', ') : 'any'}`);
  console.log(`- Themes:       ${params.themes.length > 0 ? params.themes.join(', ') : 'none'}`);
  console.log(`- Word counts:  ${params.wordCounts.join(', ')} (${params.wordCounts.length} preset(s) per combination)`);
  console.log(`- Translations: ${params.translationLanguages ? params.translationLanguages.join(', ') : 'all available languages'}`);
  console.log(`- Combinations: ${combinations.length}`);
  console.log(`- Total tasks:  ${totalRuns}`);
  console.log(`============================================================\n`);

  const usedWordsByLanguage = new Map<string, Set<string>>();
  const createdPresets: PresetDto[] = [];

  try {
    let runNumber = 0;

    for (let comboIdx = 0; comboIdx < combinations.length; comboIdx++) {
      const combo = combinations[comboIdx];
      const { language, level, theme } = combo;

      if (!usedWordsByLanguage.has(language)) {
        usedWordsByLanguage.set(language, new Set<string>());
      }
      const usedWords = usedWordsByLanguage.get(language);
      if (!usedWords) throw new Error(`Failed to get used words for language: ${language}`);

      for (let partIdx = 0; partIdx < params.wordCounts.length; partIdx++) {
        runNumber++;
        const wordsCount = params.wordCounts[partIdx];
        const partNumber = partIdx + 1;
        const totalParts = params.wordCounts.length;

        let presetTitle: string | undefined;
        if (params.title) {
          if (totalParts > 1 && combinations.length > 1) {
            presetTitle = `${params.title} (${language.toUpperCase()}${level ? ` ${level}` : ''}) #${partNumber}`;
          } else if (totalParts > 1) {
            presetTitle = `${params.title} #${partNumber}`;
          } else if (combinations.length > 1) {
            presetTitle = `${params.title} (${language.toUpperCase()}${level ? ` ${level}` : ''})`;
          } else {
            presetTitle = params.title;
          }
        } else if (totalParts > 1) {
          const themePart = theme ? ` - ${theme}` : '';
          const levelPart = level ? ` (${level})` : '';
          presetTitle = `Preset ${language.toUpperCase()}${themePart}${levelPart} #${partNumber} - ${wordsCount} words`;
        }

        console.log(`\n------------------------------------------------------------`);
        console.log(
          `[Task ${runNumber}/${totalRuns}] Generating preset for language: "${language}"` +
            `${level ? `, level: "${level}"` : ''}` +
            `${theme ? `, theme: "${theme}"` : ''}` +
            ` (target: ${wordsCount} words${totalParts > 1 ? `, part ${partNumber}/${totalParts}` : ''})...`
        );
        if (usedWords.size > 0) {
          console.log(`[Task ${runNumber}/${totalRuns}] Excluding ${usedWords.size} previously used words for "${language}".`);
        }
        console.log(`------------------------------------------------------------`);

        const result = await generatePreset({
          language,
          presetId: params.presetId,
          wordsCount,
          levels: level ? [level] : undefined,
          theme,
          title: presetTitle,
          description: params.description,
          excludedWords: usedWords,
          translationLanguages: params.translationLanguages,
          onProgress: (msg) => console.log(msg),
        });

        // Track collected words so subsequent presets never repeat them
        if (Array.isArray(result.body)) {
          for (const item of result.body) {
            if (item && typeof item === 'object' && typeof item.word === 'string') {
              usedWords.add(item.word.trim().toLowerCase());
            }
          }
        }

        createdPresets.push(result);
        console.log(`[Task ${runNumber}/${totalRuns}] Completed successfully: Preset #${result.id} ("${result.title}").`);
      }
    }

    console.log(`\n============================================================`);
    console.log(`All operations completed successfully! (${createdPresets.length} preset(s) processed)`);
    console.log(`============================================================`);
    console.table(
      createdPresets.map((p) => {
        const words = Array.isArray(p.body) ? p.body.length : 0;
        return {
          ID: p.id,
          Title: p.title,
          Language: p.forLanguage,
          Words: words,
          Type: p.type,
          Description: p.description || '-',
        };
      })
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('\nPreset operation failed:', msg);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
