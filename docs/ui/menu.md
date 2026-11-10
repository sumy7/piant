# Menu

`Menu` 将重命名、复制、归档等动作收进一个菜单。用户选择条目时，通过 `onAction` 执行对应操作。

<LiveExample example="uiMenu" title="打开菜单并执行项目操作" :height="460" hide-source />

## 用法

```tsx
import { View } from '@piant/core';
import { Menu, MenuContent, MenuTrigger } from '@piant/ui';

<Menu
  label="项目操作"
  items={[
    { value: 'rename', label: '重命名' },
    { value: 'archive', label: '归档' },
  ]}
  onAction={runProjectAction}
>
  {() => (
    <View>
      <MenuTrigger>项目操作</MenuTrigger>
      <MenuContent />
    </View>
  )}
</Menu>;
```

在同一个 [OverlayHost](/ui/overlays) 下使用触发器与内容。每项需要唯一的 `value` 和非空的 `label`。用 `disabled` 标记暂不可执行的条目。省略 `MenuContent` 的子节点时，菜单根据 `items` 生成内容。

点击或用 Enter / Space 打开菜单。方向键、Home / End 或输入名称前缀可以浏览条目，Enter / Space 执行当前项。Escape 关闭菜单并恢复触发器焦点。点击外部会先关闭菜单，这次点击不会触发后方动作。需要管理打开状态时使用 `open` 和 `onOpenChange`。

需要选择一个供后续使用的值时，用 [Select](/ui/select)。
