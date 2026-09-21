import 'dotenv/config';
import { listPresets } from '../features/preset/preset.service';
import { prisma } from '../prisma';
import { LanguageCode } from '../types/language';

function parseArgs(): { language: LanguageCode | undefined } {
  const args = process.argv.slice(2);
  let language: LanguageCode | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--language=')) {
      language = arg.split('=')[1] as LanguageCode;
    } else if (arg === '--language' || arg === '-l') {
      language = args[++i] as LanguageCode;
    }
  }

  return { language };
}

async function main() {
  const { language } = parseArgs();

  try {
    const presets = await listPresets(language ? { forLanguage: language } : undefined);

    if (presets.length === 0) {
      if (language) {
        console.log(`No presets found for language "${language}".`);
      } else {
        console.log('No presets found.');
      }
      return;
    }

    console.log(`\nFound ${presets.length} preset(s)${language ? ` for language "${language}"` : ''}:`);
    console.table(
      presets.map((p) => {
        const wordsCount = Array.isArray(p.body) ? p.body.length : 0;
        return {
          ID: p.id,
          Title: p.title,
          Language: p.forLanguage,
          Words: wordsCount,
          Type: p.type,
          'Created At': p.createdAt.replace('T', ' ').substring(0, 19),
          Description: p.description || '-',
        };
      })
    );
  } catch (error) {
    console.error('An error occurred while listing presets:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
    process.exit(0);
  }
}

main();
