#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const ENV_FILE_PATH = path.join(ROOT_DIR, '.env');

// 1. Parse CLI arguments
const args = process.argv.slice(2);

function getArgValue(flag) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  const prefixArg = args.find((a) => a.startsWith(`${flag}=`));
  if (prefixArg) {
    return prefixArg.slice(flag.length + 1);
  }
  return null;
}

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Usage:
  npm run dokploy:deploy -- [environment-name] [options]
  node scripts/create-dokploy-env.mjs [environment-name] [options]

Options:
  --branch <name>        Git branch to deploy (default: current git branch)
  --app-name <name>      Compose application name in Dokploy (default: app)
  --reset-db             Reset database volumes on deploy (freshVolumes)
  --skip-deploy          Create and configure environment without triggering deploy
  --check                Perform HTTP check of deployed services
  -h, --help             Show help

Examples:
  npm run dokploy:deploy
  npm run dokploy:deploy -- dev
  npm run dokploy:deploy -- feature-quiz --branch feature-quiz
  npm run dokploy:deploy -- feature-quiz --skip-deploy
`);
  process.exit(0);
}

const resetDb = args.includes('--reset-db') || args.includes('--recreate-db') || args.includes('--fresh-volumes');
const skipDeploy = args.includes('--skip-deploy') || args.includes('--no-deploy');
const runCheck = args.includes('--check');
const customBranch = getArgValue('--branch');
const customAppName = getArgValue('--app-name') !== null ? getArgValue('--app-name') : 'app';

const positionalArgs = args.filter((a) => {
  if (a.startsWith('--')) return false;
  const prevIdx = args.indexOf(a) - 1;
  if (prevIdx >= 0 && ['--branch', '--app-name'].includes(args[prevIdx])) {
    return false;
  }
  return true;
});

// 2. Detect Git Branch
function getCurrentGitBranch() {
  try {
    const branch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: ROOT_DIR, encoding: 'utf-8' }).trim();
    if (branch) return branch;
  } catch {
    // ignore
  }
  throw new Error('Unable to determine current git branch. Please specify --branch <branch-name>');
}

const gitBranch = customBranch !== null ? customBranch : getCurrentGitBranch();
const rawEnvName = positionalArgs.length > 0 ? positionalArgs[0] : gitBranch;
// Sanitize environment name for valid DNS label (e.g. feature/foo -> feature-foo)
const envName = rawEnvName.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();

// 3. Load .env file with strict validation
function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`.env file not found at path: ${filePath}`);
  }
  const content = fs.readFileSync(filePath, 'utf-8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.substring(0, eqIdx).trim();
      let val = trimmed.substring(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const envVars = loadEnv(ENV_FILE_PATH);

function requireEnvVar(name) {
  const value = envVars[name] !== undefined ? envVars[name] : process.env[name];
  if (value === undefined || value === '') {
    throw new Error(`Strict Configuration Error: Missing required environment variable "${name}" in ${ENV_FILE_PATH}`);
  }
  return value;
}

function getEnvVar(name) {
  const value = envVars[name] !== undefined ? envVars[name] : process.env[name];
  if (value === undefined) {
    throw new Error(`Strict Configuration Error: Required variable "${name}" is not defined in ${ENV_FILE_PATH}`);
  }
  return value;
}

const DOKPLOY_URL_RAW = requireEnvVar('DOKPLOY_URL');
const BASE_URL = `${DOKPLOY_URL_RAW.replace(/\/+$/, '')}/api`;
const API_KEY = requireEnvVar('DOKPLOY_API_KEY');

// Helper to make API requests to Dokploy
function dokployRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}${endpoint}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json',
      },
    };

    let bodyData = null;
    if (body) {
      bodyData = JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyData);
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`[${res.statusCode}] ${endpoint}: ${json.message || JSON.stringify(json)}`));
          } else {
            resolve(json.data !== undefined ? json.data : json);
          }
        } catch {
          if (res.statusCode >= 400) {
            reject(new Error(`[${res.statusCode}] ${endpoint}: ${data}`));
          } else {
            resolve(data);
          }
        }
      });
    });

    req.on('error', reject);
    if (bodyData) req.write(bodyData);
    req.end();
  });
}

// 4. Generate Compose environment variables
function generateComposeEnv({ domainHost, pgAppName, pgUser, pgPassword, pgDbName, redisAppName, redisPassword }) {
  const postgresUrl = `postgresql://${pgUser}:${pgPassword}@${pgAppName}:5432/${pgDbName}?schema=public`;
  const redisUrl = `redis://default:${redisPassword}@${redisAppName}:6379`;
  const fullDomain = `https://${domainHost}`;

  return [
    '# BASE SERVICE',
    'BASE_TARGET=production',
    `BASE_PORT=${getEnvVar('BASE_PORT')}`,
    `BASE_DATABASE_URL=${postgresUrl}`,
    `BASE_JWT_SECRET=${requireEnvVar('BASE_JWT_SECRET')}`,
    'BASE_MERCURE_URL=http://mercure/.well-known/mercure',
    `BASE_MERCURE_JWT=${requireEnvVar('BASE_MERCURE_JWT')}`,
    'BASE_TRANSLATOR_API_URL=http://translator:3001/api/v1/translate',
    `BASE_TRANSLATOR_APP_TYPE=${getEnvVar('BASE_TRANSLATOR_APP_TYPE')}`,
    'BASE_DEFINER_API_URL=http://definer:3002/api/v1/define',
    `BASE_DEFINER_APP_TYPE=${getEnvVar('BASE_DEFINER_APP_TYPE')}`,
    `BASE_DOMAIN=${fullDomain}`,
    `BASE_REDIS_URL=${redisUrl}`,
    `BASE_CORS_ORIGIN=${fullDomain}`,
    `BASE_ENABLE_TEST_AUTH=${getEnvVar('BASE_ENABLE_TEST_AUTH')}`,
    'BASE_LLM_API_URL=http://llm:3003/api/v1/generate',
    `BASE_LLM_PROVIDER=${getEnvVar('BASE_LLM_PROVIDER')}`,
    `BASE_LLM_MODEL=${getEnvVar('BASE_LLM_MODEL')}`,
    `BASE_ENABLE_DB_LOGGING=${getEnvVar('BASE_ENABLE_DB_LOGGING')}`,
    '',
    '# MERCURE SERVICE',
    `MERCURE_PORT=${getEnvVar('MERCURE_PORT')}`,
    'MERCURE_SERVER_NAME=:80',
    `MERCURE_JWT_KEY=${requireEnvVar('MERCURE_JWT_KEY')}`,
    `MERCURE_CORS_ALLOWED_ORIGINS=${fullDomain}`,
    `MERCURE_ALLOW_ANONYMOUS=${getEnvVar('MERCURE_ALLOW_ANONYMOUS')}`,
    '',
    '# TRANSLATOR SERVICE',
    'TRANSLATOR_TARGET=production',
    `TRANSLATOR_PORT=${getEnvVar('TRANSLATOR_PORT')}`,
    `TRANSLATOR_GOOGLE_TRANSLATE_API_KEY=${getEnvVar('TRANSLATOR_GOOGLE_TRANSLATE_API_KEY')}`,
    `TRANSLATOR_LARA_ACCESS_KEY_ID=${getEnvVar('TRANSLATOR_LARA_ACCESS_KEY_ID')}`,
    `TRANSLATOR_LARA_ACCESS_KEY_SECRET=${getEnvVar('TRANSLATOR_LARA_ACCESS_KEY_SECRET')}`,
    `TRANSLATOR_CACHE_URL=${redisUrl}/1`,
    `TRANSLATOR_MOCK_TIMEOUT=${getEnvVar('TRANSLATOR_MOCK_TIMEOUT')}`,
    `TRANSLATOR_APP_TYPE=${getEnvVar('BASE_TRANSLATOR_APP_TYPE')}`,
    'TRANSLATOR_LLM_SERVICE_URL=http://llm:3003/api/v1/generate',
    `TRANSLATOR_LLM_PROVIDER=${getEnvVar('BASE_LLM_PROVIDER')}`,
    `TRANSLATOR_LLM_MODEL=${getEnvVar('BASE_LLM_MODEL')}`,
    '',
    '# LLM SERVICE',
    'LLM_TARGET=production',
    `LLM_PORT=${getEnvVar('LLM_PORT')}`,
    `LLM_MISTRAL_API_KEY=${getEnvVar('LLM_MISTRAL_API_KEY')}`,
    `LLM_GEMINI_API_KEY=${getEnvVar('LLM_GEMINI_API_KEY')}`,
    `LLM_MOCK_TIMEOUT=${getEnvVar('LLM_MOCK_TIMEOUT')}`,
    `LLM_CACHE_URL=${redisUrl}/3`,
    `LLM_PROVIDER=${getEnvVar('BASE_LLM_PROVIDER')}`,
    `LLM_MODEL=${getEnvVar('BASE_LLM_MODEL')}`,
    '',
    '# DEFINER SERVICE',
    'DEFINER_TARGET=production',
    `DEFINER_PORT=${getEnvVar('DEFINER_PORT')}`,
    'DEFINER_LLM_SERVICE_URL=http://llm:3003/api/v1/generate',
    `DEFINER_CACHE_URL=${redisUrl}/2`,
    `DEFINER_MOCK_TIMEOUT=${getEnvVar('DEFINER_MOCK_TIMEOUT')}`,
    `DEFINER_APP_TYPE=${getEnvVar('BASE_DEFINER_APP_TYPE')}`,
    '',
    '# FRONTEND SERVICE',
    'FRONTEND_TARGET=production',
    `FRONTEND_PORT=${getEnvVar('FRONTEND_PORT')}`,
    `FRONTEND_API_BASE_URL=${fullDomain}/api/v1`,
    `FRONTEND_MERCURE_PUBLIC_URL=${fullDomain}/.well-known/mercure`,
    `FRONTEND_BASE_DOMAIN=${fullDomain}`,
    `FRONTEND_ALLOWED_HOSTS=${domainHost}`,
    `FRONTEND_AUTH_PROVIDER=${getEnvVar('FRONTEND_AUTH_PROVIDER')}`,
    '',
    '# AUTH',
    `GOOGLE_CLIENT_ID=${getEnvVar('GOOGLE_CLIENT_ID')}`,
  ].join('\n');
}

async function main() {
  console.log(`\n\x1b[36m=== Dokploy Deployment: "${envName}" ===\x1b[0m\n`);
  console.log(`📌 Git branch: \x1b[32m${gitBranch}\x1b[0m`);
  console.log(`📌 Environment name: \x1b[32m${envName}\x1b[0m`);

  // 1. Fetch Project and GitHub provider
  console.log('🔍 Connecting to Dokploy and searching for project "language-cards"...');
  const projects = await dokployRequest('/project.all');
  const project = (projects || []).find((p) => p.name?.toLowerCase() === 'language-cards');
  if (!project) {
    throw new Error('Project "language-cards" not found in Dokploy!');
  }
  const projectId = project.projectId;

  const githubProviders = await dokployRequest('/github.githubProviders');
  const githubProvider = (githubProviders || []).find(
    (g) =>
      g.gitProvider?.name?.includes('Dokploy-dkoldyaev') ||
      g.githubAppName?.includes('dokploy-dkoldyaev')
  ) || (githubProviders || [])[0];

  if (!githubProvider) {
    throw new Error('GitHub provider not found in Dokploy!');
  }
  const githubId = githubProvider.githubId;

  console.log(`✅ Project: ${project.name} (${projectId})`);
  console.log(`✅ GitHub Provider: ${githubProvider.githubAppName || githubProvider.gitProvider?.name} (${githubId})`);

  // 2. Find or Create Environment
  let projectDetails = await dokployRequest(`/project.one?projectId=${projectId}`);
  let env = (projectDetails.environments || []).find((e) => e.name === envName);

  if (!env) {
    console.log(`\n🚀 Creating new environment "${envName}"...`);
    env = await dokployRequest('/environment.create', 'POST', {
      name: envName,
      projectId: projectId,
      description: `Automatically created for branch ${gitBranch}`,
    });
    console.log(`✅ Environment created (ID: ${env.environmentId})`);
  } else {
    console.log(`\nℹ️  Environment already exists (ID: ${env.environmentId})`);
  }

  const environmentId = env.environmentId;
  const envDetails = await dokployRequest(`/environment.one?environmentId=${environmentId}`);

  // 3. Find or Create PostgreSQL Database
  console.log('\n🐘 Checking PostgreSQL database service...');
  const existingPgList = envDetails.postgres || [];
  let pgService = existingPgList.find((p) => p.name === 'db') || existingPgList[0];

  if (!pgService) {
    console.log('🚀 Creating PostgreSQL service "db"...');
    const pgPassword = crypto.randomBytes(12).toString('hex');
    const createdPg = await dokployRequest('/postgres.create', 'POST', {
      name: 'db',
      databaseName: 'postgres',
      databaseUser: 'postgres',
      databasePassword: pgPassword,
      dockerImage: 'postgres:15',
      environmentId: environmentId,
    });
    console.log(`✅ PostgreSQL created (ID: ${createdPg.postgresId}). Triggering deploy...`);
    await dokployRequest('/postgres.deploy', 'POST', {
      postgresId: createdPg.postgresId,
    });
    pgService = await dokployRequest(`/postgres.one?postgresId=${createdPg.postgresId}`);
    console.log(`✅ PostgreSQL deployed: ${pgService.appName}`);
  } else {
    pgService = await dokployRequest(`/postgres.one?postgresId=${pgService.postgresId}`);
    console.log(`ℹ️  PostgreSQL already exists: ${pgService.appName}`);
  }

  // 4. Find or Create Redis Service
  console.log('\n🔴 Checking Redis service...');
  const existingRedisList = envDetails.redis || [];
  let redisService = existingRedisList.find((r) => r.name === 'redis') || existingRedisList[0];

  if (!redisService) {
    console.log('🚀 Creating Redis service "redis"...');
    const redisPassword = crypto.randomBytes(12).toString('hex');
    const createdRedis = await dokployRequest('/redis.create', 'POST', {
      name: 'redis',
      databasePassword: redisPassword,
      dockerImage: 'redis:7',
      environmentId: environmentId,
    });
    console.log(`✅ Redis created (ID: ${createdRedis.redisId}). Triggering deploy...`);
    await dokployRequest('/redis.deploy', 'POST', {
      redisId: createdRedis.redisId,
    });
    redisService = await dokployRequest(`/redis.one?redisId=${createdRedis.redisId}`);
    console.log(`✅ Redis deployed: ${redisService.appName}`);
  } else {
    redisService = await dokployRequest(`/redis.one?redisId=${redisService.redisId}`);
    console.log(`ℹ️  Redis already exists: ${redisService.appName}`);
  }

  // 5. Find or Create Compose Application
  console.log('\n📦 Checking Compose application...');
  const existingComposes = envDetails.compose || [];
  let composeApp = existingComposes.find((c) => c.name === customAppName) || existingComposes[0];

  if (!composeApp) {
    console.log(`🚀 Creating compose application "${customAppName}"...`);
    composeApp = await dokployRequest('/compose.create', 'POST', {
      name: customAppName,
      environmentId: environmentId,
      sourceType: 'github',
      composeType: 'docker-compose',
    });
    console.log(`✅ Compose application created (ID: ${composeApp.composeId})`);
  } else {
    console.log(`ℹ️  Compose application already exists (ID: ${composeApp.composeId}, name: ${composeApp.name})`);
  }

  const composeId = composeApp.composeId;

  // 6. Generate and save environment variables
  const domainHost = `${envName}.languagecards.194-163-164-255.sslip.io`;
  const composeEnv = generateComposeEnv({
    domainHost,
    pgAppName: pgService.appName,
    pgUser: pgService.databaseUser,
    pgPassword: pgService.databasePassword,
    pgDbName: pgService.databaseName,
    redisAppName: redisService.appName,
    redisPassword: redisService.databasePassword,
  });

  console.log('\n⚙️  Configuring Compose application settings...');
  await dokployRequest('/compose.update', 'POST', {
    composeId: composeId,
    name: customAppName,
    sourceType: 'github',
    repository: 'language-card-bot',
    owner: 'dkoldyaev',
    branch: gitBranch,
    githubId: githubId,
    composePath: './docker-compose.yml',
    composeType: 'docker-compose',
    isolatedDeployment: false,
    autoDeploy: true,
    triggerType: 'push',
    command: '',
    env: composeEnv,
  });

  await dokployRequest('/compose.saveEnvironment', 'POST', {
    composeId: composeId,
    env: composeEnv,
    createEnvFile: true,
  });
  console.log(`✅ Repository dkoldyaev/language-card-bot (${gitBranch}), composePath: ./docker-compose.yml`);
  console.log('✅ Environment variables saved');

  // 7. Setup Traefik Domains
  console.log('\n🌐 Configuring Traefik domain routes...');
  const existingDomains = (await dokployRequest(`/domain.byComposeId?composeId=${composeId}`)) || [];

  const requiredDomains = [
    { host: domainHost, path: '/', port: 5173, serviceName: 'frontend', label: 'Frontend' },
    { host: domainHost, path: '/api/v1', port: 3001, serviceName: 'app', label: 'Backend API' },
    { host: domainHost, path: '/.well-known/mercure', port: 80, serviceName: 'mercure', label: 'Mercure SSE' },
  ];

  for (const dom of requiredDomains) {
    const existing = existingDomains.find(
      (d) => d.host === dom.host && (d.path === dom.path || (!d.path && dom.path === '/')) && d.serviceName === dom.serviceName
    );

    if (existing) {
      console.log(`  🔄 Updating existing domain for ${dom.label} (${dom.path} -> ${dom.serviceName}:${dom.port})...`);
      await dokployRequest('/domain.update', 'POST', {
        domainId: existing.domainId,
        host: dom.host,
        path: dom.path,
        port: dom.port,
        serviceName: dom.serviceName,
        https: true,
        certificateType: 'letsencrypt',
        domainType: 'compose',
        enabled: true,
        stripPath: false,
      });
      console.log('  ✅ Domain updated');
    } else {
      console.log(`  ➕ Creating domain https://${dom.host}${dom.path} -> ${dom.serviceName}:${dom.port} (${dom.label})...`);
      await dokployRequest('/domain.create', 'POST', {
        composeId: composeId,
        host: dom.host,
        path: dom.path,
        port: dom.port,
        serviceName: dom.serviceName,
        domainType: 'compose',
        https: true,
        certificateType: 'letsencrypt',
        stripPath: false,
      });
      console.log('  ✅ Domain created');
    }
  }

  // 8. Trigger Deploy
  if (skipDeploy) {
    console.log('\n⏩ Flag --skip-deploy: deployment skipped.');
  } else {
    console.log('\n🚀 Triggering compose stack deployment...');
    const deployTriggerTime = Date.now() - 2000;
    await dokployRequest('/compose.deploy', 'POST', {
      composeId: composeId,
      title: `Deploy Compose (${envName})`,
      description: `Deploy compose for environment ${envName}, branch ${gitBranch}`,
      freshVolumes: resetDb,
    });
    console.log('✅ Deployment triggered!');

    // Wait for deployment completion
    console.log('\n⏳ Waiting for build and deployment to finish...');
    const deployTimeoutMs = 20 * 60 * 1000;
    const deployStart = Date.now();
    let finishedDeployment = null;

    while (Date.now() - deployStart < deployTimeoutMs) {
      const deployments = await dokployRequest(`/deployment.allByCompose?composeId=${composeId}`);
      const latest = deployments?.[0];

      if (latest && new Date(latest.createdAt).getTime() >= deployTriggerTime) {
        if (latest.status === 'done') {
          finishedDeployment = latest;
          console.log(`\n\n\x1b[32m✅ Deployment successfully completed in ${Math.round((Date.now() - deployStart) / 1000)}s!\x1b[0m`);
          break;
        }
        if (latest.status === 'error') {
          let errorLog = '';
          try {
            errorLog = await dokployRequest(`/deployment.readLogs?deploymentId=${latest.deploymentId}&tail=50`);
          } catch {
            // ignore
          }
          console.error(`\n\n\x1b[31m❌ Deployment failed with error: ${latest.errorMessage || 'Docker command failed'}\x1b[0m`);
          if (errorLog) {
            console.error('\nBuild logs:\n', errorLog);
          }
          console.error(`\n🌐 View detailed build logs in Dokploy dashboard:\n  ${DOKPLOY_URL_RAW}/dashboard/project/${projectId}/environment/${environmentId}/compose/${composeId}\n`);
          process.exit(1);
        }
        process.stdout.write(`  ... deployment status: \x1b[33m${latest.status}\x1b[0m (${Math.round((Date.now() - deployStart) / 1000)}s)\r`);
      }

      await new Promise((r) => setTimeout(r, 4000));
    }

    if (!finishedDeployment) {
      throw new Error('Deployment timeout reached (20 minutes). Please check Dokploy dashboard.');
    }
  }

  // 9. Optional Health Check
  if (runCheck) {
    console.log('\n--- VERIFYING DEPLOYED ENVIRONMENT ---');
    try {
      const feRes = await fetch(`https://${domainHost}/`);
      console.log(`Frontend (https://${domainHost}/): ${feRes.status} ${feRes.statusText}`);
    } catch (err) {
      console.error(`❌ Frontend check failed: ${err.message}`);
    }

    try {
      const corsRes = await fetch(`https://${domainHost}/.well-known/mercure`, {
        method: 'OPTIONS',
        headers: {
          Origin: `https://${domainHost}`,
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'authorization',
        },
      });
      console.log(`Mercure OPTIONS preflight: ${corsRes.status}`);
    } catch (err) {
      console.error(`❌ Mercure check failed: ${err.message}`);
    }
  }

  // Summary
  console.log('\n\x1b[32m🎉 Environment successfully configured!\x1b[0m\n');
  console.log(`🌐 Dokploy Dashboard: ${DOKPLOY_URL_RAW}/dashboard/project/${projectId}/environment/${environmentId}/compose/${composeId}`);
  console.log(`💻 Frontend:           https://${domainHost}`);
  console.log(`🔗 Backend API:        https://${domainHost}/api/v1`);
  console.log(`📡 Mercure SSE:        https://${domainHost}/.well-known/mercure`);
  console.log(`🐘 Postgres AppName:   ${pgService.appName}`);
  console.log(`🔴 Redis AppName:      ${redisService.appName}`);
  console.log(`🌿 Git Branch:         ${gitBranch}\n`);
}

main().catch((err) => {
  console.error('\n\x1b[31m❌ Script execution error:\x1b[0m', err.message);
  process.exit(1);
});
