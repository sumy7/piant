语义 tokens、纯函数 createTheme、默认主题及实例级 UIProvider。公开入口统一由 src/index.ts 导出。主题只读，覆盖按组内叶子合并；Provider 通过稳定的响应式 accessor 更新后代，DOM 样式只写入显式 domRoot。
