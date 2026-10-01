import { ImageGeneratorFactory } from '../core/ImageGeneratorFactory';
import type { ImageProviderType } from '../types/image';

async function main() {
  const args = process.argv.slice(2);
  const provider = (args[0] as ImageProviderType) || 'mock';

  console.log(`Testing Image Generator with provider: ${provider}`);

  const sampleKeywords = [
    ['car part', 'air', 'filter'],
    ['cat', 'pet'],
  ];

  try {
    const generator = ImageGeneratorFactory.getGenerator(provider);
    const results = await generator.generate(sampleKeywords);
    console.log('Results:');
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error during generation:', error);
    process.exit(1);
  }
}

main();
