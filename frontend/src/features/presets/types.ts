export interface WordDefinitionPresetItem {
  word: string;
  definitions: string[];
}

export interface PresetItem {
  id: number;
  title: string;
  for_language: string;
  forLanguage?: string;
  type: string;
  body: WordDefinitionPresetItem[] | any;
  createdAt: string;
  updatedAt: string;
}
