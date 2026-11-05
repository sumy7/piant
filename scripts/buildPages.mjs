import { execSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const examplesRoot = path.join(root, 'examples');
const docsDist = path.join(root, 'docs/.vitepress/dist');
const examplesDistRoot = path.join(docsDist, 'examples');

function run(command, env = {}) {
  execSync(command, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, ...env },
  });
}

function discoverExamples() {
  const entries = readdirSync(examplesRoot, { withFileTypes: true });
  const examples = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    const name = entry.name;
    const dir = path.join(examplesRoot, name);
    const pkgPath = path.join(dir, 'package.json');

    if (!existsSync(pkgPath)) {
      continue;
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg?.name || !pkg?.scripts?.build) {
      continue;
    }

    examples.push({
      name,
      pkgName: pkg.name,
      dist: path.join(dir, 'dist'),
      previewPath: `/examples/${name}/`,
    });
  }

  examples.sort((a, b) => a.name.localeCompare(b.name));
  return examples;
}

const examples = discoverExamples();

if (examples.length === 0) {
  throw new Error('No buildable examples found under examples/.');
}

for (const example of examples) {
  run(`pnpm --filter ${example.pkgName} build`, {
    PIANT_ASSET_PREFIX: example.previewPath,
  });
}

run('pnpm docs:build');

rmSync(examplesDistRoot, { recursive: true, force: true });
mkdirSync(examplesDistRoot, { recursive: true });

for (const example of examples) {
  const targetDir = path.join(examplesDistRoot, example.name);
  mkdirSync(targetDir, { recursive: true });
  cpSync(example.dist, targetDir, { recursive: true });
}
