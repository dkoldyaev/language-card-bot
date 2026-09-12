import { IPresetAdapter } from './preset_adapter.interface';
import { WordDefinitionPresetAdapter } from './word_definition.adapter';

export * from './preset_adapter.interface';
export * from './word_definition.adapter';

const adapters: Record<string, IPresetAdapter> = {
  'word-definition': new WordDefinitionPresetAdapter(),
};

export function getPresetAdapter(type: string): IPresetAdapter {
  const adapter = adapters[type];
  if (!adapter) {
    throw new Error(`Unsupported preset type: "${type}". Supported types: ${Object.keys(adapters).join(', ')}`);
  }
  return adapter;
}
