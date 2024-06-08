<p align="center">
<img src="./build/icon.png" height="140" />
</p>
<h3 align="center"> Leser </h3>
<p align="center">
  一个现代风格的 RSS 跨平台桌面客户端（支持 macOS、Windows、Linux），基于 Electron + React 构建和开发
</p>
<hr/>

## 简介

支持接入大部分主流订阅源服务：

- Feedbin
- Inoreader
- Miniflux
- Google Reader API( FreshRSS )
- Fever API
- Nextcloud News API

## 预览

![image](https://github.com/KangodYan/leser/blob/master/resources/preview_image1.png)

![image](https://github.com/KangodYan/leser/blob/master/resources/preview_image2.png)

## 技术栈

- 主要技术：Electron + React 18
- 实现语言：TypeScript + CSS
- 构建工具：Vite 5
- UI 组件：FluentUI
- 状态库：Zustand
- 本地数据库：Nedb

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

## 鸣谢
- 本项目是在 [Fluent Reader](https://github.com/yang991178/fluent-reader) 基础上做的二次开发，并集成了 [Electron-Vite](https://github.com/alex8088/electron-vite) 作为整体构建
- 对 Fluent Reader 的改动如下：
  - 升级了 React 至 18，也升级了 Electron 和 FluentUI 版本，使用 Vite 5 替代了 Webpack，使用 Zustand 替换了 Redux
  - 还有一些页面布局的变化和细节上的优化，参考了 [Reeder 5](https://www.reederapp.com) Mac 桌面端
- 后续可能再考虑用其他组件替换 FluentUI，以及对 Nedb 的替换

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
