import { vi } from 'vitest';

vi.mock('../core/cache', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    scan: vi.fn().mockResolvedValue(['0', []]),
    on: vi.fn(),
  },
  invalidateKeysByPattern: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../features/add_word/add_word.queue', () => ({
  dictionaryQueue: {
    add: vi.fn().mockResolvedValue({ id: '1' }),
    addBulk: vi.fn().mockResolvedValue([{ id: '1' }]),
    obliterate: vi.fn().mockResolvedValue(undefined),
  },
  queueConnection: {
    on: vi.fn(),
  },
  enqueueFetchDefinitions: vi.fn().mockResolvedValue(undefined),
  enqueueFetchDefinitionsBatch: vi.fn().mockResolvedValue(undefined),
  enqueueFetchTranslations: vi.fn().mockResolvedValue(undefined),
}));
