import { IDefiner } from '../core/IDefiner';

export class FreeDictionaryDefiner implements IDefiner {
  async define(text: string, language: string): Promise<string[]> {
    const entry = encodeURIComponent(text.trim().toLowerCase());
    const url = `https://freedictionaryapi.com/api/v1/entries/${language}/${entry}`;

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch from FreeDictionary API: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const definitions: string[] = [];

      if (data.entries && Array.isArray(data.entries)) {
        for (const dictEntry of data.entries) {
          if (dictEntry.senses && Array.isArray(dictEntry.senses)) {
            for (const sense of dictEntry.senses) {
              if (sense.definition) {
                definitions.push(sense.definition);
              }
            }
          }
        }
      }

      return definitions;
    } catch (error) {
      console.error('FreeDictionary API error:', error);
      return [];
    }
  }
}
