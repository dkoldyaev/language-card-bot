import path from 'node:path';
import dotenv from 'dotenv';

// Load service-level .env first, then root .env if running from workspace
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import { z } from 'zod';
import { GoogleTranslator } from '../adapters/GoogleTranslator';
import { LaratranslateTranslator } from '../adapters/LaratranslateTranslator';
import { LLMAdapter } from '../adapters/LLMAdapter';
import { MockTranslator } from '../adapters/MockTranslator';
import { env } from '../core/env';
import type { ITranslator, TranslatorAppType } from '../core/ITranslator';
import { TranslatorFactory } from '../core/TranslatorFactory';
import { type LanguageCode, LanguageCodeSchema } from '../types/language';

function printUsage() {
  console.log(`
Usage:
  npm run test:cli -- [options] [texts...]
  npm run translator:cli -- [options] [texts...]

Arguments:
  [texts...]                            Texts to translate (or use --text/-t)

Options:
  --text, -t <text>                     Text(s) to translate (can specify multiple times or comma-separated)
  --from, --source-lang, -s <lang>      Source language code (e.g. en, es, ru)
  --to, --target-lang, -l, -d <lang>    Target language code (e.g. ru, es, fr, en)
  --app, --source, -a <type>            Translator app/source: 'googletranslate' | 'mock' | 'laratranslate' | 'llm' | 'mistral' | 'gemini'
  --model, -m <model>                   Override LLM model name (when using llm/mistral/gemini)
  --provider, -p <provider>             Override LLM provider ('mistral' | 'gemini' | 'mock')
  --llm-url <url>                       Override LLM service URL
  --url, --http [endpoint]              Send HTTP POST to running Translator service instead of direct execution
  --json, --raw                         Output result as raw JSON
  --help, -h                            Show this help message

Examples:
  # Direct test using Lara Translate
  npm run translator:cli -- --from en --to ru --app laratranslate --text "Hello world"

  # Direct test translating multiple texts using Mistral LLM
  npm run translator:cli -- --from en --to es --app mistral -t "Good morning" -t "How are you?"

  # Test running HTTP service
  npm run translator:cli -- --from en --to ru --app mock --text "test" --http
`);
}

interface ParsedArgs {
  texts: string[];
  sourceLanguage: LanguageCode;
  targetLanguage: LanguageCode;
  app: TranslatorAppType;
  model?: string;
  provider?: 'mistral' | 'gemini' | 'mock';
  llmUrl?: string;
  httpUrl?: string;
  isJson: boolean;
}

function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const rawTexts: string[] = [];
  const positional: string[] = [];
  let sourceLanguage: string | undefined;
  let targetLanguage: string | undefined;
  let app: string | undefined;
  let model: string | undefined;
  let provider: string | undefined;
  let llmUrl: string | undefined;
  let httpUrl: string | undefined;
  let isJson = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--text' || arg === '-t') {
      const val = argv[++i];
      if (val) {
        const trimmed = val.trim();
        if (trimmed) rawTexts.push(trimmed);
      }
    } else if (arg === '--from' || arg === '--source-lang' || arg === '-s') {
      sourceLanguage = argv[++i];
    } else if (arg === '--to' || arg === '--target-lang' || arg === '-l' || arg === '-d') {
      targetLanguage = argv[++i];
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
        httpUrl = `http://localhost:${env.PORT}/api/v1/translate`;
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

  if (rawTexts.length === 0 && positional.length > 0) {
    rawTexts.push(positional.join(' '));
  }

  const resolvedApp = app !== undefined ? app : (provider !== undefined ? provider : env.APP_TYPE);
  const resolvedSourceLang = sourceLanguage;
  const resolvedTargetLang = targetLanguage;

  const validApps = ['googletranslate', 'mock', 'laratranslate', 'llm', 'mistral', 'gemini'] as const;
  const validProviders = ['mistral', 'gemini', 'mock'] as const;

  const schema = z.object({
    texts: z.array(z.string().min(1)).min(1, 'At least one text to translate is required (pass via --text/-t or arguments)'),
    sourceLanguage: LanguageCodeSchema,
    targetLanguage: LanguageCodeSchema,
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
    texts: rawTexts,
    sourceLanguage: resolvedSourceLang,
    targetLanguage: resolvedTargetLang,
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

  return parsed.data;
}

async function runHttpTest(args: ParsedArgs): Promise<string[]> {
  const url = args.httpUrl;
  if (!url) {
    throw new Error('HTTP URL is not defined');
  }
  console.log(`📡 Sending HTTP POST to ${url}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sourceLanguage: args.sourceLanguage,
      targetLanguage: args.targetLanguage,
      texts: args.texts,
      translatorApp: args.app,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Translator HTTP service error (${response.status}): ${errorText}`);
  }

  const schema = z.object({ translations: z.array(z.any()).optional() });
  const jsonParse = schema.safeParse(await response.json());
  if (!jsonParse.success) {
    throw new Error(`Invalid response format from Translator HTTP service: ${jsonParse.error.message}`);
  }
  const json = jsonParse.data;
  if (!json.translations || !Array.isArray(json.translations)) {
    throw new Error(`Unexpected response format from Translator HTTP service: ${JSON.stringify(json)}`);
  }

  return json.translations;
}

async function runDirectTest(args: ParsedArgs): Promise<string[]> {
  let translator: ITranslator;

  if (args.app === 'mock') {
    translator = new MockTranslator();
  } else if (args.app === 'googletranslate') {
    translator = new GoogleTranslator();
  } else if (args.app === 'laratranslate') {
    translator = new LaratranslateTranslator();
  } else if (args.app === 'mistral' || args.app === 'gemini' || args.app === 'llm') {
    const provider = args.provider !== undefined
      ? args.provider
      : args.app === 'llm'
      ? env.LLM_PROVIDER
      : args.app;

    const model = args.model !== undefined ? args.model : env.LLM_MODEL;
    const llmServiceUrl = args.llmUrl !== undefined ? args.llmUrl : env.LLM_SERVICE_URL;

    translator = new LLMAdapter({
      provider,
      model,
      llmServiceUrl,
    });
  } else {
    translator = TranslatorFactory.getTranslator(args.app);
  }

  return await translator.translate(args.texts, args.sourceLanguage, args.targetLanguage);
}

async function main() {
  const args = parseArgs();

  console.log(`\n🌐 Testing Translator Service`);
  console.log(`────────────────────────────────────────`);
  console.log(`  Source Lang: ${args.sourceLanguage}`);
  console.log(`  Target Lang: ${args.targetLanguage}`);
  console.log(`  Source/App:  ${args.app}`);
  console.log(`  Texts count: ${args.texts.length}`);
  if (args.model) console.log(`  Model:       ${args.model}`);
  if (args.provider) console.log(`  Provider:    ${args.provider}`);
  if (args.httpUrl) console.log(`  Endpoint:    ${args.httpUrl}`);
  console.log(`────────────────────────────────────────\n`);

  const startTime = Date.now();

  try {
    const translations = args.httpUrl
      ? await runHttpTest(args)
      : await runDirectTest(args);

    const elapsedMs = Date.now() - startTime;

    if (args.isJson) {
      const output = args.texts.map((text, idx) => ({
        original: text,
        translation: translations[idx] !== undefined ? translations[idx] : null,
      }));
      console.log(JSON.stringify(output, null, 2));
      console.log(`\n⏱️  Elapsed: ${elapsedMs}ms`);
      return;
    }

    console.log(`✨ Translated ${translations.length} item(s) [${elapsedMs}ms]:\n`);

    args.texts.forEach((text, idx) => {
      const translated = translations[idx];
      console.log(`  ${idx + 1}. "\x1b[33m${text}\x1b[0m"`);
      console.log(`     ↳ "\x1b[32m${translated}\x1b[0m"\n`);
    });
  } catch (error: unknown) {
    const elapsedMs = Date.now() - startTime;
    console.error(`\n❌ Error after ${elapsedMs}ms:`, error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
