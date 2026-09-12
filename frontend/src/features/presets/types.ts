export interface WordDefinitionPresetItem {
  word: string;
  definitions: string[];
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
