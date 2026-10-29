#!/usr/bin/env node

import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMPLATES = [
  { name: 'basic', description: '基础应用模板（Rsbuild + @piant/core）' },
  {
    name: 'router',
    description: '路由模板（首页、动态用户页与 browser history）',
  },
];

const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const CYAN = '\x1b[36m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';

function colorize(text, color) {
  return `${color}${text}${RESET}`;
}

function parseArgs(args) {
  const options = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--') continue;
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--devtools' || arg === '--no-devtools') {
      const enabled = arg === '--devtools';
      if (options.devtools !== undefined && options.devtools !== enabled) {
        throw new Error('--devtools 与 --no-devtools 不能同时使用。');
      }
      options.devtools = enabled;
    } else if (
      arg === '--template' ||
      arg === '-t' ||
      arg.startsWith('--template=')
    ) {
      const value = arg.startsWith('--template=') ? arg.slice(11) : args[++i];
      if (!TEMPLATES.some((template) => template.name === value)) {
        throw new Error('模板必须为 basic 或 router。');
      }
      options.template = value;
    } else if (arg.startsWith('-')) throw new Error(`未知选项：${arg}`);
    else if (options.projectName !== undefined)
      throw new Error('只能指定一个项目目录。');
    else options.projectName = arg.trim();
  }
  return options;
}

function createPrompts() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const answers = rl[Symbol.asyncIterator]();
  let cancelled = false;
  rl.on('SIGINT', () => {
    cancelled = true;
    rl.close();
  });
  return {
    async ask(question) {
      process.stdout.write(question);
      const answer = await answers.next();
      if (cancelled || answer.done) throw new Error('操作已取消。');
      return answer.value.trim();
    },
    close: () => rl.close(),
  };
}

async function selectTemplate(ask) {
  console.log('请选择项目模板：');
  TEMPLATES.forEach((option, i) => {
    console.log(`  ${i + 1}. ${option.name} - ${option.description}`);
  });
  const answer = await ask('请输入选项编号 [1-2] (默认: 1): ');
  if (!answer) return 'basic';
  if (!/^[12]$/.test(answer)) throw new Error('无效模板编号。');
  return TEMPLATES[Number(answer) - 1].name;
}

function copyDir(src, dest, replacements = {}) {
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(src)) {
    const srcPath = join(src, file);
    // rename _gitignore -> .gitignore, _package.json -> package.json (strip leading _)
    const destFile =
      file === '_gitignore'
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
      const textExts = new Set([
        'json',
        'ts',
        'tsx',
        'js',
        'jsx',
        'css',
        'html',
        'md',
        'txt',
        'gitignore',
      ]);
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
  if (!lstatSync(dir).isDirectory() || lstatSync(dir).isSymbolicLink())
    return false;
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
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(`用法：create-piant [项目目录] [选项]
  -t, --template <basic|router>  选择模板（默认 basic）
      --devtools               加入开发态 DevTools
      --no-devtools            不加入 DevTools（默认）
  -h, --help                   显示帮助
交互终端会询问未指定的选项；非交互环境使用默认值。`);
    return;
  }
  console.log(
    `\n${colorize('create-piant', BOLD + CYAN)} — 快速创建 Piant 项目\n`,
  );
  const prompts =
    process.stdin.isTTY && process.stdout.isTTY ? createPrompts() : null;
  try {
    const projectName =
      options.projectName ||
      (prompts ? await prompts.ask('项目名称 (默认: piant-app): ') : '') ||
      'piant-app';
    const targetDir = resolve(process.cwd(), projectName);
    let packageName = toValidPackageName(basename(targetDir));
    if (!packageName) {
      const fallback = prompts
        ? await prompts.ask('请输入包名 (默认: piant-app): ')
        : '';
      packageName = toValidPackageName(fallback) || 'piant-app';
    }
    const assertEmpty = () => {
      if (!isEmptyDir(targetDir))
        throw new Error(
          `目录 "${projectName}" 已存在且不为空或不是普通目录，操作已取消。`,
        );
    };
    assertEmpty();
    const template =
      options.template ??
      (prompts ? await selectTemplate(prompts.ask) : 'basic');
    let devtools = options.devtools ?? false;
    if (options.devtools === undefined && prompts) {
      const answer = await prompts.ask('加入开发态 DevTools？[y/N]: ');
      if (answer && !/^(y|yes|n|no)$/i.test(answer))
        throw new Error('请输入 y 或 n。');
      devtools = /^(y|yes)$/i.test(answer);
    }
    assertEmpty();
    const replacements = { 'piant-app-template': packageName };
    copyDir(join(__dirname, 'template-basic'), targetDir, replacements);
    if (template === 'router')
      copyDir(join(__dirname, 'template-router'), targetDir, replacements);
    if (devtools)
      copyDir(join(__dirname, 'template-devtools'), targetDir, replacements);
    const packagePath = join(targetDir, 'package.json');
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    if (template === 'router') pkg.dependencies['@piant/router'] = '^0.2.0';
    if (devtools) pkg.devDependencies['@piant/devtools'] = '^0.2.0';
    writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

    console.log(
      colorize(
        `\n✔ 项目创建成功！(${template}${devtools ? ' + DevTools' : ''})`,
        GREEN,
      ),
    );
    console.log('\n  请执行以下命令开始开发：\n');
    if (projectName !== '.') {
      const quotedPath = `'${targetDir.replaceAll("'", "'\\''")}'`;
      console.log(`  cd ${quotedPath}`);
    }
    console.log(
      '  pnpm install\n  pnpm dev\n\n  检查与构建：pnpm typecheck && pnpm build\n',
    );
  } finally {
    prompts?.close();
  }
}

main().catch((error) => {
  console.error(colorize(`\n错误：${error.message}`, RED));
  process.exitCode = 1;
});
