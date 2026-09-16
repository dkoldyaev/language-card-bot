import { IPresetAdapter, PresetApplyContext, PresetAdapterResult } from './preset_adapter.interface';
import { WordDefinitionPresetBodySchema } from '../preset.type';
import { prisma } from '../../../prisma';
import { publishEvent } from '../../event_bus/event_bus.service';
import { appEvents, Events } from '../../../core/events';
import { getUserDictionaries } from '../../dictionaries/dictionaries.service';
import { DictionariesSyncMercureEvent, DictionaryAddProcessingEvent, DictionaryAddProcessingItem } from '../../event_bus/event_bus.type';

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
        } as any);

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

    // Pass 2: Batch add definitions for each word
    const defsToCreate: { wordId: number; text: string }[] = [];
    const defIdsToLink: number[] = [];

    for (const item of items) {
      const wordText = item.word.trim().toLowerCase();
      const word = existingWordsMap.get(wordText)!;

      for (const def of item.definitions) {
        const defText = typeof def === 'string' ? def.trim() : def.text.trim();
        const existingDef = word.definitions.find(
          (d) => d.text.toLowerCase() === defText.toLowerCase()
        );

        if (!existingDef) {
          defsToCreate.push({ wordId: word.id, text: defText });
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
        data: defsToCreate,
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

      for (const newDef of createdDefs) {
        const word = Array.from(existingWordsMap.values()).find((w) => w.id === newDef.wordId)!;
        word.definitions.push({
          id: newDef.id,
          text: newDef.text,
          presets: [{ id: preset.id }],
        } as any);

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
