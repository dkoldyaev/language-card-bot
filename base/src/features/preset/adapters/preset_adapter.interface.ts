export interface PresetApplyContext {
  userId: number;
  username: string;
  dictionaryId: number;
  preset: {
    id: number;
    title: string;
    forLanguage: string;
    body: unknown;
    type: string;
  };
}

export interface PresetAdapterResult {
  success: boolean;
  wordsCount: number;
  definitionsCount: number;
}

export interface IPresetAdapter {
  readonly type: string;
  apply(context: PresetApplyContext): Promise<PresetAdapterResult>;
}
