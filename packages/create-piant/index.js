#!/usr/bin/env node

import { existsSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, copyFileSync } from 'fs';
import { join, resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMPLATES = [
  { name: 'basic', dir: 'template-basic', description: '基础应用模板（rsbuild + @piant/core）' },
];

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

function colorize(text, color) {
  return `${color}${text}${RESET}`;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function promptSelect(question, options) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(question);
    options.forEach((opt, i) => {
      console.log(`  ${colorize(`${i + 1}.`, CYAN)} ${opt.name} ${colorize(`- ${opt.description}`, DIM)}`);
    });
    rl.question(`请输入选项编号 [1-${options.length}] (默认: 1): `, (answer) => {
      rl.close();
      const num = Number.parseInt(answer.trim(), 10);
      const idx = Number.isNaN(num) || num < 1 || num > options.length ? 0 : num - 1;
      resolve(options[idx]);
    });
  });
}

function copyDir(src, dest, replacements = {}) {
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(src)) {
    const srcPath = join(src, file);
    // rename _gitignore -> .gitignore, _package.json -> package.json (strip leading _)
    const destFile = file === '_gitignore'
      ? '.gitignore'
      : file.startsWith('_')
        ? file.slice(1)
        : file;
    const destPath = join(dest, destFile);
    const stat = statSync(srcPath);
    if (stat.isDirectory()) {
      copyDir(srcPath, destPath, replacements);
    } else {
      const ext = file.split('.').pop();
      const textExts = new Set(['json', 'ts', 'tsx', 'js', 'jsx', 'css', 'html', 'md', 'txt', 'gitignore']);
      if (textExts.has(ext)) {
        let content = readFileSync(srcPath, 'utf-8');
        for (const [from, to] of Object.entries(replacements)) {
          content = content.replaceAll(from, to);
        }
        writeFileSync(destPath, content, 'utf-8');
      } else {
        copyFileSync(srcPath, destPath);
      }
    }
  }
}

function isEmptyDir(dir) {
  if (!existsSync(dir)) return true;
  const files = readdirSync(dir);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

function toValidPackageName(name) {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[^a-z0-9]+/, '')
    .replace(/[^a-z0-9-._]+/g, '-')
    .replace(/-+$/, '');
}

async function main() {
  console.log();
  console.log(`${colorize('create-piant', BOLD + CYAN)} ${colorize('— 快速创建 Piant 项目', DIM)}`);
  console.log();

  // 1. Project name
  let projectName = process.argv[2]?.trim();
  if (!projectName) {
    projectName = await prompt(`项目名称 ${colorize('(默认: piant-app)', DIM)}: `);
    if (!projectName) projectName = 'piant-app';
  }

  const targetDir = resolve(process.cwd(), projectName);
  let packageName = toValidPackageName(basename(targetDir));

  if (!packageName) {
    const fallback = await prompt(`无法从路径推导包名，请输入包名 ${colorize('(默认: piant-app)', DIM)}: `);
    packageName = toValidPackageName(fallback) || 'piant-app';
  }

  if (!isEmptyDir(targetDir)) {
    console.log();
    console.log(colorize(`⚠ 目录 "${projectName}" 已存在且不为空，操作已取消。`, YELLOW));
    process.exit(1);
  }

  // 2. Choose template
  let template;
  if (TEMPLATES.length === 1) {
    template = TEMPLATES[0];
  } else {
    console.log();
    template = await promptSelect('请选择项目模板：', TEMPLATES);
  }

  // 3. Copy template
  const templateDir = join(__dirname, template.dir);
  const replacements = {
    'piant-app-template': packageName,
  };

  copyDir(templateDir, targetDir, replacements);

  // 4. Done
  const cdPath = projectName.includes('/') ? targetDir : projectName;

  console.log();
  console.log(colorize('✔ 项目创建成功！', GREEN));
  console.log();
  console.log('  请执行以下命令开始开发：');
  console.log();
  if (cdPath !== '.') {
    console.log(`  ${colorize('cd', BOLD)} ${cdPath}`);
  }
  console.log(`  ${colorize('pnpm install', BOLD)}`);
  console.log(`  ${colorize('pnpm dev', BOLD)}`);
  console.log();
}

main().catch((e) => {
  console.error(colorize(`\n错误：${e.message}`, RED));
  process.exit(1);
});
