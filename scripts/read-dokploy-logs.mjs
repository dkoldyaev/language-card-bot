#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('Error: .env file not found at', envPath);
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf-8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq !== -1) {
    envVars[trimmed.substring(0, eq).trim()] = trimmed.substring(eq + 1).trim();
  }
}

if (!envVars.DOKPLOY_API_KEY) {
  console.error('Error: DOKPLOY_API_KEY is not defined in .env');
  process.exit(1);
}
if (!envVars.DOKPLOY_URL) {
  console.error('Error: DOKPLOY_URL is not defined in .env');
  process.exit(1);
}

const API_KEY = envVars.DOKPLOY_API_KEY;
const BASE_URL = envVars.DOKPLOY_URL.replace(/\/+$/, '');

function dokployRequest(endpoint, method = 'GET', body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${BASE_URL}/api${endpoint}`);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port ? url.port : (url.protocol === 'https:' ? 443 : 80),
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

function parseCliArgs() {
  const rawArgs = process.argv.slice(2);
  const options = {
    env: null,
    service: null,
    tail: 50,
    list: false,
    project: null,
    help: false,
  };

  const positional = [];

  for (let i = 0; i < rawArgs.length; i++) {
    const arg = rawArgs[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--list' || arg === '-l') {
      options.list = true;
    } else if (arg.startsWith('--env=')) {
      options.env = arg.slice('--env='.length);
    } else if (arg === '--env' || arg === '-e') {
      i++;
      if (i < rawArgs.length) options.env = rawArgs[i];
    } else if (arg.startsWith('--service=')) {
      options.service = arg.slice('--service='.length);
    } else if (arg === '--service' || arg === '-s') {
      i++;
      if (i < rawArgs.length) options.service = rawArgs[i];
    } else if (arg.startsWith('--tail=')) {
      const parsedTail = parseInt(arg.slice('--tail='.length), 10);
      if (!Number.isNaN(parsedTail)) options.tail = parsedTail;
    } else if (arg === '--tail' || arg === '-n') {
      i++;
      if (i < rawArgs.length) {
        const parsedTail = parseInt(rawArgs[i], 10);
        if (!Number.isNaN(parsedTail)) options.tail = parsedTail;
      }
    } else if (arg.startsWith('--project=')) {
      options.project = arg.slice('--project='.length);
    } else if (arg === '--project' || arg === '-p') {
      i++;
      if (i < rawArgs.length) options.project = rawArgs[i];
    } else if (!arg.startsWith('-')) {
      positional.push(arg);
    }
  }

  if (!options.env && positional.length > 0) {
    options.env = positional[0];
  }
  if (!options.service && positional.length > 1) {
    options.service = positional[1];
  }

  return options;
}

function printUsage() {
  console.log(`
Usage:
  npm run read:dokploy:logs -- [environment] [service] [options]
  node scripts/read-dokploy-logs.mjs [environment] [service] [options]

Arguments:
  environment              Environment name (e.g., 'production', 'dev', 'main', or custom ephemeral env)
  service                  Filter by service/container name substring (e.g. 'app', 'definer', 'llm', 'translator')

Options:
  --env, -e <name>         Target environment name
  --service, -s <name>     Target service or container name
  --tail, -n <number>      Number of log lines to retrieve (default: 50)
  --project, -p <name>     Target project name (defaults to 'language-cards' if present)
  --list, -l               List all available environments and containers
  -h, --help               Show this help message

Examples:
  npm run read:dokploy:logs -- production
  npm run read:dokploy:logs -- production definer
  npm run read:dokploy:logs -- --env=dev --service=app --tail=100
  npm run read:dokploy:logs -- --list
`);
}

async function main() {
  const options = parseCliArgs();

  if (options.help) {
    printUsage();
    return;
  }

  console.log(`Connecting to Dokploy at ${BASE_URL}...`);
  const projects = await dokployRequest('/project.all');
  if (!Array.isArray(projects) || projects.length === 0) {
    console.error('No projects found on Dokploy.');
    return;
  }

  let project = null;
  if (options.project) {
    project = projects.find((p) => p.name === options.project || p.projectId === options.project);
    if (!project) {
      console.error(`Project '${options.project}' not found. Available projects: ${projects.map((p) => p.name).join(', ')}`);
      return;
    }
  } else {
    project = projects.find((p) => p.name === 'language-cards');
    if (!project) {
      project = projects[0];
    }
  }

  const environments = project.environments || [];

  if (options.list) {
    console.log(`\nProject: ${project.name} (${project.projectId})`);
    console.log('Environments:');
    for (const env of environments) {
      const composeList = (env.compose || []).map((c) => `${c.name} (${c.composeId}, status: ${c.composeStatus})`).join(', ');
      console.log(`  - ${env.name} [id: ${env.environmentId}]`);
      if (composeList) {
        console.log(`    Compose: ${composeList}`);
      }
    }
    return;
  }

  if (!options.env) {
    console.error(`No environment specified.`);
    console.log(`Available environments in project '${project.name}':\n  ${environments.map((e) => e.name).join(', ')}\n`);
    printUsage();
    return;
  }

  const matchedEnv = environments.find(
    (e) => e.name.toLowerCase() === options.env.toLowerCase() || e.environmentId === options.env
  );

  if (!matchedEnv) {
    console.error(`Environment '${options.env}' not found in project '${project.name}'.`);
    console.log(`Available environments: ${environments.map((e) => e.name).join(', ')}`);
    return;
  }

  const composeApps = matchedEnv.compose || [];
  if (composeApps.length === 0) {
    console.error(`Environment '${matchedEnv.name}' has no compose applications.`);
    return;
  }

  const composeApp = composeApps[0];
  const composeDetail = await dokployRequest(`/compose.one?composeId=${composeApp.composeId}`);
  const appPrefix = composeDetail.appName;

  console.log(`Fetching containers for environment '${matchedEnv.name}' (compose: ${composeApp.name}, appName: ${appPrefix || 'unknown'})...`);
  const allContainers = await dokployRequest('/docker.getContainers');

  let relevantContainers = allContainers.filter((c) => {
    if (!c.name) return false;
    if (appPrefix) {
      return c.name.includes(appPrefix);
    }
    return c.name.includes(composeApp.composeId) || c.name.includes(matchedEnv.name);
  });

  if (relevantContainers.length === 0) {
    console.warn(`No running containers found matching prefix '${appPrefix}'. Showing all containers matching environment name '${matchedEnv.name}'...`);
    relevantContainers = allContainers.filter((c) => c.name && c.name.includes(matchedEnv.name));
  }

  if (relevantContainers.length === 0) {
    console.error(`No containers found for environment '${matchedEnv.name}'.`);
    return;
  }

  if (options.service) {
    const filter = options.service.toLowerCase();
    const filtered = relevantContainers.filter((c) => c.name.toLowerCase().includes(filter));
    if (filtered.length === 0) {
      console.error(`No container matching service '${options.service}' found in environment '${matchedEnv.name}'.`);
      console.log('Available containers:');
      for (const c of relevantContainers) {
        console.log(`  - ${c.name} (${c.containerId}, state: ${c.state})`);
      }
      return;
    }
    relevantContainers = filtered;
  }

  for (const c of relevantContainers) {
    console.log(`\n================================================================================`);
    console.log(`CONTAINER: ${c.name} (${c.containerId}) [Status: ${c.state}]`);
    console.log(`================================================================================`);
    try {
      const logs = await dokployRequest(
        `/compose.readLogs?composeId=${composeApp.composeId}&containerId=${c.containerId}&tail=${options.tail}`
      );
      if (typeof logs === 'string') {
        console.log(logs.trim() || '(no logs available)');
      } else {
        console.log(JSON.stringify(logs, null, 2));
      }
    } catch (err) {
      console.error(`Failed to read logs for container ${c.name}:`, err.message);
    }
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
