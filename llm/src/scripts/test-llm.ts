import path from 'path';
import dotenv from 'dotenv';

// Load service-level .env first, then root .env if running from workspace
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

import { z } from 'zod';
import { LLMProviderFactory } from '../core/LLMProviderFactory';
import { LLMProviderType } from '../core/ILLMProvider';
import { env } from '../core/env';

function printUsage() {
  console.log(`
Usage:
  npm run test:cli -- [options] [prompt...]
  npm run llm:cli -- [options] [prompt...]

Arguments:
  [prompt...]                           Prompt text (or use --prompt/-p)

Options:
  --prompt, -p <text>                   Prompt to send to LLM
  --provider <type>                     Provider: 'mistral' | 'gemini' | 'mock'
  --model, -m <model>                   Model identifier (e.g. open-mistral-nemo, gemini-1.5-flash)
  --format, --json-format, -f <desc>    Required JSON format schema or text description
  --url, --http [endpoint]              Send HTTP POST to running LLM service instead of direct execution
  --help, -h                            Show this help message

Examples:
  # Direct test using Mistral
  npm run llm:cli -- --provider mistral --model open-mistral-nemo --prompt "List 3 colors" --format '{"colors": "string[]"}'

  # Direct test using Mock provider
  npm run llm:cli -- --provider mock --model mock --prompt "Hello" --format '{"message": "string"}'

  # Test running HTTP service
  npm run llm:cli -- --provider mock --model mock --prompt "Hello" --format '{"message": "string"}' --http
`);
}

interface ParsedArgs {
  prompt: string;
  provider: LLMProviderType;
  model: string;
  jsonFormat: string | Record<string, any>;
  httpUrl?: string;
}

function parseArgs(): ParsedArgs {
  const argv = process.argv.slice(2);
  if (argv.includes('--help') || argv.includes('-h')) {
    printUsage();
    process.exit(0);
  }

  const positional: string[] = [];
  let prompt: string | undefined;
  let provider: string | undefined;
  let model: string | undefined;
  let format: string | undefined;
  let httpUrl: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--prompt' || arg === '-p') {
      prompt = argv[++i];
    } else if (arg === '--provider') {
      provider = argv[++i];
    } else if (arg === '--model' || arg === '-m') {
      model = argv[++i];
    } else if (arg === '--format' || arg === '--json-format' || arg === '-f') {
      format = argv[++i];
    } else if (arg === '--url') {
      httpUrl = argv[++i];
    } else if (arg === '--http') {
      const next = argv[i + 1];
      if (next && !next.startsWith('-')) {
        httpUrl = argv[++i];
      } else {
        httpUrl = `http://localhost:${env.PORT}/api/v1/generate`;
      }
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    } else {
      console.error(`Unknown option: ${arg}`);
      printUsage();
      process.exit(1);
    }
  }

  const resolvedPrompt = prompt !== undefined ? prompt : positional.join(' ');
  const resolvedProvider = provider !== undefined ? provider : process.env.LLM_PROVIDER;
  const resolvedModel = model !== undefined ? model : process.env.LLM_MODEL;
  const resolvedFormat = format !== undefined ? format : process.env.LLM_JSON_FORMAT;

  const validProviders = ['mistral', 'gemini', 'mock'] as const;

  const schema = z.object({
    prompt: z.string().min(1, 'Prompt is required (pass via --prompt/-p or as arguments)'),
    provider: z.enum(validProviders, {
      message: `Invalid provider "${resolvedProvider}". Must be one of: ${validProviders.join(', ')}`,
    }),
    model: z.string().min(1, 'Model is required (pass via --model/-m or LLM_MODEL in .env)'),
    jsonFormat: z.string().min(1, 'Format is required (pass via --format/-f or LLM_JSON_FORMAT in .env)'),
    httpUrl: z.string().optional(),
  });

  const parsed = schema.safeParse({
    prompt: resolvedPrompt.trim().length > 0 ? resolvedPrompt.trim() : undefined,
    provider: resolvedProvider,
    model: resolvedModel,
    jsonFormat: resolvedFormat,
    httpUrl,
  });

  if (!parsed.success) {
    console.error('❌ Validation error:');
    parsed.error.issues.forEach((issue) => {
      console.error(`  - ${issue.message}`);
    });
    console.log('\nRun with --help for usage details.');
    process.exit(1);
  }

  let finalFormat: string | Record<string, any> = parsed.data.jsonFormat;
  try {
    const jsonParsed = JSON.parse(parsed.data.jsonFormat);
    if (typeof jsonParsed === 'object' && jsonParsed !== null) {
      finalFormat = jsonParsed;
    }
  } catch {
    // Keep string format description
  }

  return {
    prompt: parsed.data.prompt,
    provider: parsed.data.provider,
    model: parsed.data.model,
    jsonFormat: finalFormat,
    httpUrl: parsed.data.httpUrl,
  };
}

async function runHttpTest(args: ParsedArgs): Promise<any> {
  const url = args.httpUrl!;
  console.log(`📡 Sending HTTP POST to ${url}...`);

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: args.prompt,
      provider: args.provider,
      model: args.model,
      jsonFormat: args.jsonFormat,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`LLM HTTP service error (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as { data?: any };
  return json.data !== undefined ? json.data : json;
}

async function runDirectTest(args: ParsedArgs): Promise<any> {
  const provider = LLMProviderFactory.getProvider(args.provider);
  return await provider.generate({
    prompt: args.prompt,
    model: args.model,
    jsonFormat: args.jsonFormat,
  });
}

async function main() {
  const args = parseArgs();

  console.log(`\n🤖 Testing LLM Service`);
  console.log(`────────────────────────────────────────`);
  console.log(`  Provider:   ${args.provider}`);
  console.log(`  Model:      ${args.model}`);
  console.log(`  Prompt:     ${args.prompt}`);
  console.log(`  Format:     ${typeof args.jsonFormat === 'string' ? args.jsonFormat : JSON.stringify(args.jsonFormat)}`);
  if (args.httpUrl) console.log(`  Endpoint:   ${args.httpUrl}`);
  console.log(`────────────────────────────────────────\n`);

  const startTime = Date.now();

  try {
    const result = args.httpUrl
      ? await runHttpTest(args)
      : await runDirectTest(args);

    const elapsedMs = Date.now() - startTime;

    console.log(`✨ Result [${elapsedMs}ms]:\n`);
    console.log(JSON.stringify(result, null, 2));
    console.log('');
  } catch (error: any) {
    const elapsedMs = Date.now() - startTime;
    console.error(`\n❌ Error after ${elapsedMs}ms:`, error.message || error);
    process.exit(1);
  }
}

main();
