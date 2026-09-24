import useStore, { type DictionaryDefinition, type DictionaryItem, type DictionaryWord } from '../../../store/useStore';

interface FreeDictionaryResponse {
  word: string;
  meanings: {
    definitions: {
      definition: string;
    }[];
  }[];
}

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
  };
}

export const addGuestWordsLocally = async (words: string[], targetDict: DictionaryItem) => {
  const store = useStore.getState();
  const currentWords = store.dictionary;
  
  let wordCounter = currentWords.length > 0 ? Math.max(...currentWords.map((w) => w.id)) + 1 : 1;
  let defCounter = 1;
  // Get max definition id to prevent collisions if definitions already exist
  for (const word of currentWords) {
    for (const def of word.definitions) {
      if (def.id >= defCounter) {
        defCounter = def.id + 1;
      }
      if (def.translation && def.translation.id >= defCounter) {
        defCounter = def.translation.id + 1;
      }
    }
  }

  const newWords: DictionaryWord[] = [];

  for (const wordText of words) {
    const wordId = wordCounter++;
    const newWord: DictionaryWord = {
      id: wordId,
      text: wordText,
      definitions: [],
    };

    store.addDictionaryWords([newWord]);

    try {
      // 1. Fetch definitions
      const fdUrl = `https://api.dictionaryapi.dev/api/v2/entries/${targetDict.targetLanguage}/${encodeURIComponent(wordText)}`;
      const fdRes = await fetch(fdUrl);
      
      const definitionsToTranslate: string[] = [];
      if (fdRes.ok) {
        const fdData: FreeDictionaryResponse[] = await fdRes.json();
        if (fdData && fdData.length > 0) {
          // Extract ALL definitions
          for (const meaning of fdData[0].meanings) {
            for (const def of meaning.definitions) {
              definitionsToTranslate.push(def.definition);
            }
          }
        }
      }

      // If no definitions were found, the word remains with 0 definitions
      if (definitionsToTranslate.length === 0) {
        continue;
      }

      // 2. Fetch translations
      const defs: DictionaryDefinition[] = [];
      const isTargetLangEnglish = targetDict.targetLanguage.toLowerCase() === 'en';
      const isBaseLangEnglish = targetDict.baseLanguage.toLowerCase() === 'en';

      for (const engDefText of definitionsToTranslate) {
        let finalDefText = engDefText;
        let transText: string | null = null;
        
        // Helper to translate from English to a target language
        const translate = async (toLang: string) => {
          try {
            const mmUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(engDefText)}&langpair=en|${toLang}`;
            const mmRes = await fetch(mmUrl);
            if (mmRes.ok) {
              const mmData: MyMemoryResponse = await mmRes.json();
              if (mmData.responseData?.translatedText) {
                return mmData.responseData.translatedText;
              }
            }
          } catch (e) {
            console.error(`Failed to fetch translation from MyMemory for ${toLang}:`, e);
          }
          return null;
        };

        if (!isTargetLangEnglish) {
          const translatedDef = await translate(targetDict.targetLanguage);
          if (translatedDef) {
            finalDefText = translatedDef;
          }
        }

        if (!isBaseLangEnglish) {
          const translatedTrans = await translate(targetDict.baseLanguage);
          if (translatedTrans) {
            transText = translatedTrans;
          }
        } else if (!isTargetLangEnglish) {
          // If base language is English and target is not, the translation is the original English text
          transText = engDefText;
        }

        defs.push({
          id: defCounter++,
          text: finalDefText,
          translation: transText ? {
            id: defCounter++,
            text: transText,
          } : null,
        });
      }

      newWord.definitions = defs;
      newWords.push(newWord);

      store.setDictionaryDefinitionsBatch([{
        wordId: wordId,
        word: wordText,
        definitions: defs.map(d => ({
          id: d.id,
          text: d.text,
          translation: d.translation === null ? undefined : d.translation,
        }))
      }]);

      const translationsToUpdate = defs.flatMap(d => 
        d.translation ? [{ id: d.id, translation: d.translation.text }] : []
      );
        
      if (translationsToUpdate.length > 0) {
        store.updateDictionaryTranslationsBatch([{
          wordId: wordId,
          definitions: translationsToUpdate
        }]);
      }

    } catch (err) {
      console.error(`Failed to fetch dictionary data for guest word: ${wordText}`, err);
    }
  }

  store.updateDictionaryItem(targetDict.id, { wordCount: store.dictionary.length });
};
