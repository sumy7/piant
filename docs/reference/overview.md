# API 参考总览

本节提供 `@piant/core` 包所有公共 API 的快速查阅。

## 导出内容

```ts
// 组件
export { View } from './components/View';
export { Image } from './components/Image';
export { ScrollView } from './components/ScrollView';
export { Text, Span, Img } from './components/Text';
export { CustomView } from './components/CustomView';

// 控制流组件
export { Show } from './components/Show';
export { For, Index } from './components/For';
export { Switch, Match } from './components/Switch';
export { Dynamic } from './components/Dynamic';
export { ErrorBoundary } from './components/ErrorBoundary';

// 根节点
export { PRoot } from './elements/PRoot';

// 响应式 API
export { createState, createEffect, createMemo, onMount, onCleanup, onError, createSelector } from './reactivity/hooks';
export { createContext, useContext } from './reactivity/context';
export { memo } from './reactivity/effects';

// 渲染器
export { render } from './renderer';

// 样式
export { StyleSheet } from './styleSheet';

// 钩子
export { onTick } from './hooks/onTick';
```

## 快速导航

- [组件 API](/reference/components) — View、Image、Text 等组件的 Props 总表
- [响应式 API](/reference/reactivity) — createState、createEffect 等响应式原语
- [渲染 API](/reference/renderer) — render、PRoot
- [样式 API](/reference/stylesheet) — StyleSheet、ViewStyles 类型
