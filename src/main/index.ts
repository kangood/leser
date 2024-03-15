import { app, ipcMain, Menu, nativeTheme } from "electron" // 导入 Electron 相关模块
import { ThemeSettings, SchemaTypes } from "../renderer/src/schema-types" // 导入相关类型定义
import { store } from "./settings" // 导入存储配置的模块
import performUpdate from "./update-scripts" // 导入更新脚本的模块
import { WindowManager } from "./window" // 导入 WindowManager 类

// 在非 macOS 系统下，检查是否存在单实例锁，如果已经有实例在运行，则退出应用程序
if (!process.mas) {
    const locked = app.requestSingleInstanceLock()
    if (!locked) {
        app.quit()
    }
}

// 设置应用程序用户模型 ID
if (!app.isPackaged) {
    app.setAppUserModelId(process.execPath)
} else if (process.platform === "win32")
    app.setAppUserModelId("me.hyliu.fluentreader")

let restarting = false // 用于标记是否正在重新启动应用程序

function init() {
    performUpdate(store) // 执行应用程序更新
    nativeTheme.themeSource = store.get("theme", ThemeSettings.Default) // 设置主题来源为存储中的主题设置
}

init() // 初始化应用程序

// 在 macOS 系统下，设置菜单项和行为
if (process.platform === "darwin") {
    const template = [
        {
            label: "Application",
            submenu: [
                {
                    label: "Hide",
                    accelerator: "Command+H",
                    click: () => {
                        app.hide()
                    },
                },
                {
                    label: "Quit",
                    accelerator: "Command+Q",
                    click: () => {
                        if (winManager.hasWindow) winManager.mainWindow.close()
                    },
                },
            ],
        },
        {
            label: "Edit",
            submenu: [
                {
                    label: "Undo",
                    accelerator: "CmdOrCtrl+Z",
                    selector: "undo:",
                },
                {
                    label: "Redo",
                    accelerator: "Shift+CmdOrCtrl+Z",
                    selector: "redo:",
                },
                { label: "Cut", accelerator: "CmdOrCtrl+X", selector: "cut:" },
                {
                    label: "Copy",
                    accelerator: "CmdOrCtrl+C",
                    selector: "copy:",
                },
                {
                    label: "Paste",
                    accelerator: "CmdOrCtrl+V",
                    selector: "paste:",
                },
                {
                    label: "Select All",
                    accelerator: "CmdOrCtrl+A",
                    selector: "selectAll:",
                },
            ],
        },
        {
            label: "Window",
            submenu: [
                {
                    label: "Close",
                    accelerator: "Command+W",
                    click: () => {
                        if (winManager.hasWindow) winManager.mainWindow.close()
                    },
                },
                {
                    label: "Minimize",
                    accelerator: "Command+M",
                    click: () => {
                        if (winManager.hasWindow())
                            winManager.mainWindow.minimize()
                    },
                },
                { label: "Zoom", click: () => winManager.zoom() },
            ],
        },
    ]
    Menu.setApplicationMenu(Menu.buildFromTemplate(template)) // 构建并设置应用程序菜单
} else {
    Menu.setApplicationMenu(null) // 在其他平台下，禁用应用程序菜单
}

const winManager = new WindowManager() // 创建 WindowManager 实例用于管理窗口

// 当所有窗口关闭时，执行清除存储数据等操作
app.on("window-all-closed", () => {
    if (winManager.hasWindow()) {
        winManager.mainWindow.webContents.session.clearStorageData({
            storages: ["cookies", "localstorage"],
        })
    }
    winManager.mainWindow = null
    if (restarting) {
        restarting = false
        winManager.createWindow() // 重新创建窗口
    } else {
        app.quit() // 退出应用程序
    }
})

// 处理导入所有设置的 IPC 消息
ipcMain.handle("import-all-settings", (_, configs: SchemaTypes) => {
    restarting = true // 标记正在重新启动
    store.clear() // 清除存储中的所有设置
    for (let [key, value] of Object.entries(configs)) {
        store.set(key, value) // 逐个设置新的配置信息
    }
    performUpdate(store) // 执行更新操作
    nativeTheme.themeSource = store.get("theme", ThemeSettings.Default) // 设置主题来源
    setTimeout(
        () => {
            winManager.mainWindow.close()
        },
        process.platform === "darwin" ? 1000 : 0,
    ) // 延迟关闭窗口，macOS 下延迟 1000 毫秒
})
