# create-piant

使用 CLI 快速创建 Piant 项目。

## 使用方式

```bash
# 使用 pnpm
pnpm create piant

# 使用 npm
npm create piant@latest

# 使用 yarn
yarn create piant
```

或者指定项目名称：

```bash
pnpm create piant my-app
```

## 可用模板

| 模板 | 说明 |
|------|------|
| `basic` | 基础应用模板（rsbuild + @piant/core） |

## 创建后

```bash
cd my-app
pnpm install
pnpm dev
```

## License

MIT
