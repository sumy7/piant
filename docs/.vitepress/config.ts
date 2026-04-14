import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Piant',
  description: '基于 PixiJS 的画布布局引擎',
  lang: 'zh-CN',
  ignoreDeadLinks: [/^\/examples\//],

  themeConfig: {
    nav: [
      { text: '指南', link: '/guide/introduction' },
      { text: 'Router', link: '/router/introduction' },
      { text: 'Store', link: '/store/introduction' },
      { text: 'Hooks', link: '/hooks/introduction' },
      { text: '参考', link: '/reference/overview' },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始使用',
          items: [
            { text: '简介', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '安装与配置', link: '/guide/installation' },
            { text: '示例项目', link: '/guide/examples' },
          ],
        },
        {
          text: '核心概念',
          items: [
            { text: 'Canvas 布局', link: '/guide/canvas-layout' },
            { text: 'JSX 语法', link: '/guide/jsx' },
            { text: '响应式系统', link: '/guide/reactivity' },
          ],
        },
        {
          text: '内置组件',
          items: [
            { text: 'View', link: '/guide/components/view' },
            { text: 'Image', link: '/guide/components/image' },
            { text: 'Text', link: '/guide/components/text' },
            { text: 'ScrollView', link: '/guide/components/scrollview' },
            { text: 'CustomView', link: '/guide/components/customview' },
          ],
        },
        {
          text: '控制流',
          items: [
            { text: 'Show', link: '/guide/control-flow/show' },
            { text: 'For 与 Index', link: '/guide/control-flow/for' },
            { text: 'Switch 与 Match', link: '/guide/control-flow/switch' },
            { text: 'Dynamic', link: '/guide/control-flow/dynamic' },
            {
              text: 'ErrorBoundary',
              link: '/guide/control-flow/error-boundary',
            },
          ],
        },
        {
          text: '样式系统',
          items: [
            { text: 'StyleSheet', link: '/guide/styling/stylesheet' },
            { text: '布局样式', link: '/guide/styling/layout' },
            { text: '视觉样式', link: '/guide/styling/visual' },
          ],
        },
        {
          text: '事件与交互',
          items: [{ text: '事件处理', link: '/guide/events' }],
        },
        {
          text: '生命周期',
          items: [{ text: '生命周期钩子', link: '/guide/lifecycle' }],
        },
      ],
      '/reference/': [
        {
          text: 'API 参考',
          items: [
            { text: '总览', link: '/reference/overview' },
            { text: '组件 API', link: '/reference/components' },
            { text: '响应式 API', link: '/reference/reactivity' },
            { text: '渲染 API', link: '/reference/renderer' },
            { text: '样式 API', link: '/reference/stylesheet' },
          ],
        },
      ],
      '/router/': [
        {
          text: 'Router 指南',
          items: [
            { text: '简介', link: '/router/introduction' },
            { text: '快速开始', link: '/router/quick-start' },
            { text: 'API 参考', link: '/router/api' },
          ],
        },
      ],
      '/store/': [
        {
          text: 'Store 指南',
          items: [
            { text: '简介', link: '/store/introduction' },
            { text: '快速开始', link: '/store/quick-start' },
            { text: 'API 参考', link: '/store/api' },
          ],
        },
        {
          text: 'Middleware',
          items: [
            { text: 'combine', link: '/store/middleware/combine' },
            { text: 'persist', link: '/store/middleware/persist' },
          ],
        },
      ],
      '/hooks/': [
        {
          text: 'Hooks 指南',
          items: [
            { text: '简介', link: '/hooks/introduction' },
          ],
        },
        {
          text: 'Hooks',
          items: [
            { text: 'useKey', link: '/hooks/use-key' },
            { text: 'useKeyPress', link: '/hooks/use-key-press' },
            { text: 'useKeyPressEvent', link: '/hooks/use-key-press-event' },
            { text: 'useKeystroke', link: '/hooks/use-keystroke' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/sumy7/piant' }],

    footer: {
      message: 'Released under the MIT License.',
    },
  },
});
