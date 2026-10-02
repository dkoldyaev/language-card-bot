import path from 'node:path';
import dotenv from 'dotenv';

// Load base .env and root .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import { z } from 'zod';
import { env } from '../core/env';
import { prisma } from '../prisma';
import {
  extractKeywordsFromDefinition,
  normalizeKeywordsText,
} from '../features/image/image.service';

function printUsage() {
  console.log(`
Usage:
  npm run image:cli -- [options] [definition...]
  npm run test:cli:image -- [options] [definition...]

Arguments:
  [definition...]               Text of the definition to search images for

Options:
  --word, -w <word>                     Target word (guaranteed to be the FIRST keyword)
  --definition, -d, --text, -t <text>   Text of the definition
  --provider, -p <provider>             Image provider: 'mock' | 'unsplash' | 'pexels' | 'pixabay' | 'wikimedia'
  --keywords, -k <keywords>             Manually specify keywords (e.g. "car, automobile")
  --llm-provider <provider>             LLM provider for keywords: 'mock' | 'mistral' | 'gemini'
  --llm-model, -m <model>               LLM model name
  --save, -s                            Save newly fetched images to the database
  --urls-only                           Output only image URLs (one per line)
  --json                                Output result as JSON
  --help, -h                            Show this help message

Examples:
  # Simple test with definition text
  npm run image:cli -- "an edible fruit produced by an apple tree"

  # Test with explicit provider
  npm run image:cli -- "a large four-wheeled motor vehicle" --provider unsplash

  # Output URLs only
  npm run image:cli -- "a domestic mammal that provides milk" --urls-only
`);
}

const ValidProviders = ['mock', 'unsplash', 'pexels', 'pixabay', 'wikimedia'] as const;
type ImageProviderType = typeof ValidProviders[number];

const ValidLLMProviders = ['mock', 'mistral', 'gemini'] as const;
type LLMProviderType = typeof ValidLLMProviders[number];

interface ParsedArgs {
  definitionText: string;
  wordText?: string;
  provider?: ImageProviderType;
  keywords?: string[];
  llmProvider?: LLMProviderType;
  llmModel?: string;
  save: boolean;
  urlsOnly: boolean;
  isJson: boolean;
}

function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const positional: string[] = [];
  let definitionText: string | undefined;
  let wordText: string | undefined;
  let provider: string | undefined;
  let rawKeywords: string | undefined;
  let llmProvider: string | undefined;
  let llmModel: string | undefined;
  let save = false;
  let urlsOnly = false;
  let isJson = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--word' || arg === '-w') {
      wordText = argv[++i];
    } else if (arg.startsWith('--word=')) {
      wordText = arg.split('=')[1];
    } else if (arg === '--definition' || arg === '-d' || arg === '--text' || arg === '-t') {
      definitionText = argv[++i];
    } else if (arg.startsWith('--definition=')) {
      definitionText = arg.split('=')[1];
    } else if (arg.startsWith('--text=')) {
      definitionText = arg.split('=')[1];
    } else if (arg === '--provider' || arg === '-p') {
      provider = argv[++i];
    } else if (arg.startsWith('--provider=')) {
      provider = arg.split('=')[1];
    } else if (arg === '--keywords' || arg === '-k') {
      rawKeywords = argv[++i];
    } else if (arg.startsWith('--keywords=')) {
      rawKeywords = arg.split('=')[1];
    } else if (arg === '--llm-provider') {
      llmProvider = argv[++i];
    } else if (arg.startsWith('--llm-provider=')) {
      llmProvider = arg.split('=')[1];
    } else if (arg === '--llm-model' || arg === '-m') {
      llmModel = argv[++i];
    } else if (arg.startsWith('--llm-model=')) {
      llmModel = arg.split('=')[1];
    } else if (arg === '--save' || arg === '-s') {
      save = true;
    } else if (arg === '--urls-only') {
      urlsOnly = true;
    } else if (arg === '--json' || arg === '--raw') {
      isJson = true;
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    } else {
      console.error(`Unknown option: ${arg}`);
      printUsage();
      process.exit(1);
    }
  }

  const resolvedText = definitionText !== undefined ? definitionText : positional.join(' ');

  const schema = z.object({
    definitionText: z.string().min(1, 'Definition text is required (pass as argument or via --definition/-d)'),
    provider: z.enum(ValidProviders).optional(),
    llmProvider: z.enum(ValidLLMProviders).optional(),
    llmModel: z.string().optional(),
    save: z.boolean(),
    urlsOnly: z.boolean(),
    isJson: z.boolean(),
  });

  const parsed = schema.safeParse({
    definitionText: resolvedText.trim().length > 0 ? resolvedText.trim() : undefined,
    provider,
    llmProvider,
    llmModel,
    save,
    urlsOnly,
    isJson,
  });

  const resolvedWord = wordText ? wordText.trim() : undefined;

  if (!parsed.success) {
    console.error('❌ Validation error:');
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.message}`);
    });
    console.log('\nRun with --help for usage details.');
    process.exit(1);
  }

  const keywords = rawKeywords !== undefined ? rawKeywords.split(',').map(k => k.trim()).filter(Boolean) : undefined;

  return {
    ...parsed.data,
    wordText: resolvedWord,
    keywords,
  };
}

async function extractKeywords(
  definitionText: string,
  wordText: string | undefined,
  args: ParsedArgs
): Promise<string[][]> {
  if (args.keywords && args.keywords.length > 0) {
    return [args.keywords];
  }

  try {
    return await extractKeywordsFromDefinition(definitionText, wordText);
  } catch (err: any) {
    const isNetworkError =
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.message?.includes('fetch failed') ||
      err?.message?.includes('ECONNREFUSED');

    if (isNetworkError) {
      if (!args.urlsOnly && !args.isJson) {
        console.warn(`⚠️  LLM HTTP service (${env.LLM_API_URL}) is not running.`);
      }
      return [];
    }
    throw err;
  }
}

async function fetchImages(
  keywordSets: string[][],
  provider: ImageProviderType,
  args: ParsedArgs
): Promise<string[][]> {
  try {
    const response = await fetch(env.IMAGE_GENERATOR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        keywords: keywordSets,
        provider,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Image Generator API error (${response.status}): ${errorText}`);
    }

    const urls = (await response.json()) as string[][];
    return Array.isArray(urls) ? urls : [];
  } catch (err: any) {
    const isNetworkError =
      err?.cause?.code === 'ECONNREFUSED' ||
      err?.message?.includes('fetch failed') ||
      err?.message?.includes('ECONNREFUSED');

    if (isNetworkError) {
      if (!args.urlsOnly && !args.isJson) {
        console.warn(`⚠️  Image Generator HTTP service (${env.IMAGE_GENERATOR_API_URL}) is not running.`);
        console.warn('   Generating mock image URL for test verification.');
      }
      return keywordSets.map(ks => [`https://mockimage.tw/photo/640x480/282c34/61dafb/${encodeURIComponent(ks.join(' '))}`]);
    }
    throw err;
  }
}

async function main() {
  const args = parseArgs();
  const provider = args.provider !== undefined ? args.provider : env.IMAGE_GENERATOR_PROVIDER;

  // 1. Extract keywords
  let keywordSets = await extractKeywords(args.definitionText, args.wordText, args);
  
  const normalizedTexts = keywordSets.map(normalizeKeywordsText);
  const rawJoinedTexts = keywordSets.map(ks => ks.join(' '));

  let fromDb = false;
  let source: string = provider;
  let imageUrls: string[] = [];

  // 2. Check if DB already has images with same keywords
  let existingImages: Array<{ id: number; url: string; source: string; text: string }> = [];
  try {
    existingImages = await prisma.image.findMany({
      where: {
        OR: [
          { text: { in: normalizedTexts } },
          { text: { in: rawJoinedTexts } },
        ],
      },
      select: {
        id: true,
        url: true,
        source: true,
        text: true,
      },
    });
  } catch (dbErr: any) {
    if (!args.urlsOnly && !args.isJson) {
      console.warn(`⚠️  Database query skipped: ${dbErr.message}`);
    }
  }

  if (existingImages.length > 0) {
    fromDb = true;
    source = `${existingImages[0].source} (database cached)`;
    imageUrls = existingImages.map((img) => img.url);
  } else {
    // 3. Fetch from Image Generator
    const imageUrlGroups = await fetchImages(keywordSets, provider, args);

    if (args.save && imageUrlGroups.length > 0) {
      for (let i = 0; i < imageUrlGroups.length; i++) {
        const text = normalizeKeywordsText(keywordSets[i] || []);
        const urls = imageUrlGroups[i];
        if (!Array.isArray(urls)) continue;
        for (const url of urls) {
          try {
            await prisma.image.create({
              data: {
                url,
                source: provider,
                text,
              },
            });
          } catch {
            // ignore duplicate in save
          }
        }
      }
    }
    imageUrls = imageUrlGroups.flat();
  }

  // 4. Output results
  if (args.isJson) {
    console.log(
      JSON.stringify(
        {
          definition: args.definitionText,
          keywords: keywordSets,
          fromDb,
          source,
          urls: imageUrls,
        },
        null,
        2
      )
    );
  } else if (args.urlsOnly) {
    for (const url of imageUrls) {
      console.log(url);
    }
  } else {
    console.log('\n========================================');
    console.log(`Definition: "${args.definitionText}"`);
    console.log(`Keywords:   ${JSON.stringify(keywordSets)}`);
    console.log(`Source:     ${source}`);
    console.log(`From DB:    ${fromDb ? 'yes (cached)' : 'no (fetched)'}`);
    console.log(`Images (${imageUrls.length}):`);
    imageUrls.forEach((url, i) => {
      console.log(`  ${i + 1}. ${url}`);
    });
    console.log('========================================\n');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error executing definition image test:', err);
  process.exit(1);
});
