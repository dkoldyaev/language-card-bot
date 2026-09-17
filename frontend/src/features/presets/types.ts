export interface PresetDefinitionObject {
  text: string;
  translation?: string;
  translations?: Record<string, string>;
}

export type PresetDefinitionItem = string | PresetDefinitionObject;

export interface WordDefinitionPresetItem {
  word: string;
  definitions: PresetDefinitionItem[];
}

export interface PresetItem {
  id: number;
  title: string;
  description?: string | null;
  for_language: string;
  forLanguage?: string;
  type: string;
  body: WordDefinitionPresetItem[] | any;
  createdAt: string;
  updatedAt: string;
}
