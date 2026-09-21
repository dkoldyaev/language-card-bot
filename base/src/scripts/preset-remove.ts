import 'dotenv/config';
import type { PresetDto } from '../features/preset/preset.type';
import { generatePreset } from '../features/preset/preset_generator.service';
import { prisma } from '../prisma';
import type { LanguageCode } from '../types/language';

interface CliParams {
  languages?: LanguageCode[];
  presetIds?: number[];
  levels?: string[];
  dryRun?: boolean;
}

function printUsage() {
  console.log(`
Usage:
  npm run preset:remove -- <options>

At least one of the following is required:
  --language, -l <lang>         Language code(s) (e.g. en, es, fr, de, ru).
                                Can be specified multiple times (--language en --language fr)
                                or comma-separated (--language en,fr).
  --preset-ids <id>             IDs of existing presets to remove (can be specified multiple times).

Optional:
  --level <levels>              CEFR level(s) (e.g. A0, A1, A2, B1, B2, C1, C2).
                                Can be specified multiple times (--level B1 --level B2)
                                or comma-separated (--level B1,B2).
                                (Only used when --language is specified)
  --dry-run, -d                 Dry run mode (don't actually remove presets, just show what would be removed).

Examples:
  npm run preset:remove -- --language en
  npm run preset:remove -- --language en --level B1,B2
  npm run preset:remove -- --language es --preset-ids 1,2,3
  npm run preset:remove -- --preset-ids 1
  npm run preset:remove -- --language fr --dry-run
`);
}

function parseCliArgs(): CliParams {
  const args = process.argv.slice(2);
  const rawLanguages: LanguageCode[] = [];
  let presetIds: number[] = [];
  const rawLevels: string[] = [];
  let dryRun = false;

  const addLanguages = (val: string) => {
    val.split(',').forEach((s) => {
      const trimmed = s.trim().toLowerCase();
      if (trimmed) rawLanguages.push(trimmed as LanguageCode);
    });
  };

  const addLevels = (val: string) => {
    val.split(',').forEach((s) => {
      const trimmed = s.trim().toUpperCase();
      if (trimmed) rawLevels.push(trimmed);
    });
  };

  const addPresetIds = (val: string) => {
    val.split(',').forEach((s) => {
      const parsed = parseInt(s.trim(), 10);
      if (!Number.isNaN(parsed) && parsed > 0) {
        presetIds.push(parsed);
      }
    });
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    } else if (arg.startsWith('--language=')) {
      addLanguages(arg.split('=')[1]);
    } else if (arg.startsWith('-l=')) {
      addLanguages(arg.split('=')[1]);
    } else if (arg === '--language' || arg === '-l') {
      const val = args[++i];
      if (val) addLanguages(val);
    } else if (arg.startsWith('--preset-id=')) {
      addPresetIds(arg.split('=')[1]);
    } else if (arg === '--preset-id') {
      const val = args[++i];
      if (val) addPresetIds(val);
    } else if (arg.startsWith('--level=')) {
      addLevels(arg.split('=')[1]);
    } else if (arg === '--level') {
      const val = args[++i];
      if (val) addLevels(val);
    } else if (arg === '--dry-run' || arg === '-d') {
      dryRun = true;
    }
  }

  const languages = Array.from(new Set(rawLanguages));
  const levels = Array.from(new Set(rawLevels));

  return {
    languages,
    presetIds,
    levels,
    dryRun
  };
}

async function main() {
  const params = parseCliArgs();

  try {
    const whereClause: any = {
      ...(params.languages?.length ? {forLanguage: {
        in: params.languages,
      }} : {}),
      ...(params.presetIds?.length ? {id: {
        in: params.presetIds,
      }} : {}),
    };

    if (!params.languages?.length && !params.presetIds?.length) {
      console.error('Error: You must specify either --language or --preset-ids');
      printUsage();
      await prisma.$disconnect();
      process.exit(1);
    }

    const presets = await prisma.preset.findMany({
      where: whereClause,
    });

    if (presets.length === 0) {
      console.log('No presets found matching the criteria.');
      await prisma.$disconnect();
      process.exit(0);
    }

    await Promise.all(presets.map((p) => {
      if (params.dryRun) {
        console.log(`[DRY RUN] Would remove preset: ${p.id}`);
        return Promise.resolve();
      }
      console.log(`Removing preset: ${p.id}`);
      return prisma.preset.delete({ where: { id: p.id } })
    }));
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('\nPreset operation failed:', msg);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }

  process.exit(0);
}

main();
