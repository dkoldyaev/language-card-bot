const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const scriptName = process.argv[2];
const scriptArgs = process.argv.slice(3);

if (!scriptName) {
  console.error('Usage: node run-script.js <script-name> [args...]');
  process.exit(1);
}

const distPath = path.resolve(__dirname, 'dist/scripts', `${scriptName}.js`);
const srcPath = path.resolve(__dirname, 'src/scripts', `${scriptName}.ts`);

let cmd;
let args;

if (fs.existsSync(distPath)) {
  cmd = process.execPath;
  args = [distPath, ...scriptArgs];
} else if (fs.existsSync(srcPath)) {
  cmd = 'npx';
  args = ['tsx', srcPath, ...scriptArgs];
} else {
  console.error(`Script not found: neither "${distPath}" nor "${srcPath}" exists.`);
  process.exit(1);
}

const result = spawnSync(cmd, args, { stdio: 'inherit' });
if (result.error) {
  console.error(result.error);
  process.exit(1);
}
process.exit(result.status ?? 0);
