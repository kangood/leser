import { ipcMain, shell, dialog, app, session, clipboard } from "electron" // 导入 Electron 的模块
import { WindowManager } from "./window" // 导入窗口管理器
import fs from "fs" // 导入文件系统模块
import { ImageCallbackTypes, TouchBarTexts } from "../renderer/src/schema-types" // 导入自定义类型
import { initMainTouchBar } from "./touchbar" // 导入 Touch Bar 初始化函数
import fontList from "font-list" // 导入字体列表模块

// 设置实用程序监听器函数
export function setUtilsListeners(manager: WindowManager) {
    // 打开外部链接函数
    async function openExternal(url: string, background = false) {
        // 检查是否为 HTTP 或 HTTPS 链接
        if (url.startsWith("https://") || url.startsWith("http://")) {
            // 如果在后台打开并且是 macOS
            if (background && process.platform === "darwin") {
                shell.openExternal(url, { activate: false }) // 在后台打开外部链接
            } else if (background && manager.hasWindow()) {
                // 如果在后台打开并且有窗口
                manager.mainWindow.setAlwaysOnTop(true) // 窗口始终置顶
                await shell.openExternal(url) // 在外部打开链接
                setTimeout(() => manager.mainWindow.setAlwaysOnTop(false), 1000) // 1 秒后取消置顶
            } else {
                // 否则直接打开外部链接
                shell.openExternal(url)
            }
        }
    }

    // 监听 WebContents 创建事件
    app.on("web-contents-created", (_, contents) => {
        // 设置窗口打开行为
        contents.setWindowOpenHandler(details => {
            // 如果是 Webview 类型
            if (contents.getType() === "webview")
                // 打开外部链接
                openExternal(
                    details.url,
                    details.disposition === "background-tab",
                )
            return {
                action: manager.hasWindow() ? "deny" : "allow", // 根据窗口状态决定是否允许打开窗口
            }
        })
        contents.on("will-navigate", (event, url) => {
            event.preventDefault()
            if (contents.getType() === "webview") openExternal(url) // 如果是 Webview 类型，打开外部链接
        })
    })

    ipcMain.on("get-version", event => {
        event.returnValue = app.getVersion() // 获取应用版本号并返回给前端
    })

    // 处理打开外部链接请求
    ipcMain.handle("open-external", (_, url: string, background: boolean) => {
        openExternal(url, background) // 调用打开外部链接函数
    })

    // 处理显示错误框请求
    ipcMain.handle(
        "show-error-box",
        async (_, title, content, copy?: string) => {
            if (manager.hasWindow() && copy != null) {
                const response = await dialog.showMessageBox(
                    manager.mainWindow,
                    {
                        type: "error",
                        title: title,
                        message: title,
                        detail: content,
                        buttons: ["OK", copy],
                        cancelId: 0,
                        defaultId: 0,
                    },
                )
                if (response.response === 1) {
                    clipboard.writeText(`${title}: ${content}`) // 复制错误信息到剪贴板
                }
            } else {
                dialog.showErrorBox(title, content) // 显示错误框
            }
        },
    )

    // 处理显示消息框请求
    ipcMain.handle(
        "show-message-box",
        async (_, title, message, confirm, cancel, defaultCancel, type) => {
            if (manager.hasWindow()) {
                let response = await dialog.showMessageBox(manager.mainWindow, {
                    type: type,
                    title: title,
                    message: title,
                    detail: message,
                    buttons:
                        process.platform === "win32"
                            ? ["Yes", "No"]
                            : [confirm, cancel],
                    cancelId: 1,
                    defaultId: defaultCancel ? 1 : 0,
                })
                return response.response === 0 // 返回用户选择结果
            } else {
                return false
            }
        },
    )

    // 处理显示保存对话框请求
    ipcMain.handle(
        "show-save-dialog",
        async (_, filters: Electron.FileFilter[], path: string) => {
            ipcMain.removeAllListeners("write-save-result") // 移除保存结果监听器
            if (manager.hasWindow()) {
                let response = await dialog.showSaveDialog(manager.mainWindow, {
                    defaultPath: path,
                    filters: filters,
                })
                if (!response.canceled) {
                    ipcMain.handleOnce(
                        "write-save-result",
                        (_, result, errmsg) => {
                            fs.writeFile(response.filePath, result, err => {
                                if (err)
                                    dialog.showErrorBox(errmsg, String(err)) // 显示保存错误框
                            })
                        },
                    )
                    return true
                }
            }
            return false
        },
    )

    // 处理显示打开对话框请求
    ipcMain.handle(
        "show-open-dialog",
        async (_, filters: Electron.FileFilter[]) => {
            if (manager.hasWindow()) {
                let response = await dialog.showOpenDialog(manager.mainWindow, {
                    filters: filters,
                    properties: ["openFile"],
                })
                if (!response.canceled) {
                    try {
                        return await fs.promises.readFile(
                            response.filePaths[0],
                            "utf-8",
                        ) // 读取文件内容并返回
                    } catch (err) {
                        console.log(err)
                    }
                }
            }
            return null
        },
    )

    // 处理获取缓存大小请求
    ipcMain.handle("get-cache", async () => {
        return await session.defaultSession.getCacheSize() // 返回默认会话的缓存大小
    })

    // 处理清除缓存请求
    ipcMain.handle("clear-cache", async () => {
        await session.defaultSession.clearCache() // 清除默认会话的缓存
    })

    // 监听 WebContents 创建事件
    app.on("web-contents-created", (_, contents) => {
        if (contents.getType() === "webview") {
            // 监听 Webview 加载失败事件
            contents.on(
                "did-fail-load",
                (event, code, desc, validated, isMainFrame) => {
                    if (isMainFrame && manager.hasWindow()) {
                        manager.mainWindow.webContents.send(
                            "webview-error",
                            desc,
                        ) // 发送 Webview 加载错误消息
                    }
                },
            )
            // 监听右键菜单事件
            contents.on("context-menu", (_, params) => {
                if (
                    (params.hasImageContents ||
                        params.selectionText ||
                        params.linkURL) &&
                    manager.hasWindow()
                ) {
                    if (params.hasImageContents) {
                        ipcMain.removeHandler("image-callback")
                        ipcMain.handleOnce(
                            "image-callback",
                            (_, type: ImageCallbackTypes) => {
                                switch (type) {
                                    case ImageCallbackTypes.OpenExternal:
                                    case ImageCallbackTypes.OpenExternalBg:
                                        openExternal(
                                            params.srcURL,
                                            type ===
                                                ImageCallbackTypes.OpenExternalBg,
                                        ) // 打开外部链接或后台打开
                                        break
                                    case ImageCallbackTypes.SaveAs:
                                        contents.session.downloadURL(
                                            params.srcURL,
                                        ) // 下载图片
                                        break
                                    case ImageCallbackTypes.Copy:
                                        contents.copyImageAt(params.x, params.y) // 复制图片
                                        break
                                    case ImageCallbackTypes.CopyLink:
                                        clipboard.writeText(params.srcURL) // 复制链接
                                        break
                                }
                            },
                        )
                        manager.mainWindow.webContents.send(
                            "webview-context-menu",
                            [params.x, params.y],
                        ) // 发送 Webview 右键菜单消息
                    } else {
                        manager.mainWindow.webContents.send(
                            "webview-context-menu",
                            [params.x, params.y],
                            params.selectionText,
                            params.linkURL,
                        ) // 发送 Webview 右键菜单消息
                    }
                    contents
                        .executeJavaScript(
                            `new Promise(resolve => {
                        const dismiss = () => {
                            document.removeEventListener("mousedown", dismiss)
                            document.removeEventListener("scroll", dismiss)                            
                            resolve()
                        }
                        document.addEventListener("mousedown", dismiss)
                        document.addEventListener("scroll", dismiss)
                    })`,
                        )
                        .then(() => {
                            if (manager.hasWindow()) {
                                manager.mainWindow.webContents.send(
                                    "webview-context-menu",
                                ) // 发送 Webview 右键菜单消息
                            }
                        })
                }
            })
            // 监听键盘事件
            contents.on("before-input-event", (_, input) => {
                if (manager.hasWindow()) {
                    let contents = manager.mainWindow.webContents
                    contents.send("webview-keydown", input) // 发送键盘按下消息
                }
            })
        }
    })

    // 处理写入剪贴板请求
    ipcMain.handle("write-clipboard", (_, text) => {
        clipboard.writeText(text) // 写入文本到剪贴板
    })

    // 处理关闭窗口请求
    ipcMain.handle("close-window", () => {
        if (manager.hasWindow()) manager.mainWindow.close() // 关闭窗口
    })

    // 处理最小化窗口请求
    ipcMain.handle("minimize-window", () => {
        if (manager.hasWindow()) manager.mainWindow.minimize() // 最小化窗口
    })

    // 处理最大化窗口请求
    ipcMain.handle("maximize-window", () => {
        manager.zoom() // 最大化/取消最大化窗口
    })

    // 监听是否最大化事件
    ipcMain.on("is-maximized", event => {
        event.returnValue =
            Boolean(manager.mainWindow) && manager.mainWindow.isMaximized() // 返回窗口是否最大化状态
    })

    // 监听是否聚焦事件
    ipcMain.on("is-focused", event => {
        event.returnValue =
            manager.hasWindow() && manager.mainWindow.isFocused() // 返回窗口是否聚焦状态
    })

    // 监听是否全屏事件
    ipcMain.on("is-fullscreen", event => {
        event.returnValue =
            manager.hasWindow() && manager.mainWindow.isFullScreen() // 返回窗口是否全屏状态
    })

    // 处理请求聚焦事件
    ipcMain.handle("request-focus", () => {
        if (manager.hasWindow()) {
            const win = manager.mainWindow
            if (win.isMinimized()) win.restore() // 如果窗口最小化则恢复
            if (process.platform === "win32") {
                win.setAlwaysOnTop(true) // Windows 平台窗口置顶
                win.setAlwaysOnTop(false)
            }
            win.focus() // 聚焦窗口
        }
    })

    // 处理请求注意力事件
    ipcMain.handle("request-attention", () => {
        if (manager.hasWindow() && !manager.mainWindow.isFocused()) {
            if (process.platform === "win32") {
                manager.mainWindow.flashFrame(true) // Windows 平台窗口闪烁
                manager.mainWindow.once("focus", () => {
                    manager.mainWindow.flashFrame(false) // 取消窗口闪烁
                })
            } else if (process.platform === "darwin") {
                app.dock.bounce() // macOS 平台 Dock 弹跳
            }
        }
    })

    // 处理 Touch Bar 初始化事件
    ipcMain.handle("touchbar-init", (_, texts: TouchBarTexts) => {
        if (manager.hasWindow()) initMainTouchBar(texts, manager.mainWindow) // 初始化 Touch Bar
    })

    // 处理 Touch Bar 销毁事件
    ipcMain.handle("touchbar-destroy", () => {
        if (manager.hasWindow()) manager.mainWindow.setTouchBar(null) // 销毁 Touch Bar
    })

    // 处理初始化字体列表事件
    ipcMain.handle("init-font-list", () => {
        return fontList.getFonts({
            disableQuoting: true, // 禁用引号
        }) // 获取字体列表
    })
}
