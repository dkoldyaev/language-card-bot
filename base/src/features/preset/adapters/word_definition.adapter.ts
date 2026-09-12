import { IPresetAdapter, PresetApplyContext, PresetAdapterResult } from './preset_adapter.interface';
import { WordDefinitionPresetBodySchema } from '../preset.type';
import { prisma } from '../../../prisma';
import { publishEvent } from '../../event_bus/event_bus.service';
import { appEvents, Events } from '../../../core/events';
import { getUserDictionaries } from '../../dictionaries/dictionaries.service';
import { DictionariesSyncMercureEvent, DictionaryAddProcessingEvent } from '../../event_bus/event_bus.type';

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

    for (const item of items) {
      const wordText = item.word.trim().toLowerCase();

      // Find or create word in this dictionary
      let word = await prisma.word.findUnique({
        where: {
          dictionaryId_text: {
            dictionaryId,
            text: wordText,
          },
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

      let isNewWord = false;
      if (!word) {
        word = await prisma.word.create({
          data: {
            dictionaryId,
            text: wordText,
            presets: {
              connect: { id: preset.id },
            },
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
        isNewWord = true;
        wordsCount++;

        // Notify via Mercure that word was added to dictionary
        const processingEvent: DictionaryAddProcessingEvent = {
          version: 'v1',
          type: 'dictionary_add_processing',
          wordId: word.id,
          word: word.text,
          presets: [{ id: preset.id, title: preset.title }],
        };
        await publishEvent(username, processingEvent).catch((err) =>
          console.error('Failed to publish dictionary_add_processing event:', err)
        );
      } else {
        // If word already existed in dictionary, link it to preset if not already linked
        const isWordLinked = word.presets.some((p) => p.id === preset.id);
        if (!isWordLinked) {
          word = await prisma.word.update({
            where: { id: word.id },
            data: {
              presets: {
                connect: { id: preset.id },
              },
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
        }
      }

      // Add definitions
      for (const def of item.definitions) {
        const defText = typeof def === 'string' ? def.trim() : def.text.trim();
        const existingDef = word.definitions.find(
          (d) => d.text.toLowerCase() === defText.toLowerCase()
        );

        if (!existingDef) {
          const newDef = await prisma.definition.create({
            data: {
              wordId: word.id,
              text: defText,
              presets: {
                connect: { id: preset.id },
              },
            },
            include: {
              presets: { select: { id: true } },
            },
          });

          word.definitions.push(newDef);
          definitionsCount++;

          // Emit event to trigger Mercure dictionary_add_definitions_received & async translation loading
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
        } else {
          // If definition already existed in dictionary, link it to preset if not already linked
          const isDefLinked = existingDef.presets?.some((p) => p.id === preset.id);
          if (!isDefLinked) {
            await prisma.definition.update({
              where: { id: existingDef.id },
              data: {
                presets: {
                  connect: { id: preset.id },
                },
              },
            });
          }
        }
      }
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
