import Store from "electron-store" // 导入 electron-store 模块，用于本地存储
import {
    SchemaTypes,
    SourceGroup,
    ViewType,
    ThemeSettings,
    SearchEngines,
    SyncService,
    ServiceConfigs,
    ViewConfigs,
} from "../renderer/src/schema-types" // 导入相关类型定义
import { ipcMain, session, nativeTheme, app } from "electron" // 导入 Electron 模块
import { WindowManager } from "./window" // 导入 WindowManager 类

// 创建 Store 实例用于存储应用程序的配置信息
export const store = new Store<SchemaTypes>()

// 设置用于存储源组的键值
const GROUPS_STORE_KEY = "sourceGroups"

// 处理设置源组的 IPC 消息
ipcMain.handle("set-groups", (_, groups: SourceGroup[]) => {
    store.set(GROUPS_STORE_KEY, groups)
})

// 处理获取源组的 IPC 消息
ipcMain.on("get-groups", event => {
    event.returnValue = store.get(GROUPS_STORE_KEY, [])
})

// 设置用于存储菜单显示状态的键值
const MENU_STORE_KEY = "menuOn"

// 处理获取菜单显示状态的 IPC 消息
ipcMain.on("get-menu", event => {
    event.returnValue = store.get(MENU_STORE_KEY, false)
})

// 处理设置菜单显示状态的 IPC 消息
ipcMain.handle("set-menu", (_, state: boolean) => {
    store.set(MENU_STORE_KEY, state)
})

// 设置用于存储 PAC 地址的键值和状态键值
const PAC_STORE_KEY = "pac"
const PAC_STATUS_KEY = "pacOn"

// 获取代理状态的函数
function getProxyStatus() {
    return store.get(PAC_STATUS_KEY, false)
}

// 切换代理状态的函数
function toggleProxyStatus() {
    store.set(PAC_STATUS_KEY, !getProxyStatus())
    setProxy()
}

// 获取代理地址的函数
function getProxy() {
    return store.get(PAC_STORE_KEY, "")
}

// 设置代理的函数
function setProxy(address = null) {
    if (!address) {
        address = getProxy()
    } else {
        store.set(PAC_STORE_KEY, address)
    }
    if (getProxyStatus()) {
        let rules = { pacScript: address }
        session.defaultSession.setProxy(rules)
        session.fromPartition("sandbox").setProxy(rules)
    }
}

// 处理获取代理状态的 IPC 消息
ipcMain.on("get-proxy-status", event => {
    event.returnValue = getProxyStatus()
})

// 处理切换代理状态的 IPC 消息
ipcMain.on("toggle-proxy-status", () => {
    toggleProxyStatus()
})

// 处理获取代理地址的 IPC 消息
ipcMain.on("get-proxy", event => {
    event.returnValue = getProxy()
})

// 处理设置代理地址的 IPC 消息
ipcMain.handle("set-proxy", (_, address = null) => {
    setProxy(address)
})

// 设置用于存储视图类型的键值
const VIEW_STORE_KEY = "view"

// 处理获取视图类型的 IPC 消息
ipcMain.on("get-view", event => {
    event.returnValue = store.get(VIEW_STORE_KEY, ViewType.List)
})

// 处理设置视图类型的 IPC 消息
ipcMain.handle("set-view", (_, viewType: ViewType) => {
    store.set(VIEW_STORE_KEY, viewType)
})

// 设置用于存储主题设置的键值
const THEME_STORE_KEY = "theme"

// 处理获取主题设置的 IPC 消息
ipcMain.on("get-theme", event => {
    event.returnValue = store.get(THEME_STORE_KEY, ThemeSettings.Default)
})

// 处理设置主题设置的 IPC 消息
ipcMain.handle("set-theme", (_, theme: ThemeSettings) => {
    store.set(THEME_STORE_KEY, theme)
    nativeTheme.themeSource = theme
})

// 处理获取暗色主题状态的 IPC 消息
ipcMain.on("get-theme-dark-color", event => {
    event.returnValue = nativeTheme.shouldUseDarkColors
})

// 设置主题变更监听函数
export function setThemeListener(manager: WindowManager) {
    nativeTheme.removeAllListeners()
    nativeTheme.on("updated", () => {
        if (manager.hasWindow()) {
            let contents = manager.mainWindow.webContents
            if (!contents.isDestroyed()) {
                contents.send("theme-updated", nativeTheme.shouldUseDarkColors)
            }
        }
    })
}

// 设置用于存储区域设置的键值
const LOCALE_STORE_KEY = "locale"

// 处理设置区域设置的 IPC 消息
ipcMain.handle("set-locale", (_, option: string) => {
    store.set(LOCALE_STORE_KEY, option)
})

// 获取区域设置的函数
function getLocaleSettings() {
    return store.get(LOCALE_STORE_KEY, "default")
}

// 处理获取区域设置的 IPC 消息
ipcMain.on("get-locale-settings", event => {
    event.returnValue = getLocaleSettings()
})

// 处理获取区域设置的 IPC 消息
ipcMain.on("get-locale", event => {
    let setting = getLocaleSettings()
    let locale = setting === "default" ? app.getLocale() : setting
    event.returnValue = locale
})

// 设置用于存储字体大小的键值
const FONT_SIZE_STORE_KEY = "fontSize"

// 处理获取字体大小的 IPC 消息
ipcMain.on("get-font-size", event => {
    event.returnValue = store.get(FONT_SIZE_STORE_KEY, 16)
})

// 处理设置字体大小的 IPC 消息
ipcMain.handle("set-font-size", (_, size: number) => {
    store.set(FONT_SIZE_STORE_KEY, size)
})

// 设置用于存储字体设置的键值
const FONT_STORE_KEY = "fontFamily"

// 处理获取字体设置的 IPC 消息
ipcMain.on("get-font", event => {
    event.returnValue = store.get(FONT_STORE_KEY, "")
})

// 处理设置字体设置的 IPC 消息
ipcMain.handle("set-font", (_, font: string) => {
    store.set(FONT_STORE_KEY, font)
})

// 处理获取所有设置的 IPC 消息
ipcMain.on("get-all-settings", event => {
    let output = {}
    for (let [key, value] of store) {
        output[key] = value
    }
    event.returnValue = output
})

// 设置用于存储抓取间隔的键值
const FETCH_INTEVAL_STORE_KEY = "fetchInterval"

// 处理获取抓取间隔的 IPC 消息
ipcMain.on("get-fetch-interval", event => {
    event.returnValue = store.get(FETCH_INTEVAL_STORE_KEY, 0)
})

// 处理设置抓取间隔的 IPC 消息
ipcMain.handle("set-fetch-interval", (_, interval: number) => {
    store.set(FETCH_INTEVAL_STORE_KEY, interval)
})

// 设置用于存储搜索引擎设置的键值
const SEARCH_ENGINE_STORE_KEY = "searchEngine"

// 处理获取搜索引擎设置的 IPC 消息
ipcMain.on("get-search-engine", event => {
    event.returnValue = store.get(SEARCH_ENGINE_STORE_KEY, SearchEngines.Google)
})

// 处理设置搜索引擎设置的 IPC 消息
ipcMain.handle("set-search-engine", (_, engine: SearchEngines) => {
    store.set(SEARCH_ENGINE_STORE_KEY, engine)
})

// 设置用于存储服务配置的键值
const SERVICE_CONFIGS_STORE_KEY = "serviceConfigs"

// 处理获取服务配置的 IPC 消息
ipcMain.on("get-service-configs", event => {
    event.returnValue = store.get(SERVICE_CONFIGS_STORE_KEY, {
        type: SyncService.None,
    })
})

// 处理设置服务配置的 IPC 消息
ipcMain.handle("set-service-configs", (_, configs: ServiceConfigs) => {
    store.set(SERVICE_CONFIGS_STORE_KEY, configs)
})

// 设置用于存储过滤器类型的键值
const FILTER_TYPE_STORE_KEY = "filterType"

// 处理获取过滤器类型的 IPC 消息
ipcMain.on("get-filter-type", event => {
    event.returnValue = store.get(FILTER_TYPE_STORE_KEY, null)
})

// 处理设置过滤器类型的 IPC 消息
ipcMain.handle("set-filter-type", (_, filterType: number) => {
    store.set(FILTER_TYPE_STORE_KEY, filterType)
})

// 设置用于存储列表视图配置的键值
const LIST_CONFIGS_STORE_KEY = "listViewConfigs"

// 处理获取列表视图配置的 IPC 消息
ipcMain.on("get-view-configs", (event, view: ViewType) => {
    switch (view) {
        case ViewType.List:
            event.returnValue = store.get(LIST_CONFIGS_STORE_KEY, ViewConfigs.ShowCover)
            break
        default:
            event.returnValue = undefined
            break
    }
})

// 处理设置列表视图配置的 IPC 消息
ipcMain.handle("set-view-configs", (_, view: ViewType, configs: ViewConfigs) => {
    switch (view) {
        case ViewType.List:
            store.set(LIST_CONFIGS_STORE_KEY, configs)
            break
    }
})

// 设置用于存储 NeDB 使用状态的键值
const NEDB_STATUS_STORE_KEY = "useNeDB"

// 处理获取 NeDB 使用状态的 IPC 消息
ipcMain.on("get-nedb-status", event => {
    event.returnValue = store.get(NEDB_STATUS_STORE_KEY, true)
})

// 处理设置 NeDB 使用状态的 IPC 消息
ipcMain.handle("set-nedb-status", (_, flag: boolean) => {
    store.set(NEDB_STATUS_STORE_KEY, flag)
})
