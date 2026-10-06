import type { Job } from 'bullmq';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as userFeatures from '../user_features/user_features.service';
import { processDefinitionImage } from './image.service';
import { imageWorker } from './image.worker';

vi.mock('../user_features/user_features.service', () => ({
  getUserFeatureFlags: vi.fn(),
}));
vi.mock('./image.service', () => ({
  processDefinitionImage: vi.fn(),
}));

describe('imageWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not call the generator when card images are disabled', async () => {
    vi.mocked(userFeatures.getUserFeatureFlags).mockResolvedValue({
      multipleDictionaries: false,
      cardImages: false,
    });

    const processFn = (imageWorker as unknown as { processFn: (job: Job) => Promise<void> }).processFn;
    await processFn({
      name: 'fetchImages',
      data: {
        definitionId: 101,
        definitionText: 'a round edible fruit',
        userId: 5,
        wordText: 'apple',
      },
    } as Job);

    expect(processDefinitionImage).not.toHaveBeenCalled();
  });
});
