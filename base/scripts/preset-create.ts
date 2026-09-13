import 'dotenv/config';
import { prisma } from '../src/prisma';
import { generatePreset } from '../src/features/preset/preset_generator.service';

interface CliParams {
  language?: string;
  presetId?: number;
  wordsCount: number;
  levels?: string[];
  title?: string;
  description?: string;
}

function printUsage() {
  console.log(`
Usage:
  npm run preset:create -- --language <codeOrName> [options]

Required:
  --language <lang>         Language code (e.g. en, es, fr, de, ru)

Optional:
  --preset-id <id>          ID of an existing preset to add/update words
  --words-count <number>    Target number of words (default: 100)
  --level <levels>          Comma-separated CEFR levels (e.g. A0, A1, B2)
  --title <title>           Preset title (default auto-generated)
  --description <desc>      Preset description

Examples:
  npm run preset:create -- --language en --level A1,A2 --words-count 50
  npm run preset:create -- --language es --preset-id 1 --words-count 20
`);
}

function parseCliArgs(): CliParams {
  const args = process.argv.slice(2);
  let language: string | undefined;
  let presetId: number | undefined;
  let wordsCount = 100;
  let levels: string[] | undefined;
  let title: string | undefined;
  let description: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith('--language=')) {
      language = arg.split('=')[1];
    } else if (arg === '--language' || arg === '-l') {
      language = args[++i];
    } else if (arg.startsWith('--preset-id=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(val)) presetId = val;
    } else if (arg === '--preset-id') {
      const val = parseInt(args[++i], 10);
      if (!Number.isNaN(val)) presetId = val;
    } else if (arg.startsWith('--words-count=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!Number.isNaN(val) && val > 0) wordsCount = val;
    } else if (arg === '--words-count' || arg === '-w') {
      const val = parseInt(args[++i], 10);
      if (!Number.isNaN(val) && val > 0) wordsCount = val;
    } else if (arg.startsWith('--level=')) {
      levels = arg.split('=')[1].split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg === '--level') {
      levels = args[++i]?.split(',').map((s) => s.trim()).filter(Boolean);
    } else if (arg.startsWith('--title=')) {
      title = arg.split('=')[1];
    } else if (arg === '--title') {
      title = args[++i];
    } else if (arg.startsWith('--description=')) {
      description = arg.split('=')[1];
    } else if (arg === '--description') {
      description = args[++i];
    }
  }

  return {
    language,
    presetId,
    wordsCount,
    levels,
    title,
    description,
  };
}

async function main() {
  const params = parseCliArgs();

  if (!params.language) {
    console.error('Error: --language is required.');
    printUsage();
    process.exit(1);
  }

  try {
    const result = await generatePreset({
      language: params.language,
      presetId: params.presetId,
      wordsCount: params.wordsCount,
      levels: params.levels,
      title: params.title,
      description: params.description,
      onProgress: (msg) => console.log(msg),
    });

    console.log('\nPreset operation completed successfully!');
    console.log('-------------------------------------------');
    console.log(`ID:          ${result.id}`);
    console.log(`Title:       ${result.title}`);
    console.log(`Language:    ${result.forLanguage}`);
    console.log(`Total Words: ${Array.isArray(result.body) ? result.body.length : 0}`);
    console.log(`Type:        ${result.type}`);
    if (result.description) {
      console.log(`Description: ${result.description}`);
    }
  } catch (error: any) {
    console.error('\nPreset creation failed:', error.message || error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
