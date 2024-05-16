# leser

## 简介

一个现代风格的 RSS 跨平台桌面客户端（支持 macOS、Windows、Linux），是基于 Electron 构建的 React 项目，支持接入大部分主流订阅源服务

本项目名字受 `state` 对应德语单词——zustand 的取名启发，故项目名使用德语 `reader` 单词——leser

## 预览

![image](https://github.com/KangodYan/leser/assets/36319737/15cc8c4b-5d30-4082-8b3c-cf5aa60d5128)

![image](https://github.com/KangodYan/leser/assets/36319737/ec8514ed-7e13-4c3b-9cca-9a5c8217ca6d)

## 特性

- TailwindCSS 与 Antd 整合
- 动态暗黑和 Antd 的动态国际化
- TanStack Query 异步加载和管理服务端状态
- 使用 token 和 refetch_token 实现无痛刷新
- 使用 RBAC 实现对资源（菜单和数据）和 api 的访问控制

## 技术栈

- 主要技术：Electron + React + TypeScript
- 构建工具：Vite
- UI 组件：FluentUI
- 状态库：Zustand

## 项目结构

```
├── build                                                 
│   ├── entitlements.mac.plist                            # macOS 应用的授权配置文件，是 macOS 应用在沙盒中运行时所需要的特殊权限
│   ├── icon.icns
│   ├── icon.ico
│   └── icon.png
├── dist                                                  # `electron-builder` 生成的可执行文件
│   ├── builder-debug.yml
│   ├── builder-effective-config.yaml
│   ├── leser-1.0.0-mac.zip
│   ├── leser-1.0.0-mac.zip.blockmap
│   ├── leser-1.0.0.dmg
│   ├── leser-1.0.0.dmg.blockmap
│   ├── latest-mac.yml
│   └── mac
│       └── leser.app
├── out                                                   # `electron-vite build` 生成的编译后文件
│   ├── main                                              
│   │   ├── fontlist
│   │   ├── fonts.vbs
│   │   └── index.js
│   ├── preload                                            
│   │   └── index.js
│   └── renderer                                          
│       ├── article
│       ├── assets
│       ├── icons
│       └── index.html
├── resources                                             # main 和 preload 共用的资源文件目录，由 vite 中配置插件，在 build 后复制文件到 out 目录对应位置
│   ├── fontlist
│   ├── fonts.vbs
│   └── icon.png
├── src
│   ├── main                                              # electron 的主进程文件
│   │   ├── index.ts
│   │   ├── settings.ts
│   │   ├── touchbar.ts
│   │   ├── update-scripts.ts
│   │   ├── utils.ts
│   │   └── window.ts
│   ├── preload                                           # electron 的预加载文件
│   │   ├── index.d.ts
│   │   └── index.ts
│   └── renderer                                          # electron 的渲染进程文件
│       ├── index.html                                    # HTML 入口文件
│       ├── public                                        # renderer 用的公共资源，打包时自动装载到 `out/renderer` 中
│       └── src                                           # 项目主体的源代码
├── dev-app-update.yml                                    # 应用自动更新的配置文件
├── electron-builder.yml                                  # `electron-builder` 的相关配置
├── electron.vite.config.ts                               # 基于 electron 的 vite 配置文件
├── package-lock.json                                     # npm 锁包文件
├── package.json                                          # npm 依赖配置
├── tsconfig.json                                         # 引入 typescript 的 node 和 web 配置文件
├── tsconfig.node.json                                    # `typescript.node` 配置，针对 Node.js 环境的 TypeScript 编译选项，在 electron 项目中主要用于 main
└── tsconfig.web.json                                     # `typescript.web` 配置，针对浏览器环境的 TypeScript 编译选项，在 electron 项目中主要用于 renderer
```

## 快速开始

### 安装依赖

```bash
$ npm install
```

### 本地启动

```bash
$ npm run dev
```

### 客户端构建

```bash
# For windows
$ npm run build:win

# For macOS
$ npm run build:mac

# For Linux
$ npm run build:linux
```
