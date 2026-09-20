import path from 'node:path';
import dotenv from 'dotenv';

// Load service-level .env first, then root .env if running from workspace
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import { z } from 'zod';
import { FreeDictionaryDefiner } from '../adapters/FreeDictionaryDefiner';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { MockDefiner } from '../adapters/MockDefiner';
import { DefinerFactory } from '../core/DefinerFactory';
import { env } from '../core/env';
import type { DefinerAppType, DefinitionItem, IDefiner } from '../core/IDefiner';
import type { LanguageCode } from '../types/language';

function printUsage() {
  console.log(`
Usage:
  npm run test:cli -- [options] [word...]
  npm run definer:cli -- [options] [word...]

Arguments:
  [word...]                     Word or phrase to define (can also use --word or -w)

Options:
  --word, -w <text>             Word or phrase to define
  --language, --lang, -l <lang> Target language of definition (e.g. en, ru, es, fr)
  --app, --source, -a <type>    Definer app/source: 'mistral' | 'gemini' | 'mock' | 'freedictionary' | 'llm'
  --model, -m <model>           Override LLM model name
  --provider, -p <provider>     Override LLM provider ('mistral' | 'gemini' | 'mock')
  --llm-url <url>               Override LLM service URL
  --url, --http [endpoint]      Send HTTP POST to running Definer service instead of direct execution
  --json, --raw                 Output result as raw JSON
  --help, -h                    Show this help message

Examples:
  # Direct test using FreeDictionary
  npm run definer:cli -- --word "ephemeral" --lang en --app freedictionary

  # Direct test using Mistral LLM
  npm run definer:cli -- --word "serendipity" --lang en --app mistral

  # Test running HTTP service
  npm run definer:cli -- --word "take off" --lang en --app mock --http
`);
}

interface ParsedArgs {
  word: string;
  language?: string;
  app: DefinerAppType;
  model?: string;
  provider?: 'mistral' | 'gemini' | 'mock';
  llmUrl?: string;
  httpUrl: string;
  isJson: boolean;
}

function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const positional: string[] = [];
  let word: string | undefined;
  let language: string | undefined;
  let app: string | undefined;
  let model: string | undefined;
  let provider: string | undefined;
  let llmUrl: string | undefined;
  let httpUrl: string | undefined;
  let isJson = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--word' || arg === '-w') {
      word = argv[++i];
    } else if (arg === '--language' || arg === '--lang' || arg === '-l') {
      language = argv[++i];
    } else if (arg === '--app' || arg === '--source' || arg === '-a') {
      app = argv[++i];
    } else if (arg === '--model' || arg === '-m') {
      model = argv[++i];
    } else if (arg === '--provider' || arg === '-p') {
      provider = argv[++i];
    } else if (arg === '--llm-url') {
      llmUrl = argv[++i];
    } else if (arg === '--url') {
      httpUrl = argv[++i];
    } else if (arg === '--http') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        httpUrl = argv[++i];
      } else {
        httpUrl = `http://localhost:${env.PORT}/api/v1/define`;
      }
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

  const resolvedWord = word !== undefined ? word : positional.join(' ');
  const resolvedApp = app !== undefined ? app : process.env.DEFINER_APP_TYPE;
  const resolvedLanguage = language !== undefined ? language : process.env.DEFINER_LANGUAGE;

  const validApps = ['mistral', 'gemini', 'mock', 'freedictionary', 'llm'] as const;
  const validProviders = ['mistral', 'gemini', 'mock'] as const;

  const schema = z.object({
    word: z.string().min(1, 'Word/phrase to define is required (pass as argument or via --word/-w)'),
    language: z.string().min(1, 'Language is required (pass via --lang/-l or DEFINER_LANGUAGE in .env)'),
    app: z.enum(validApps, {
      message: `Invalid app type "${resolvedApp}". Must be one of: ${validApps.join(', ')}`,
    }),
    provider: z.enum(validProviders).optional(),
    model: z.string().optional(),
    llmUrl: z.string().optional(),
    httpUrl: z.string().optional(),
    isJson: z.boolean(),
  });

  const parsed = schema.safeParse({
    word: resolvedWord.trim().length > 0 ? resolvedWord.trim() : undefined,
    language: resolvedLanguage,
    app: resolvedApp,
    provider,
    model,
    llmUrl,
    httpUrl,
    isJson,
  });

  if (!parsed.success) {
    console.error('❌ Validation error:');
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.message}`);
    });
    console.log('\nRun with --help for usage details.');
    process.exit(1);
  }

  return parsed.data as ParsedArgs;
}

async function runHttpTest(args: ParsedArgs): Promise<DefinitionItem[]> {
  const url = args.httpUrl;
  console.log(`📡 Sending HTTP POST to ${url}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language: args.language,
      text: args.word,
      definerApp: args.app,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Definer HTTP service error (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as { definitions?: DefinitionItem[] };
  if (!json.definitions || !Array.isArray(json.definitions)) {
    throw new Error(`Unexpected response format from Definer HTTP service: ${JSON.stringify(json)}`);
  }

  return json.definitions;
}

async function runDirectTest(args: ParsedArgs): Promise<DefinitionItem[]> {
  let definer: IDefiner;

  if (args.app === 'mock') {
    definer = new MockDefiner();
  } else if (args.app === 'freedictionary') {
    definer = new FreeDictionaryDefiner();
  } else if (args.app === 'mistral' || args.app === 'gemini' || args.app === 'llm') {
    const provider = args.provider !== undefined
      ? args.provider
      : args.app === 'llm'
      ? env.LLM_PROVIDER
      : args.app;

    const model = args.model !== undefined ? args.model : env.LLM_MODEL;
    const llmServiceUrl = args.llmUrl !== undefined ? args.llmUrl : env.LLM_SERVICE_URL;

    definer = new LLMAdapter({
      provider,
      model,
      llmServiceUrl,
    });
  } else {
    definer = DefinerFactory.getDefiner(args.app);
  }

  return await definer.define(args.word, args.language as LanguageCode);
}

async function main() {
  const args = parseArgs();

  console.log(`\n🔍 Testing Definer Service`);
  console.log(`────────────────────────────────────────`);
  console.log(`  Word:       ${args.word}`);
  console.log(`  Language:   ${args.language}`);
  console.log(`  Source/App: ${args.app}`);
  if (args.model) console.log(`  Model:      ${args.model}`);
  if (args.provider) console.log(`  Provider:   ${args.provider}`);
  if (args.httpUrl) console.log(`  Endpoint:   ${args.httpUrl}`);
  console.log(`────────────────────────────────────────\n`);

  const startTime = Date.now();

  try {
    const definitions = args.httpUrl
      ? await runHttpTest(args)
      : await runDirectTest(args);

    const elapsedMs = Date.now() - startTime;

    if (args.isJson) {
      console.log(JSON.stringify(definitions, null, 2));
      console.log(`\n⏱️  Elapsed: ${elapsedMs}ms`);
      return;
    }

    console.log(`✨ Found ${definitions.length} definition(s) [${elapsedMs}ms]:\n`);

    if (definitions.length === 0) {
      console.log('  (No definitions returned)');
    } else {
      definitions.forEach((d, index) => {
        const parts: string[] = [];
        if (d.partOfSpeech) parts.push(`\x1b[36m[${d.partOfSpeech}]\x1b[0m`);
        if (d.levels.length > 0) parts.push(`\x1b[33m[${d.levels.join(', ')}]\x1b[0m`);
        if (d.tags.length > 0) parts.push(`\x1b[90m(${d.tags.join(', ')})\x1b[0m`);

        const metaPrefix = parts.length > 0 ? `${parts.join(' ')} ` : '';
        console.log(`  ${index + 1}. ${metaPrefix}${d.text}`);
      });
    }

    console.log('');
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startTime;
    const message = error instanceof Error ? error.message : error;
    console.error(`\n❌ Error after ${elapsedMs}ms:`, message);
    process.exit(1);
  }
}

main();
