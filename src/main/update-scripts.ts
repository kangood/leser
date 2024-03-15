import { app } from "electron" // 导入 Electron 的 app 模块
import Store from "electron-store" // 导入 Electron Store 模块
import { SchemaTypes } from "../renderer/src/schema-types" // 导入自定义类型

// 执行更新操作的函数，接收一个 Store 实例作为参数
export default function performUpdate(store: Store<SchemaTypes>) {
    // 从存储中获取版本号和使用 NeDB 的配置
    let version = store.get("version", null)
    let useNeDB = store.get("useNeDB", undefined)
    let currentVersion = app.getVersion() // 获取当前应用版本号

    // 如果使用 NeDB 的配置未定义
    if (useNeDB === undefined) {
        // 如果存储中有版本号
        if (version !== null) {
            const revs = version.split(".").map(s => parseInt(s)) // 将版本号拆分为数组形式
            // 根据版本号确定是否使用 NeDB，并根据是否打包设置 NeDB 使用状态
            store.set(
                "useNeDB",
                (revs[0] === 0 && revs[1] < 8) || !app.isPackaged, // 版本号小于 0.8 或非打包状态时使用 NeDB
            )
        } else {
            // 如果存储中没有版本号，则默认不使用 NeDB
            store.set("useNeDB", false)
        }
    }

    // 如果存储中的版本号与当前版本号不一致，则更新存储中的版本号为当前版本号
    if (version != currentVersion) {
        store.set("version", currentVersion)
    }
}
