import windowStateKeeper from "electron-window-state"
import { BrowserWindow, nativeTheme, app } from "electron"
import { join } from "path"
import { setThemeListener } from "./settings"
import { setUtilsListeners } from "./utils"
import { is } from "@electron-toolkit/utils"

export class WindowManager {
    mainWindow: BrowserWindow = null
    private mainWindowState: windowStateKeeper.State

    constructor() {
        this.init()
    }

    private init = () => {
        app.on("ready", () => {
            this.mainWindowState = windowStateKeeper({
                defaultWidth: 1200,
                defaultHeight: 700,
            })
            this.setListeners()
            this.createWindow()
        })
    }

    private setListeners = () => {
        setThemeListener(this)
        setUtilsListeners(this)

        app.on("second-instance", () => {
            if (this.mainWindow !== null) {
                this.mainWindow.focus()
            }
        })

        app.on("activate", () => {
            if (this.mainWindow === null) {
                this.createWindow()
            }
        })
    }

    createWindow = () => {
        if (!this.hasWindow()) {
            // 创建浏览器窗口
            this.mainWindow = new BrowserWindow({
                title: "Fluent Reader",
                backgroundColor:
                    process.platform === "darwin"
                        ? "#00000000"
                        : nativeTheme.shouldUseDarkColors
                          ? "#282828"
                          : "#faf9f8",
                vibrancy: "sidebar",
                x: this.mainWindowState.x,
                y: this.mainWindowState.y,
                width: this.mainWindowState.width,
                height: this.mainWindowState.height,
                minWidth: 992,
                minHeight: 600,
                frame: process.platform === "darwin",
                titleBarStyle: "hiddenInset",
                fullscreenable: process.platform === "darwin",
                show: false,
                webPreferences: {
                    webviewTag: true,
                    contextIsolation: true,
                    spellcheck: false,
                    // 预加载脚本的文件路径
                    preload: join(__dirname, "../preload/index.js"),
                    // 是否启用沙箱环境
                    sandbox: false,
                },
            })
            this.mainWindowState.manage(this.mainWindow)
            // 当窗口准备好显示时，显示窗口，并在开发环境打开控制台
            this.mainWindow.on("ready-to-show", () => {
                this.mainWindow.show()
                this.mainWindow.focus()
                if (!app.isPackaged) this.mainWindow.webContents.openDevTools()
            })
            // 基于 electron-vite cli 的 HMR 渲染器
            // 根据环境加载已启动服务的 URL（开发环境）或本地 HTML 文件（生产环境）
            if (is.dev && process.env["ELECTRON_RENDERER_URL"]) {
                this.mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"])
            } else {
                this.mainWindow.loadFile(
                    join(__dirname, "../renderer/index.html"),
                )
            }

            this.mainWindow.on("maximize", () => {
                this.mainWindow.webContents.send("maximized")
            })
            this.mainWindow.on("unmaximize", () => {
                this.mainWindow.webContents.send("unmaximized")
            })
            this.mainWindow.on("enter-full-screen", () => {
                this.mainWindow.webContents.send("enter-fullscreen")
            })
            this.mainWindow.on("leave-full-screen", () => {
                this.mainWindow.webContents.send("leave-fullscreen")
            })
            this.mainWindow.on("focus", () => {
                this.mainWindow.webContents.send("window-focus")
            })
            this.mainWindow.on("blur", () => {
                this.mainWindow.webContents.send("window-blur")
            })
            this.mainWindow.webContents.on("context-menu", (_, params) => {
                if (params.selectionText) {
                    this.mainWindow.webContents.send(
                        "window-context-menu",
                        [params.x, params.y],
                        params.selectionText,
                    )
                }
            })
        }
    }

    zoom = () => {
        if (this.hasWindow()) {
            if (this.mainWindow.isMaximized()) {
                this.mainWindow.unmaximize()
            } else {
                this.mainWindow.maximize()
            }
        }
    }

    hasWindow = () => {
        return this.mainWindow !== null && !this.mainWindow.isDestroyed()
    }
}
