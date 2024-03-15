import windowStateKeeper from "electron-window-state" // 导入用于保持窗口状态的模块
import { BrowserWindow, nativeTheme, app } from "electron" // 导入 Electron 的 BrowserWindow、nativeTheme 和 app 模块
import { join } from "path" // 导入 Node.js 的 path 模块
import { setThemeListener } from "./settings" // 导入设置主题的监听器
import { setUtilsListeners } from "./utils" // 导入实用程序监听器
import { is } from "@electron-toolkit/utils" // 导入工具函数 is

// 定义窗口管理器类
export class WindowManager {
    mainWindow: BrowserWindow = null // 主窗口的引用，默认为 null
    private mainWindowState: windowStateKeeper.State // 主窗口的状态对象

    constructor() {
        this.init() // 在构造函数中调用 init 方法初始化
    }

    private init = () => {
        // 当应用程序准备就绪时执行
        app.on("ready", () => {
            this.mainWindowState = windowStateKeeper({
                // 使用 windowStateKeeper 创建主窗口状态对象
                defaultWidth: 1200, // 默认宽度
                defaultHeight: 700, // 默认高度
            })
            this.setListeners() // 设置监听器
            this.createWindow() // 创建窗口
        })
    }

    // 设置各种监听器
    private setListeners = () => {
        setThemeListener(this) // 设置主题监听器
        setUtilsListeners(this) // 设置实用程序监听器

        // 当应用程序尝试打开第二个实例时执行
        app.on("second-instance", () => {
            if (this.mainWindow !== null) {
                // 如果主窗口存在
                this.mainWindow.focus() // 聚焦主窗口
            }
        })

        // 当应用程序被激活时执行（macOS专用）
        app.on("activate", () => {
            // 如果主窗口不存在
            if (this.mainWindow === null) {
                this.createWindow() // 创建窗口
            }
        })
    }

    // 创建窗口的方法
    createWindow = () => {
        // 如果没有窗口
        if (!this.hasWindow()) {
            // 创建浏览器窗口
            this.mainWindow = new BrowserWindow({
                title: "Fluent Reader", // 窗口标题
                // 背景颜色
                backgroundColor:
                    process.platform === "darwin" // macOS
                        ? "#00000000" // 透明背景
                        : nativeTheme.shouldUseDarkColors // 是否使用暗色主题
                          ? "#282828" // 暗色背景
                          : "#faf9f8", // 默认背景
                vibrancy: "sidebar", // 侧边栏模糊效果（macOS专用）
                x: this.mainWindowState.x, // 窗口 X 坐标
                y: this.mainWindowState.y, // 窗口 Y 坐标
                width: this.mainWindowState.width, // 窗口宽度
                height: this.mainWindowState.height, // 窗口高度
                minWidth: 992, // 最小宽度
                minHeight: 600, // 最小高度
                frame: process.platform === "darwin", // 是否显示窗口框架（macOS专用）
                titleBarStyle: "hiddenInset", // 标题栏样式（macOS专用）
                fullscreenable: process.platform === "darwin", // 是否允许全屏（macOS专用）
                show: false, // 初始化时不显示窗口
                // WebPreferences 选项
                webPreferences: {
                    webviewTag: true, // 是否启用 <webview> 标签
                    contextIsolation: true, // 是否启用上下文隔离
                    spellcheck: false, // 是否启用拼写检查
                    preload: join(__dirname, "../preload/index.js"), // 预加载脚本的路径
                    sandbox: false, // 是否启用沙箱环境
                },
            })
            this.mainWindowState.manage(this.mainWindow) // 管理主窗口状态

            // 当窗口准备好显示时，显示窗口，并在开发环境打开控制台
            this.mainWindow.on("ready-to-show", () => {
                this.mainWindow.show() // 显示窗口
                this.mainWindow.focus() // 窗口聚焦
                if (!app.isPackaged) this.mainWindow.webContents.openDevTools() // 开发环境下打开开发者工具
            })

            // 根据环境加载已启动服务的 URL（开发环境）或本地 HTML 文件（生产环境）
            if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
                this.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"]) // 加载 URL
            } else {
                this.mainWindow.loadFile(
                    join(__dirname, "../renderer/index.html"), // 加载本地 HTML 文件
                )
            }

            // 监听窗口事件
            // 最大化事件
            this.mainWindow.on("maximize", () => {
                this.mainWindow.webContents.send("maximized") // 发送最大化消息
            })
            // 取消最大化事件
            this.mainWindow.on("unmaximize", () => {
                this.mainWindow.webContents.send("unmaximized") // 发送取消最大化消息
            })
            // 进入全屏事件
            this.mainWindow.on("enter-full-screen", () => {
                this.mainWindow.webContents.send("enter-fullscreen") // 发送进入全屏消息
            })
            // 离开全屏事件
            this.mainWindow.on("leave-full-screen", () => {
                this.mainWindow.webContents.send("leave-fullscreen") // 发送离开全屏消息
            })
            // 窗口聚焦事件
            this.mainWindow.on("focus", () => {
                this.mainWindow.webContents.send("window-focus") // 发送窗口聚焦消息
            })
            // 窗口失焦事件
            this.mainWindow.on("blur", () => {
                this.mainWindow.webContents.send("window-blur") // 发送窗口失焦消息
            })
            // 右键菜单事件
            this.mainWindow.webContents.on("context-menu", (_, params) => {
                // 如果有选中文本
                if (params.selectionText) {
                    // 发送右键菜单消息
                    this.mainWindow.webContents.send(
                        "window-context-menu",
                        [params.x, params.y], // 鼠标位置
                        params.selectionText, // 选中文本
                    )
                }
            })
        }
    }

    // 最大化/取消最大化方法
    zoom = () => {
        // 如果有窗口
        if (this.hasWindow()) {
            // 如果窗口已最大化
            if (this.mainWindow.isMaximized()) {
                this.mainWindow.unmaximize() // 取消最大化
            } else {
                this.mainWindow.maximize() // 最大化窗口
            }
        }
    }

    // 检查是否有窗口
    hasWindow = () => {
        return this.mainWindow !== null && !this.mainWindow.isDestroyed() // 返回是否存在且未销毁
    }
}
