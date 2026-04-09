# 简介

Piant 是一个基于 [PixiJS](https://pixijs.com/) 的画布（Canvas）布局引擎，提供类似 React 的声明式 JSX 编程模型与响应式状态管理，让开发者能够以熟悉的组件化方式在 WebGL/Canvas 上构建高性能的 2D 用户界面。

## 为什么选择 Piant？

传统 Web 应用使用 DOM 元素来排布界面，而 Piant 将所有内容渲染在 Canvas 画布上，具有以下优势：

- **高性能渲染**：基于 PixiJS 的 WebGL/Canvas 渲染，拥有极高的帧率和绘制性能
- **精确像素控制**：所有布局基于 Yoga 布局引擎，支持 Flexbox 语义，和 CSS 类似但在 Canvas 上原生执行
- **声明式 JSX**：使用与 React/Solid 相似的 JSX 语法编写 UI，降低学习成本
- **细粒度响应式**：基于 MobX 的细粒度响应式系统，数据变化时只更新必要的节点

## 核心技术栈

| 技术 | 作用 |
|------|------|
| [PixiJS](https://pixijs.com/) | WebGL/Canvas 渲染引擎 |
| [Yoga Layout](https://www.yogalayout.dev/) | Flexbox 布局引擎 |
| [MobX](https://mobx.js.org/) | 响应式状态管理 |
| [Babel](https://babeljs.io/) | JSX 转换（通过 `@piant/babel-preset-piant`） |

## 项目结构

Piant 是一个 monorepo，包含以下主要包：

- `@piant/core`：核心运行时，包含组件、响应式系统、渲染器和样式模块
- `@piant/babel-preset-piant`：Babel 预设，用于将 JSX 语法转换为运行时调用

## 下一步

- [快速开始](/guide/quick-start) — 5 分钟构建第一个 Piant 应用
- [安装与配置](/guide/installation) — 详细的环境搭建指南
