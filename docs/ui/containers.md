# 页面切换与内容折叠

用 Tabs 切换页面，用 Collapsible 折叠独立区域，用 Accordion 管理一组折叠内容。

## Tabs

查看 [Tabs](/ui/tabs) 的用法。

<LiveExample example="uiTabs" title="Tabs：自动/手动激活、草稿保留与动态标签" :height="460" hide-source />

## Collapsible

查看 [Collapsible](/ui/collapsible) 的用法。

<LiveExample example="uiCollapsible" title="Collapsible：保留与释放编辑内容的生命周期" :height="430" hide-source />

## Accordion

查看 [Accordion](/ui/accordion) 的用法。

<LiveExample example="uiAccordion" title="Accordion：单开、多开、键盘导航与草稿保留" :height="700" hide-source />

## 面板生命周期

| `mountStrategy`     | 适用场景                                     |
| ------------------- | -------------------------------------------- |
| `'unmount'`（默认） | 切换或折叠后释放内容，下次打开从初值开始。   |
| `'lazy'`            | 首次打开时创建，之后保留面板中的草稿和状态。 |
| `'keepMounted'`     | 提前创建全部面板，随后切换时保留内容。       |

隐藏的面板不会进入键盘焦点顺序。条目从列表移除后，重新加入同一个 key 会创建新的内容。
