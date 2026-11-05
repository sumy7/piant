# Collapsible

在一个标题下展开或收起一块内容。对比预览里的两个面板，看看折叠后草稿是否保留。

<LiveExample example="uiCollapsible" title="Collapsible：保留与释放编辑内容的生命周期" :height="430" hide-source />

## 用法

```tsx
import { Collapsible, TextField } from '@piant/ui';

<Collapsible label="连接设置" defaultOpen mountStrategy="lazy">
  {() => <TextField aria-label="服务器地址" defaultValue="localhost" />}
</Collapsible>;
```

默认收起。用 `defaultOpen` 设置初值，或用 `open` 和 `onOpenChange` 从外部控制。点击标题，或聚焦后按 Enter / Space，均可切换展开状态。

默认折叠后释放内容。使用 `mountStrategy="lazy"` 可保留已打开过的编辑内容。要在同一组内协调多块内容的展开状态，使用 [Accordion](/ui/accordion)。
