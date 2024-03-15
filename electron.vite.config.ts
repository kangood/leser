import { resolve } from "path"
import { defineConfig, externalizeDepsPlugin } from "electron-vite"
import react from "@vitejs/plugin-react"
import tsconfigPaths from "vite-tsconfig-paths"
import copy from "rollup-plugin-copy"

export default defineConfig({
    main: {
        plugins: [
            externalizeDepsPlugin(),
            // 在构建之后复制文件到输出目录
            copy({
                // 用 closeBundle 替代默认的 buildEnd
                hook: "closeBundle",
                targets: [{ src: "resources/font*", dest: "out/main" }],
            }),
        ],
    },
    preload: {
        plugins: [externalizeDepsPlugin()],
    },
    renderer: {
        resolve: {
            alias: {
                "@renderer": resolve("src/renderer/src"),
            },
        },
        define: {
            "process.env": {},
        },
        plugins: [react(), tsconfigPaths()],
    },
})
