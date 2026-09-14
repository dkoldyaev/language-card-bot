import { env } from '../../core/env';
import { prisma } from '../../prisma';
import { formatPreset } from './preset.service';
import { PresetDto, AVAILABLE_LANGUAGES, AvailableLanguage } from './preset.type';

export interface GeneratePresetOptions {
  language: string;
  presetId?: number;
  wordsCount?: number;
  levels?: string[];
  theme?: string;
  title?: string;
  description?: string;
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

  const json = (await response.json()) as { definitions?: string[]; error?: string };
  return json.definitions || [];
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

export async function filterDefinitionsWithLLM(options: {
  language: string;
  word: string;
  definitions: string[];
  level?: string;
}): Promise<string[]> {
  const { language, word, definitions, level } = options;
  if (definitions.length === 0) return [];

  let prompt = `You are an expert language teacher and lexicographer.\n`;
  prompt += `Target word: "${word}"\nLanguage: "${language}"\n`;
  if (level) {
    prompt += `Target CEFR proficiency level: strictly "${level}".\n`;
  }
  prompt += `evaluate the following definitions for the word "${word}":\n${JSON.stringify(definitions, null, 2)}\n\n`;
  prompt += `Tasks:\n`;
  if (level) {
    prompt += `1. Filter: Keep ONLY definitions that strictly match CEFR level "${level}". Do NOT keep definitions belonging to lower levels (such as A1, A2, B1) or higher levels (such as C1, C2).\n`;
  } else {
    prompt += `1. Filter: Keep the valid definitions for the target word.\n`;
  }
  prompt += `2. Mask the target word: In the text of each kept definition, you MUST replace any occurrence of the target word "${word}" (case-insensitive, including compound expressions like "hot dog" -> "hot ***", inflections, and plurals) with three asterisks: "***". Do not reveal the target word itself in the definition text.\n\n`;
  prompt += `Return a JSON object with the list of processed definitions under the key "filteredDefinitions".`;

  const jsonFormat = {
    type: 'object',
    properties: {
      filteredDefinitions: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of definitions strictly matching the level with the target word replaced by ***',
      },
    },
    required: ['filteredDefinitions'],
  };

  const data = await callLlmGenerate(prompt, jsonFormat);
  const filtered = Array.isArray(data?.filteredDefinitions)
    ? data.filteredDefinitions
    : (Array.isArray(data?.definitions) ? data.definitions : []);

  // Safety net: ensure any literal occurrence of `word` that LLM might have missed is replaced with ***
  const escaped = word.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const wordRegex = new RegExp(`(?<=^|[^\\p{L}\\p{N}_])${escaped}(?=$|[^\\p{L}\\p{N}_])`, 'gui');

  return filtered
    .map((d: any) => String(d).trim().replace(wordRegex, '***'))
    .filter((d: string) => d.length > 0);
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

  // If presetId is specified, verify it exists and load existing words & definitions
  let existingPreset: any = null;
  const existingWordMap = new Map<string, Set<string>>(); // lowercase word -> Set of lowercase definitions
  let existingBodyList: Array<{ word: string; definitions: string[] }> = [];

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
          const defs: string[] = [];
          if (Array.isArray(item.definitions)) {
            for (const d of item.definitions) {
              const defText = typeof d === 'string' ? d.trim() : typeof d?.text === 'string' ? d.text.trim() : '';
              if (defText) defs.push(defText);
            }
          }
          existingWordMap.set(w, new Set(defs.map((d) => d.toLowerCase())));
          existingBodyList.push({ word: item.word.trim(), definitions: defs });
        }
      }
    }
    log(`Loaded existing preset #${options.presetId} with ${existingWordMap.size} word(s).`);
  }

  // Global map of words collected during this entire run: word -> definitions array
  const runCollectedWords = new Map<string, string[]>();
  const globalExcludedWords = new Set<string>();

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

      const newWords = wordsFromLlm.filter((w) => !globalExcludedWords.has(w));
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

        log(`[${levelLabel}] Fetching definitions for word "${word}"...`);
        const rawDefinitions = await fetchDefinitionsFromDefiner(word, language);

        if (!rawDefinitions || rawDefinitions.length === 0) {
          log(`[${levelLabel}] No definitions found for "${word}". Discarding.`);
          continue;
        }

        // 3. Filter definitions strictly for current level and mask target word with ***
        log(`[${levelLabel}] Filtering definitions for "${word}" strictly for level ${level || 'general'} and masking target word...`);
        const filteredDefs = await filterDefinitionsWithLLM({
          language,
          word,
          definitions: rawDefinitions,
          level,
        });

        // 4. If no definitions left after filtering, discard word
        if (!filteredDefs || filteredDefs.length === 0) {
          log(`[${levelLabel}] No definitions remaining after filtering for "${word}". Discarding.`);
          continue;
        }

        // 5 & 6. If presetId was given and word already in preset, check for new definitions
        if (options.presetId && existingWordMap.has(word)) {
          const existingDefsSet = existingWordMap.get(word)!;
          const newDefs = filteredDefs.filter((d) => !existingDefsSet.has(d.trim().toLowerCase()));

          if (newDefs.length === 0) {
            log(`[${levelLabel}] Word "${word}" already in preset #${options.presetId} with no new definitions. Discarding.`);
            continue;
          }

          log(`[${levelLabel}] Word "${word}" has ${newDefs.length} new definition(s). Keeping.`);
          levelCollectedWords.set(word, newDefs);
        } else {
          log(`[${levelLabel}] Word "${word}" accepted with ${filteredDefs.length} definition(s).`);
          levelCollectedWords.set(word, filteredDefs);
        }

        log(`[${levelLabel}] Progress: ${levelCollectedWords.size}/${wordsCount} words collected.`);

        if (levelCollectedWords.size >= wordsCount) {
          break;
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
        const currentSet = new Set(currentDefs.map((d) => d.toLowerCase()));
        for (const d of defs) {
          if (!currentSet.has(d.toLowerCase())) {
            currentDefs.push(d);
            currentSet.add(d.toLowerCase());
          }
        }
      } else {
        existingBodyList.push({
          word,
          definitions: [...defs],
        });
      }
    }

    const updated = await prisma.preset.update({
      where: { id: options.presetId },
      data: {
        body: existingBodyList,
      },
    });

    log(`Preset #${options.presetId} successfully updated with ${existingBodyList.length} total words.`);
    return formatPreset(updated);
  } else {
    log(`Creating new preset for language "${language}"...`);

    const newBody = Array.from(runCollectedWords.entries()).map(([word, definitions]) => ({
      word,
      definitions,
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
        body: newBody,
      },
    });

    log(`Preset #${created.id} ("${created.title}") successfully created with ${newBody.length} words.`);
    return formatPreset(created);
  }
}
