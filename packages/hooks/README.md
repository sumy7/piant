# @piant/hooks

Piant 的键盘交互 hooks，提供 `useKey`、`useKeyPress`、`useKeyPressEvent` 和 `useKeystroke`，用于按键事件、按下状态和组合键处理。

## 安装

```bash
pnpm add @piant/hooks @piant/core "pixi.js@^8.22.0"
```

Peer 依赖为 `@piant/core ^0.2.0`。

本包仅提供 ESM 入口，使用 `import` 导入。

## 使用

在已配置 Piant JSX 的项目中，在组件内注册监听：

```tsx
import { View } from '@piant/core';
import { useKey } from '@piant/hooks';

export function KeyboardDemo() {
  useKey('Enter', () => {
    console.log('Enter pressed');
  });

  useKey(
    (event) => event.ctrlKey && event.key === 's',
    (event) => {
      event.preventDefault();
      console.log('Save');
    },
  );

  return <View style={{ width: 100, height: 100 }} />;
}
```

`useKey` 默认监听 `window` 的 `keydown`，可通过 `event` 和 `target` 选项修改。监听会在所属响应式 Owner 销毁时自动清理，应在组件或有效的响应式 Owner 内调用。

更多示例见 [useKey 文档](https://piant.sumygg.com/hooks/use-key)。

## 更多信息

- [文档](https://piant.sumygg.com/hooks/introduction)
- [源码仓库](https://github.com/sumy7/piant)
- [问题反馈](https://github.com/sumy7/piant/issues)
- [MIT 许可证](https://github.com/sumy7/piant/blob/main/LICENSE)
