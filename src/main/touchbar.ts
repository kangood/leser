import { TouchBarTexts } from "../renderer/src/schema-types" // 导入触摸栏文本类型
import { BrowserWindow, TouchBar } from "electron" // 导入 Electron 的 BrowserWindow 和 TouchBar 模块

// 创建触摸栏功能按钮的函数
function createTouchBarFunctionButton(
    window: BrowserWindow, // BrowserWindow 实例，表示要添加触摸栏的窗口
    text: string, // 按钮显示的文本
    key: string, // 按钮对应的按键
) {
    return new TouchBar.TouchBarButton({
        label: text, // 按钮文本
        // 点击按钮时向窗口发送触摸栏事件
        click: () => window.webContents.send("touchbar-event", key),
    })
}

// 初始化主窗口的触摸栏
export function initMainTouchBar(texts: TouchBarTexts, window: BrowserWindow) {
    // 创建触摸栏对象
    const touchBar = new TouchBar({
        items: [
            // 创建触摸栏功能按钮并添加到触摸栏中
            createTouchBarFunctionButton(window, texts.menu, "F1"), // 菜单按钮
            createTouchBarFunctionButton(window, texts.search, "F2"), // 搜索按钮
            new TouchBar.TouchBarSpacer({ size: "small" }), // 创建触摸栏间隔
            createTouchBarFunctionButton(window, texts.refresh, "F5"), // 刷新按钮
            createTouchBarFunctionButton(window, texts.markAll, "F6"), // 全部标记按钮
            createTouchBarFunctionButton(window, texts.notifications, "F7"), // 通知按钮
        ],
    })
    // 将触摸栏设置到窗口中
    window.setTouchBar(touchBar)
}
