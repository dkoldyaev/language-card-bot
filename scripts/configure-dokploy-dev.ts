import fs from 'node:fs';
import path from 'node:path';

// 1. Read environment variables from .env
function loadEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx !== -1) {
        const key = trimmed.substring(0, eqIdx).trim();
        const val = trimmed.substring(eqIdx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

const DOKPLOY_URL = (process.env.DOKPLOY_URL || 'https://dokploy.dkoldyaev.com').replace(/\/$/, '');
const DOKPLOY_API_KEY = process.env.DOKPLOY_API_KEY;

if (!DOKPLOY_API_KEY) {
  console.error('❌ DOKPLOY_API_KEY is not set in .env or environment variables.');
  process.exit(1);
}

const DEV_DOMAIN = 'dev.languagecards.194-163-164-255.sslip.io';

async function trpcCall<T = any>(endpoint: string, method: 'GET' | 'POST', data?: any): Promise<T> {
  let url = `${DOKPLOY_URL}/api/trpc/${endpoint}`;
  const headers: Record<string, string> = {
    'x-api-key': DOKPLOY_API_KEY!,
  };

  const options: RequestInit = {
    method,
    headers,
  };

  if (method === 'GET' && data) {
    url += `?input=${encodeURIComponent(JSON.stringify({ json: data }))}`;
  } else if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify({ json: data ?? {} });
  }

  const response = await fetch(url, options);
  const json = await response.json();

  if (!response.ok || json.error) {
    const errMsg = json?.error?.json?.message || json?.error?.message || response.statusText;
    throw new Error(`tRPC call failed [${endpoint}]: ${errMsg}`);
  }

  return json.result.data.json;
}

// Update specific key=value lines in .env text while preserving structure
function updateEnvString(currentEnv: string, updates: Record<string, string>): string {
  const lines = currentEnv.split('\n');
  const foundKeys = new Set<string>();

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) return line;

    const key = trimmed.substring(0, eqIdx).trim();
    if (key in updates) {
      foundKeys.add(key);
      return `${key}=${updates[key]}`;
    }
    return line;
  });

  // Append any keys that were not already present
  for (const [key, val] of Object.entries(updates)) {
    if (!foundKeys.has(key)) {
      updatedLines.push(`${key}=${val}`);
    }
  }

  return updatedLines.join('\n');
}

async function main() {
  console.log(`Connecting to Dokploy at ${DOKPLOY_URL}...`);

  // 1. Find language-cards > dev > app compose
  console.log('Fetching projects to locate dev compose service...');
  const projects = await trpcCall('project.all', 'GET');
  const project = projects.find((p: any) => p.name === 'language-cards');
  if (!project) {
    throw new Error('Project "language-cards" not found on Dokploy');
  }

  const devEnv = project.environments.find((e: any) => e.name === 'dev');
  if (!devEnv) {
    throw new Error('Environment "dev" not found in project "language-cards"');
  }

  const compose = devEnv.compose.find((c: any) => c.name === 'app');
  if (!compose) {
    throw new Error('Compose service "app" not found in dev environment');
  }

  const composeId = compose.composeId;
  console.log(`✓ Found dev compose: "${compose.name}" (ID: ${composeId})`);

  // 2. Fetch current compose details
  const composeDetails = await trpcCall('compose.one', 'GET', { composeId });
  const currentEnv = composeDetails.env || '';

  // 3. Update environment variables in Dokploy
  const envUpdates = {
    BASE_DOMAIN: `https://${DEV_DOMAIN}`,
    BASE_CORS_ORIGIN: `https://${DEV_DOMAIN}`,
    FRONTEND_API_BASE_URL: `https://${DEV_DOMAIN}/api/v1`,
    FRONTEND_MERCURE_PUBLIC_URL: `https://${DEV_DOMAIN}/.well-known/mercure`,
    FRONTEND_BASE_DOMAIN: `https://${DEV_DOMAIN}`,
  };

  console.log('\nUpdating dev compose environment variables...');
  for (const [k, v] of Object.entries(envUpdates)) {
    console.log(`  ${k} -> ${v}`);
  }

  const updatedEnv = updateEnvString(currentEnv, envUpdates);
  await trpcCall('compose.saveEnvironment', 'POST', {
    composeId,
    env: updatedEnv,
    createEnvFile: true,
  });
  console.log('✓ Environment variables saved successfully.');

  // 4. Configure Domains
  console.log('\nConfiguring Traefik domain routes...');
  const existingDomains = await trpcCall('domain.byComposeId', 'GET', { composeId });
  console.log(`Found ${existingDomains.length} existing domain(s) for this compose.`);

  const requiredRoutes = [
    {
      path: '/',
      serviceName: 'frontend',
      port: 5173,
      description: 'Frontend (Vite)',
    },
    {
      path: '/api/v1',
      serviceName: 'app',
      port: 3001,
      description: 'Backend API (Nest/Express)',
    },
    {
      path: '/.well-known/mercure',
      serviceName: 'mercure',
      port: 80,
      description: 'Mercure Hub (SSE)',
    },
  ];

  for (const route of requiredRoutes) {
    const existing = existingDomains.find(
      (d: any) => d.host === DEV_DOMAIN && (d.path === route.path || (!d.path && route.path === '/'))
    );

    if (existing) {
      console.log(`Updating existing domain for ${route.description} (${route.path} -> ${route.serviceName}:${route.port})...`);
      await trpcCall('domain.update', 'POST', {
        domainId: existing.domainId,
        host: DEV_DOMAIN,
        path: route.path,
        port: route.port,
        serviceName: route.serviceName,
        https: true,
        certificateType: 'letsencrypt',
        domainType: 'compose',
        enabled: true,
        stripPath: false,
      });
      console.log(`✓ Domain updated: ${existing.domainId}`);
    } else {
      console.log(`Creating new domain route for ${route.description} (${route.path} -> ${route.serviceName}:${route.port})...`);
      const newDomain = await trpcCall('domain.create', 'POST', {
        composeId,
        domainType: 'compose',
        host: DEV_DOMAIN,
        path: route.path,
        port: route.port,
        serviceName: route.serviceName,
        https: true,
        certificateType: 'letsencrypt',
        stripPath: false,
      });
      console.log(`✓ Domain created: ${newDomain?.domainId || 'OK'}`);
    }
  }

  // 5. Check if redeploy requested via argument
  if (process.argv.includes('--deploy')) {
    console.log('\nTriggering redeploy on Dokploy...');
    const deployment = await trpcCall('compose.redeploy', 'POST', {
      composeId,
    });
    console.log(`✓ Deployment triggered: ${deployment?.deploymentId || 'OK'}`);
  }

  console.log('\n🎉 Dokploy dev environment configuration completed successfully!');
}

main().catch((err) => {
  console.error('\n❌ Error configuring Dokploy dev environment:', err.message);
  process.exit(1);
});
