import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');
const examplesRoot = path.join(root, 'examples');
const examplesDocsMd = path.join(root, 'docs/guide/examples.md');
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
      description: pkg.description || '暂无描述',
      dist: path.join(dir, 'dist'),
      previewPath: `/examples/${name}/`,
    });
  }

  examples.sort((a, b) => a.name.localeCompare(b.name));
  return examples;
}

function generateExamplesDoc(examples) {
  const lines = [
    '# 示例项目',
    '',
    '> 本页由 `pnpm pages:build` 自动生成，请勿手工编辑。',
    '',
    '| 项目 | 说明 | 预览地址 |',
    '| --- | --- | --- |',
  ];

  for (const example of examples) {
    lines.push(
      `| ${example.pkgName} | ${example.description} | <a href="${example.previewPath}" target="_blank">${example.previewPath}</a> |`,
    );
  }

  lines.push('');
  writeFileSync(examplesDocsMd, lines.join('\n'), 'utf8');
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

generateExamplesDoc(examples);
run('pnpm docs:build');

rmSync(examplesDistRoot, { recursive: true, force: true });
mkdirSync(examplesDistRoot, { recursive: true });

for (const example of examples) {
  const targetDir = path.join(examplesDistRoot, example.name);
  mkdirSync(targetDir, { recursive: true });
  cpSync(example.dist, targetDir, { recursive: true });
}
