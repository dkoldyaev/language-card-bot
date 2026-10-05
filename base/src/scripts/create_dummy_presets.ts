import { redisClient } from '../core/cache';
import { invalidatePresetsCache } from '../features/preset/preset.service';
import { prisma } from '../prisma';

async function main() {
  console.log('Creating dummy presets...');

  // Preset 1: A1 English Animals
  await prisma.preset.create({
    data: {
      title: 'Animals (A1)',
      description: 'Basic animals in English for beginners',
      forLanguage: 'en',
      type: 'word-definition',
      body: [
        {
          word: 'dog',
          definitions: [
            {
              text: 'a common animal with four legs, especially kept by people as a pet or to hunt or guard things',
              translation: 'собака',
              tags: ['animal', 'pet'],
              levels: ['A1']
            }
          ]
        },
        {
          word: 'cat',
          definitions: [
            {
              text: 'a small animal with fur, four legs, a tail, and claws, usually kept as a pet',
              translation: 'кошка',
              tags: ['animal', 'pet'],
              levels: ['A1']
            }
          ]
        }
      ]
    }
  });

  // Preset 2: B2 English Business
  await prisma.preset.create({
    data: {
      title: 'Business (B2)',
      description: 'Business terms in English',
      forLanguage: 'en',
      type: 'word-definition',
      body: [
        {
          word: 'negotiation',
          definitions: [
            {
              text: 'the process of discussing something with someone in order to reach an agreement with them',
              translation: 'переговоры',
              tags: ['business', 'communication'],
              levels: ['B2']
            }
          ]
        },
        {
          word: 'revenue',
          definitions: [
            {
              text: 'the income that a government or company receives regularly',
              translation: 'доход',
              tags: ['business', 'finance'],
              levels: ['B1', 'B2']
            }
          ]
        }
      ]
    }
  });

  // Preset 3: A2 Spanish Food
  await prisma.preset.create({
    data: {
      title: 'Comida (A2)',
      description: 'Food items in Spanish',
      forLanguage: 'es',
      type: 'word-definition',
      body: [
        {
          word: 'manzana',
          definitions: [
            {
              text: 'a round fruit with red or green skin and a whitish interior',
              translation: 'яблоко',
              tags: ['food', 'fruit'],
              levels: ['A1', 'A2']
            }
          ]
        }
      ]
    }
  });

  await invalidatePresetsCache();
  console.log('Done!');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await redisClient.quit();
  });
