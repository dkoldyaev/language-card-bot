import { appEvents, Events } from '../../../core/events';
import { prisma } from '../../../prisma';
import { getUserDictionaries } from '../../dictionaries/dictionaries.service';
import { publishEvent } from '../../event_bus/event_bus.service';
import type { DictionariesSyncMercureEvent, DictionaryAddProcessingEvent, DictionaryAddProcessingItem } from '../../event_bus/event_bus.type';
import { WordDefinitionPresetBodySchema } from '../preset.type';
import type { IPresetAdapter, PresetAdapterResult, PresetApplyContext } from './preset_adapter.interface';

export class WordDefinitionPresetAdapter implements IPresetAdapter {
  readonly type = 'word-definition';

  async apply(context: PresetApplyContext): Promise<PresetAdapterResult> {
    const { userId, username, dictionaryId, preset } = context;

    const parseResult = WordDefinitionPresetBodySchema.safeParse(preset.body);
    if (!parseResult.success) {
      throw new Error(`Invalid preset body format for word-definition type: ${parseResult.error.message}`);
    }

    const items = parseResult.data;
    let wordsCount = 0;
    let definitionsCount = 0;
    const newWordsAdded: DictionaryAddProcessingItem[] = [];

    const wordsTexts = Array.from(new Set(items.map((item) => item.word.trim().toLowerCase())));
    const existingWordsList = await prisma.word.findMany({
      where: {
        dictionaryId,
        text: { in: wordsTexts },
      },
      include: {
        definitions: {
          include: {
            presets: { select: { id: true } },
          },
        },
        presets: { select: { id: true } },
      },
    });
    const existingWordsMap = new Map<string, (typeof existingWordsList)[0]>();
    for (const w of existingWordsList) {
      existingWordsMap.set(w.text, w);
    }

    // Pass 1: Batch create missing words and link existing words
    const missingWordTexts = wordsTexts.filter((wText) => !existingWordsMap.has(wText));

    if (missingWordTexts.length > 0) {
      const createdWords = await prisma.word.createManyAndReturn({
        data: missingWordTexts.map((text) => ({
          dictionaryId,
          text,
        })),
        select: {
          id: true,
          text: true,
        },
      });

      wordsCount += createdWords.length;

      // Link newly created words to preset
      await prisma.preset.update({
        where: { id: preset.id },
        data: {
          words: {
            connect: createdWords.map((w) => ({ id: w.id })),
          },
        },
      });

      for (const cw of createdWords) {
        existingWordsMap.set(cw.text, {
          id: cw.id,
          text: cw.text,
          definitions: [],
          presets: [{ id: preset.id }],
        } as unknown as (typeof existingWordsList)[0]);

        newWordsAdded.push({
          wordId: cw.id,
          word: cw.text,
          presets: [{ id: preset.id, title: preset.title }],
        });
      }
    }

    // Link already existing words to preset if not already linked
    const existingWordsToLink = existingWordsList.filter(
      (w) => !w.presets.some((p) => p.id === preset.id)
    );
    if (existingWordsToLink.length > 0) {
      await prisma.preset.update({
        where: { id: preset.id },
        data: {
          words: {
            connect: existingWordsToLink.map((w) => ({ id: w.id })),
          },
        },
      });
      for (const w of existingWordsToLink) {
        w.presets.push({ id: preset.id });
      }
    }

    // Publish batch dictionary_add_processing so client knows about words before definitions arrive
    if (newWordsAdded.length > 0) {
      const processingEvent: DictionaryAddProcessingEvent = {
        version: 'v1',
        type: 'dictionary_add_processing',
        words: newWordsAdded,
      };
      await publishEvent(username, processingEvent).catch((err) =>
        console.error('Failed to publish dictionary_add_processing event:', err)
      );
    }

    const dictionary = await prisma.dictionary.findUnique({
      where: { id: dictionaryId },
      select: { baseLanguage: true, targetLanguage: true },
    });
    const baseLang = dictionary?.baseLanguage.toLowerCase() || 'ru';

    // Pass 2: Batch add definitions for each word
    const defsToCreate: { wordId: number; text: string; translation?: string }[] = [];
    const defIdsToLink: number[] = [];

    for (const item of items) {
      const wordText = item.word.trim().toLowerCase();
      const word = existingWordsMap.get(wordText)!;

      for (const def of item.definitions) {
        let defText = '';
        let defTranslation: string | undefined;

        if (typeof def === 'string') {
          defText = def.trim();
        } else if (def && typeof def === 'object') {
          defText = typeof def.text === 'string' ? def.text.trim() : '';
          if (def.translations && typeof def.translations === 'object') {
            defTranslation = def.translations[baseLang] || def.translations[baseLang.toUpperCase()];
          }
          if (!defTranslation && typeof def.translation === 'string') {
            defTranslation = def.translation.trim();
          }
        }

        if (!defText) continue;

        const existingDef = word.definitions.find(
          (d) => d.text.toLowerCase() === defText.toLowerCase()
        );

        if (!existingDef) {
          defsToCreate.push({ wordId: word.id, text: defText, translation: defTranslation });
        } else {
          const isDefLinked = existingDef.presets?.some((p) => p.id === preset.id);
          if (!isDefLinked) {
            defIdsToLink.push(existingDef.id);
            existingDef.presets = existingDef.presets || [];
            existingDef.presets.push({ id: preset.id });
          }
        }
      }
    }

    if (defsToCreate.length > 0) {
      const createdDefs = await prisma.definition.createManyAndReturn({
        data: defsToCreate.map((d) => ({ wordId: d.wordId, text: d.text })),
        select: {
          id: true,
          text: true,
          wordId: true,
        },
      });

      definitionsCount += createdDefs.length;

      // Link newly created definitions to preset
      await prisma.preset.update({
        where: { id: preset.id },
        data: {
          definitions: {
            connect: createdDefs.map((d) => ({ id: d.id })),
          },
        },
      });

      // Insert translations for definitions that have them
      const translationsToCreate = createdDefs
        .map((cd, index) => {
          const trans = defsToCreate[index]?.translation;
          if (trans) {
            return {
              definitionId: cd.id,
              text: trans,
            };
          }
          return null;
        })
        .filter((t): t is { definitionId: number; text: string } => t !== null);

      if (translationsToCreate.length > 0) {
        await prisma.definitionTranslation.createMany({
          data: translationsToCreate,
          skipDuplicates: true,
        });

        // Group translations by wordId and emit TRANSLATION_ADDED for real-time SSE
        const translationsByWord = new Map<number, { id: number; translation: string }[]>();
        for (const t of translationsToCreate) {
          const createdDef = createdDefs.find((cd) => cd.id === t.definitionId);
          if (createdDef) {
            const list = translationsByWord.get(createdDef.wordId) || [];
            list.push({ id: t.definitionId, translation: t.text });
            translationsByWord.set(createdDef.wordId, list);
          }
        }

        for (const [wordId, defTranslations] of translationsByWord.entries()) {
          const word = Array.from(existingWordsMap.values()).find((w) => w.id === wordId);
          appEvents.emit(Events.TRANSLATION_ADDED, {
            username,
            wordId,
            wordText: word?.text || '',
            definitions: defTranslations,
          });
        }
      }

      for (const newDef of createdDefs) {
        const word = Array.from(existingWordsMap.values()).find((w) => w.id === newDef.wordId);
        if (!word) {
          throw new Error(`Word not found for definition ${newDef.id}`);
        }
        word.definitions.push({
          id: newDef.id,
          text: newDef.text,
          presets: [{ id: preset.id }],
        } as unknown as (typeof existingWordsList)[0]['definitions'][0]);

        appEvents.emit(Events.DEFINITION_ADDED, {
          definitionId: newDef.id,
          definitionText: newDef.text,
          userId,
          username,
          wordId: word.id,
          wordText: word.text,
          totalDefinitions: word.definitions.length,
          dictionaryId,
          presets: [{ id: preset.id, title: preset.title }],
        });
      }
    }

    if (defIdsToLink.length > 0) {
      await prisma.preset.update({
        where: { id: preset.id },
        data: {
          definitions: {
            connect: defIdsToLink.map((id) => ({ id })),
          },
        },
      });
    }

    // Publish dictionaries_sync to update word counter in UI
    try {
      const syncData = await getUserDictionaries(userId);
      const syncEvent: DictionariesSyncMercureEvent = {
        version: 'v1',
        type: 'dictionaries_sync',
        dictionaries: syncData.dictionaries,
        activeDictionaryId: syncData.activeDictionaryId,
      };
      await publishEvent(username, syncEvent);
    } catch (err) {
      console.error('Failed to publish dictionaries_sync event after preset application:', err);
    }

    return {
      success: true,
      wordsCount,
      definitionsCount,
    };
  }
}
