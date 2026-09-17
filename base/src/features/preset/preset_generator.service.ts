import { env } from '../../core/env';
import { prisma } from '../../prisma';
import { formatPreset, invalidatePresetsCache } from './preset.service';
import { PresetDto, AVAILABLE_LANGUAGES, AvailableLanguage } from './preset.type';

export interface GeneratePresetOptions {
  language: string;
  presetId?: number;
  wordsCount?: number;
  levels?: string[];
  theme?: string;
  title?: string;
  description?: string;
  excludedWords?: string[] | Set<string>;
  translationLanguages?: string[];
  onProgress?: (message: string) => void;
}

export async function callLlmGenerate(prompt: string, jsonFormat: any): Promise<any> {
  let response: Response;
  try {
    response = await fetch(env.LLM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        provider: env.LLM_PROVIDER,
        model: env.LLM_MODEL,
        jsonFormat,
      }),
    });
  } catch (err: any) {
    throw new Error(
      `Failed to connect to LLM service at ${env.LLM_API_URL}: ${err.message}. Please verify that the LLM service is running and accessible.`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM API error (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as { data?: any; error?: string; message?: string };
  if (json.error) {
    throw new Error(`LLM API returned error: ${json.message || json.error}`);
  }
  return json.data;
}

export async function fetchDefinitionsFromDefiner(text: string, language: string): Promise<string[]> {
  let response: Response;
  try {
    response = await fetch(env.DEFINER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        text,
        definerApp: env.DEFINER_APP_TYPE,
      }),
    });
  } catch (err: any) {
    throw new Error(
      `Failed to connect to Definer service at ${env.DEFINER_API_URL}: ${err.message}. Please verify that the Definer service is running and accessible.`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Definer API error (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as { definitions?: Array<string | { text: string }>; error?: string };
  const rawDefs = json.definitions || [];
  return rawDefs.map((d) => (typeof d === 'string' ? d : d.text));
}

export async function fetchTranslationsFromTranslator(options: {
  texts: string[];
  sourceLanguage: string;
  targetLanguage: string;
}): Promise<string[]> {
  const { texts, sourceLanguage, targetLanguage } = options;
  if (texts.length === 0) return [];

  let response: Response;
  try {
    response = await fetch(env.TRANSLATOR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceLanguage,
        targetLanguage,
        texts,
        translatorApp: env.TRANSLATOR_APP_TYPE,
      }),
    });
  } catch (err: any) {
    throw new Error(
      `Failed to connect to Translator service at ${env.TRANSLATOR_API_URL}: ${err.message}. Please verify that the Translator service is running and accessible.`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translator API error (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as { translations?: string[]; error?: string };
  if (!Array.isArray(json.translations) || json.translations.length !== texts.length) {
    throw new Error(
      `Translator API returned mismatched translations count: expected ${texts.length}, got ${json.translations?.length}`
    );
  }

  return json.translations;
}

export async function fetchWordsFromLLM(options: {
  language: string;
  level?: string;
  theme?: string;
  count: number;
  excludedWords?: string[];
}): Promise<string[]> {
  const { language, level, theme, count, excludedWords = [] } = options;

  let prompt: string;
  if (level && theme) {
    prompt = `Generate a list of exactly ${count} unique words in language "${language}" related to the theme/topic "${theme}" strictly for CEFR proficiency level "${level}". Only include words that specifically belong to level "${level}". Do NOT include words from lower levels or higher levels.`;
  } else if (level) {
    prompt = `Generate a list of exactly ${count} unique words in language "${language}" strictly for CEFR proficiency level "${level}". Only include words that specifically belong to level "${level}". Do NOT include words from lower levels (such as A1, A2, B1) or higher levels (such as C1, C2).`;
  } else if (theme) {
    prompt = `Generate a list of exactly ${count} common unique words in language "${language}" related to the theme/topic "${theme}".`;
  } else {
    prompt = `Generate a list of exactly ${count} common unique words in language "${language}".`;
  }

  if (excludedWords.length > 0) {
    const recentExcluded = excludedWords.slice(-100);
    prompt += ` Do not include any of the following words: ${recentExcluded.join(', ')}.`;
  }

  prompt += ' Return only words as lowercase strings.';

  const jsonFormat = {
    type: 'object',
    properties: {
      words: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of words',
      },
    },
    required: ['words'],
  };

  const data = await callLlmGenerate(prompt, jsonFormat);
  const words = Array.isArray(data?.words) ? data.words : [];

  return words
    .map((w: any) => String(w).trim().toLowerCase())
    .filter((w: string) => w.length > 0);
}

export interface WordDefinitionsItem {
  word: string;
  definitions: string[];
}

export interface FilterDefinitionsBatchOptions {
  language: string;
  items: WordDefinitionsItem[];
  level?: string;
}

export interface FilteredWordResult {
  word: string;
  filteredDefinitions: string[];
}

export async function filterDefinitionsBatchWithLLM(
  options: FilterDefinitionsBatchOptions
): Promise<FilteredWordResult[]> {
  const { language, items, level } = options;
  const validItems = items.filter(
    (item) => item.definitions.length > 0 && item.word.trim().length > 0
  );
  if (validItems.length === 0) return [];

  let prompt = `You are an expert language teacher and lexicographer.\n`;
  prompt += `Language: "${language}"\n`;
  if (level) {
    prompt += `Target CEFR proficiency level: strictly "${level}".\n`;
  }
  prompt += `evaluate the following definitions for the words:\n${JSON.stringify(validItems, null, 2)}\n\n`;
  prompt += `Tasks:\n`;
  if (level) {
    prompt += `1. Filter and verify suitability: For each word, keep definitions that strictly match CEFR level "${level}". Do NOT keep definitions belonging to lower levels (such as A1, A2, B1) or higher levels (such as C1, C2).\n`;
  } else {
    prompt += `1. Filter and verify suitability: For each word, keep valid, meaningful definitions for the target word.\n`;
  }
  prompt += `2. Fix tautological or word-as-definition entries: Especially for beginner levels (such as A0 or A1), raw definitions from dictionaries often consist merely of the word itself (e.g. word "dog" -> definition "dog", word "yes" -> definition "yes"), a circular tautology, or a trivial phrase where masking the target word leaves only "***" (e.g. "***", "a ***", "to ***"). You MUST detect such unhelpful definitions and FIX them by rewriting them into simple, clear, informative explanations suitable for learners at level ${level ? `"${level}"` : 'of this course'}. Describe what the object, action, or concept is (e.g. for "dog", explain it is a common domestic animal that barks; for "cat", a small pet that meows; for "water", a clear liquid that people drink) using simple language.\n`;
  prompt += `3. Mask the target word: In the text of each kept or rewritten definition, you MUST replace any occurrence of that specific target word (case-insensitive, including compound expressions like "hot dog" -> "hot ***", inflections, and plurals) with three asterisks: "***". Do not reveal the target word itself in the definition text. A definition must NEVER be just "***" or contain only placeholder asterisks without an informative explanation.\n\n`;
  prompt += `Return a JSON object with a "results" array where each object has "word" and "filteredDefinitions". If no definitions match for a word, return an empty array for that word.`;

  const jsonFormat = {
    type: 'object',
    properties: {
      results: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            word: { type: 'string' },
            filteredDefinitions: {
              type: 'array',
              items: { type: 'string' },
              description: 'List of informative definitions strictly matching the level with the target word replaced by *** (must never be just "***")',
            },
          },
          required: ['word', 'filteredDefinitions'],
        },
      },
    },
    required: ['results'],
  };

  const data = await callLlmGenerate(prompt, jsonFormat);

  let rawResults: any[] = [];
  if (Array.isArray(data?.results)) {
    rawResults = data.results;
  } else if (Array.isArray(data?.filteredDefinitions) && validItems.length === 1) {
    rawResults = [{ word: validItems[0].word, filteredDefinitions: data.filteredDefinitions }];
  } else if (Array.isArray(data?.definitions) && validItems.length === 1) {
    rawResults = [{ word: validItems[0].word, filteredDefinitions: data.definitions }];
  }

  const resultMap = new Map<string, string[]>();
  for (const res of rawResults) {
    if (res && typeof res.word === 'string') {
      const defs = Array.isArray(res.filteredDefinitions)
        ? res.filteredDefinitions
        : Array.isArray(res.definitions)
        ? res.definitions
        : [];
      resultMap.set(res.word.trim().toLowerCase(), defs);
    }
  }

  return validItems.map((item) => {
    const rawDefs = resultMap.get(item.word.trim().toLowerCase()) ?? [];

    const filteredDefinitions = rawDefs
      .map((d: any) => String(d ?? '').trim())
      .filter((d: string) => {
        if (d.length === 0) return false;
        // Ensure the definition is not just "***" or "***." or "A ***" with no descriptive content
        const stripped = d
          .replace(/\*\*\*/g, '')
          .replace(/^(a|an|the|to)\s+/i, '')
          .replace(/[.,!?;:"'()\s]/g, '')
          .trim();
        return stripped.length > 0;
      });

    return {
      word: item.word,
      filteredDefinitions,
    };
  });
}

export async function filterDefinitionsWithLLM(options: {
  language: string;
  word: string;
  definitions: string[];
  level?: string;
}): Promise<string[]> {
  const { language, word, definitions, level } = options;
  if (definitions.length === 0) return [];

  const results = await filterDefinitionsBatchWithLLM({
    language,
    level,
    items: [{ word, definitions }],
  });

  return results[0]?.filteredDefinitions ?? [];
}

export async function generatePreset(options: GeneratePresetOptions): Promise<PresetDto> {
  const log = options.onProgress || (() => {});
  const language = options.language.trim().toLowerCase();
  const theme = options.theme?.trim();

  const wordsCount = options.wordsCount && options.wordsCount > 0 ? options.wordsCount : 100;
  const levels = options.levels && options.levels.length > 0 ? options.levels.map((l) => l.trim().toUpperCase()) : [undefined];

  log(
    `Starting preset generation for language: "${language}", wordsCount: ${wordsCount}, levels: ${
      levels.filter(Boolean).join(', ') || 'none'
    }${theme ? `, theme: "${theme}"` : ''}`
  );

  interface PresetDefItem {
    text: string;
    translations: Record<string, string>;
  }
  interface PresetWordItem {
    word: string;
    definitions: PresetDefItem[];
  }

  // Determine target translation languages
  const rawTargetLanguages =
    options.translationLanguages && options.translationLanguages.length > 0
      ? options.translationLanguages
          .map((l) => l.trim().toLowerCase())
          .filter((l) => l.length > 0 && l !== language)
      : (AVAILABLE_LANGUAGES as readonly string[]).filter((l) => l !== language);
  const targetLanguages = Array.from(new Set(rawTargetLanguages));

  // If presetId is specified, verify it exists and load existing words & definitions
  let existingPreset: any = null;
  const existingWordMap = new Map<string, Set<string>>(); // lowercase word -> Set of lowercase definitions
  let existingBodyList: PresetWordItem[] = [];

  if (options.presetId) {
    existingPreset = await prisma.preset.findUnique({
      where: { id: options.presetId },
    });

    if (!existingPreset) {
      throw new Error(`Preset with ID ${options.presetId} not found.`);
    }

    if (existingPreset.forLanguage.toLowerCase() !== language) {
      throw new Error(
        `Preset #${options.presetId} has language "${existingPreset.forLanguage}", which does not match requested language "${language}".`
      );
    }

    if (Array.isArray(existingPreset.body)) {
      for (const item of existingPreset.body) {
        if (item && typeof item === 'object' && typeof item.word === 'string') {
          const w = item.word.trim().toLowerCase();
          const defs: PresetDefItem[] = [];
          if (Array.isArray(item.definitions)) {
            for (const d of item.definitions) {
              if (typeof d === 'string') {
                const text = d.trim();
                if (text) defs.push({ text, translations: {} });
              } else if (d && typeof d === 'object' && typeof d.text === 'string') {
                const text = d.text.trim();
                const translations: Record<string, string> = {};
                if (d.translations && typeof d.translations === 'object') {
                  for (const [k, v] of Object.entries(d.translations)) {
                    if (typeof v === 'string') translations[k] = v;
                  }
                } else if (typeof d.translation === 'string' && d.translation.trim()) {
                  const fallbackLang = language === 'ru' ? 'en' : 'ru';
                  translations[fallbackLang] = d.translation.trim();
                }
                if (text) defs.push({ text, translations });
              }
            }
          }
          existingWordMap.set(w, new Set(defs.map((d) => d.text.toLowerCase())));
          existingBodyList.push({ word: item.word.trim(), definitions: defs });
        }
      }
    }
    log(`Loaded existing preset #${options.presetId} with ${existingWordMap.size} word(s).`);
  }

  // Global map of words collected during this entire run: word -> definitions array
  const runCollectedWords = new Map<string, string[]>();
  const globalExcludedWords = new Set<string>();

  if (options.excludedWords) {
    for (const w of options.excludedWords) {
      const normalized = w.trim().toLowerCase();
      if (normalized) globalExcludedWords.add(normalized);
    }
  }

  for (const level of levels) {
    const levelLabel = level ? `Level ${level}` : 'General';
    log(`\n--- Collecting ${wordsCount} words for ${levelLabel}${theme ? ` (Theme: ${theme})` : ''} ---`);

    const levelCollectedWords = new Map<string, string[]>();
    let emptyBatchCount = 0;

    while (levelCollectedWords.size < wordsCount) {
      const needed = wordsCount - levelCollectedWords.size;
      const batchCount = Math.min(Math.max(needed, 5), 50);

      log(`[${levelLabel}] Requesting batch of ${batchCount} words from LLM (collected so far: ${levelCollectedWords.size}/${wordsCount})...`);

      const wordsFromLlm = await fetchWordsFromLLM({
        language,
        level,
        theme,
        count: batchCount,
        excludedWords: Array.from(globalExcludedWords),
      });

      const newWords = wordsFromLlm.filter((w) => {
        const normalized = w.trim().toLowerCase();
        if (!normalized) return false;
        if (options.presetId && existingWordMap.has(normalized)) return true;
        if (globalExcludedWords.has(normalized)) return false;
        if (levelCollectedWords.has(normalized)) return false;
        if (runCollectedWords.has(normalized)) return false;
        return true;
      });

      if (newWords.length === 0) {
        emptyBatchCount++;
        if (emptyBatchCount >= 5) {
          log(`[${levelLabel}] Warning: LLM returned no new words after 5 attempts. Stopping collection for this level.`);
          break;
        }
      } else {
        emptyBatchCount = 0;
      }

      for (const word of wordsFromLlm) {
        globalExcludedWords.add(word);
      }

      const candidateBatch: WordDefinitionsItem[] = [];
      for (const word of newWords) {
        log(`[${levelLabel}] Fetching definitions for word "${word}"...`);
        const rawDefinitions = await fetchDefinitionsFromDefiner(word, language);

        if (!rawDefinitions || rawDefinitions.length === 0) {
          log(`[${levelLabel}] No definitions found for "${word}". Discarding.`);
          continue;
        }

        candidateBatch.push({ word, definitions: rawDefinitions });
      }

      if (candidateBatch.length > 0) {
        log(
          `[${levelLabel}] Batch filtering definitions for ${candidateBatch.length} word(s) strictly for level ${
            level ?? 'general'
          } and masking target words...`
        );
        const batchResults = await filterDefinitionsBatchWithLLM({
          language,
          level,
          items: candidateBatch,
        });

        for (const { word, filteredDefinitions: filteredDefs } of batchResults) {
          const normalizedWord = word.trim().toLowerCase();
          // 4. If no definitions left after filtering, discard word
          if (!filteredDefs || filteredDefs.length === 0) {
            log(`[${levelLabel}] No definitions remaining after filtering for "${word}". Discarding.`);
            continue;
          }

          // 5 & 6. If presetId was given and word already in preset, check for new definitions
          if (options.presetId && existingWordMap.has(normalizedWord)) {
            const existingDefsSet = existingWordMap.get(normalizedWord)!;
            const newDefs = filteredDefs.filter((d) => !existingDefsSet.has(d.trim().toLowerCase()));

            if (newDefs.length === 0) {
              log(`[${levelLabel}] Word "${word}" already in preset #${options.presetId} with no new definitions. Discarding.`);
              continue;
            }

            log(`[${levelLabel}] Word "${word}" has ${newDefs.length} new definition(s). Keeping.`);
            levelCollectedWords.set(normalizedWord, newDefs);
          } else {
            if (options.excludedWords) {
              const isExcluded = options.excludedWords instanceof Set
                ? options.excludedWords.has(normalizedWord)
                : options.excludedWords.includes(normalizedWord);
              if (isExcluded) {
                log(`[${levelLabel}] Word "${word}" is in excluded words list. Discarding.`);
                continue;
              }
            }
            if (runCollectedWords.has(normalizedWord)) {
              log(`[${levelLabel}] Word "${word}" already collected. Discarding.`);
              continue;
            }

            log(`[${levelLabel}] Word "${word}" accepted with ${filteredDefs.length} definition(s).`);
            levelCollectedWords.set(normalizedWord, filteredDefs);
          }

          log(`[${levelLabel}] Progress: ${levelCollectedWords.size}/${wordsCount} words collected.`);

          if (levelCollectedWords.size >= wordsCount) {
            break;
          }
        }
      }
    }

    // Merge level words into runCollectedWords
    for (const [word, defs] of levelCollectedWords.entries()) {
      if (runCollectedWords.has(word)) {
        const existing = runCollectedWords.get(word)!;
        const existingSet = new Set(existing.map((d) => d.toLowerCase()));
        for (const d of defs) {
          if (!existingSet.has(d.toLowerCase())) {
            existing.push(d);
            existingSet.add(d.toLowerCase());
          }
        }
      } else {
        runCollectedWords.set(word, [...defs]);
      }
    }
  }

  log(`\nCollection completed. Total unique words collected in this run: ${runCollectedWords.size}.`);

  // 8. Save preset
  if (options.presetId && existingPreset) {
    log(`Updating preset #${options.presetId}...`);

    // Merge runCollectedWords into existingBodyList
    const existingIndexMap = new Map<string, number>();
    existingBodyList.forEach((item, index) => {
      existingIndexMap.set(item.word.toLowerCase(), index);
    });

    for (const [word, defs] of runCollectedWords.entries()) {
      const idx = existingIndexMap.get(word.toLowerCase());
      if (idx !== undefined) {
        const currentDefs = existingBodyList[idx].definitions;
        const currentSet = new Set(currentDefs.map((d) => d.text.toLowerCase()));
        for (const d of defs) {
          if (!currentSet.has(d.toLowerCase())) {
            currentDefs.push({ text: d, translations: {} });
            currentSet.add(d.toLowerCase());
          }
        }
      } else {
        existingBodyList.push({
          word,
          definitions: defs.map((d) => ({ text: d, translations: {} })),
        });
      }
    }

    // Translate any definitions that are missing translations for targetLanguages
    if (targetLanguages.length > 0) {
      for (const targetLang of targetLanguages) {
        const missingDefs = new Set<string>();
        for (const item of existingBodyList) {
          for (const def of item.definitions) {
            if (!def.translations[targetLang] && def.text) {
              missingDefs.add(def.text);
            }
          }
        }

        const missingList = Array.from(missingDefs);
        if (missingList.length > 0) {
          log(`[${language} -> ${targetLang}] Translating ${missingList.length} definition(s)...`);
          const translations = await fetchTranslationsFromTranslator({
            texts: missingList,
            sourceLanguage: language,
            targetLanguage: targetLang,
          });

          const transMap = new Map<string, string>();
          missingList.forEach((text, i) => transMap.set(text, translations[i] || ''));

          for (const item of existingBodyList) {
            for (const def of item.definitions) {
              if (!def.translations[targetLang] && transMap.has(def.text)) {
                def.translations[targetLang] = transMap.get(def.text)!;
              }
            }
          }
        }
      }
    }

    const updated = await prisma.preset.update({
      where: { id: options.presetId },
      data: {
        body: existingBodyList as any,
      },
    });

    await invalidatePresetsCache();

    log(`Preset #${options.presetId} successfully updated with ${existingBodyList.length} total words.`);
    return formatPreset(updated);
  } else {
    log(`Creating new preset for language "${language}"...`);

    const allUniqueDefTexts = Array.from(
      new Set(
        Array.from(runCollectedWords.values()).flatMap((defs) => defs)
      )
    ).filter((t) => t.length > 0);

    const translationsByLang = new Map<string, Map<string, string>>();
    for (const targetLang of targetLanguages) {
      translationsByLang.set(targetLang, new Map<string, string>());
    }

    if (allUniqueDefTexts.length > 0 && targetLanguages.length > 0) {
      log(
        `\nTranslating ${allUniqueDefTexts.length} definition(s) from "${language}" to ${targetLanguages.length} language(s): [${targetLanguages.join(', ')}]...`
      );

      for (const targetLang of targetLanguages) {
        log(`[${language} -> ${targetLang}] Translating ${allUniqueDefTexts.length} definition(s)...`);
        const translatedList = await fetchTranslationsFromTranslator({
          texts: allUniqueDefTexts,
          sourceLanguage: language,
          targetLanguage: targetLang,
        });

        const langMap = translationsByLang.get(targetLang)!;
        allUniqueDefTexts.forEach((text, idx) => {
          langMap.set(text, translatedList[idx] || '');
        });
      }
    }

    const newBody = Array.from(runCollectedWords.entries()).map(([word, definitions]) => ({
      word,
      definitions: definitions.map((defText) => {
        const translationsObj: Record<string, string> = {};
        for (const targetLang of targetLanguages) {
          const trans = translationsByLang.get(targetLang)?.get(defText);
          if (trans) {
            translationsObj[targetLang] = trans;
          }
        }
        return {
          text: defText,
          translations: translationsObj,
        };
      }),
    }));

    const validLevels = levels.filter(Boolean);
    const themePart = theme ? ` - ${theme}` : '';
    const levelPart = validLevels.length > 0 ? ` (${validLevels.join(', ')})` : '';
    const defaultTitle = `Preset ${language.toUpperCase()}${themePart}${levelPart} - ${newBody.length} words`.trim();
    const title = options.title?.trim() || defaultTitle;
    const defaultDesc = theme ? `Theme: ${theme}` : null;
    const description = options.description?.trim() || defaultDesc;

    const created = await prisma.preset.create({
      data: {
        title,
        description,
        forLanguage: language,
        type: 'word-definition',
        body: newBody as any,
      },
    });

    await invalidatePresetsCache();

    log(`Preset #${created.id} ("${created.title}") successfully created with ${newBody.length} words.`);
    return formatPreset(created);
  }
}
