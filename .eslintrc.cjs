module.exports = {
    root: true, // 表示当前目录即为根目录，eslint 只会检查这个目录下的文件
    env: { browser: true, es2020: true, node: true }, // 指定环境，定义全局变量。这里设置browser，es2020，和node环境，支持浏览器，es2020，node全局变量
    /* 解析器 */
    parser: "@typescript-eslint/parser", // 指定 eslint 的解析器，这里使用了 TypeScript 的解析器
    parserOptions: {
        project: "./tsconfig.*.json", // 指定 tsconfig.json 的路径
        ecmaVersion: "latest", // 设置ECMAScript语法版本
        sourceType: "module", // 设置源代码类型，"module" 表示是 ES6 模块
        ecmaFeatures: {
            jsx: true, // 允许解析 JSX 语法
        },
        extraFileExtensions: [".json"], // 额外的文件扩展名列表，这些文件将被解析器解析
    },
    settings: {
        // 识别 alias 别名
        "import/resolver": {
            alias: {
                map: [["@renderer", "./src/renderer/src"]],
                extensions: [".ts", ".tsx", ".js", ".jsx", ".json"], // 在导入时解析的文件扩展名列表
            },
        },
    },
    /* ESLint 中基础配置需要继承的配置 */
    extends: [
        "airbnb", // 使用airbnb的编码规范
        "airbnb-typescript", // 使用 airbnb 针对 TypeScript 的编码规范
        "airbnb/hooks", // 使用 airbnb 针对 React Hooks 的编码规范
        "plugin:@typescript-eslint/recommended", // 使用 @typescript-eslint/eslint-plugin 推荐的规则
        "plugin:jsx-a11y/recommended", // 使用 jsx-a11y 插件推荐的规则
        "plugin:import/errors", // 开启 import 插件的错误规则
        "plugin:import/warnings", // 开启 import 插件的警告规则
        "prettier", // 开启 prettier 的规则，确保代码格式化一致
        "plugin:prettier/recommended", // 开启 prettier 插件推荐的规则
    ],
    /* ESLint文件所依赖的插件 */
    plugins: [
        "@typescript-eslint", // 使用 @typescript-eslint 插件，支持 TypeScript
        "prettier", // 使用 prettier 插件，支持代码格式化
        "react", // 使用 react 插件，支持 React
        "react-hooks", // 使用 react-hooks 插件，支持 React Hooks
        "react-refresh", // 使用 react-refresh 插件，支持 React Fast Refresh
        "jsx-a11y", // 使用 jsx-a11y 插件，支持 JSX 的无障碍访问
        "import", // 使用 import 插件，支持 ES6 导入导出
        "unused-imports", // 使用 unused-imports 插件，检查未使用的导入
    ],
    /**
     * 定义规则
     * "off" 或 0 - 关闭规则
     * "warn" 或 1 - 开启规则，使用警告级别的错误：warn (不会导致程序退出)
     * "error" 或 2 - 开启规则，使用错误级别的错误：error (当被触发的时候，程序会退出)
     */
    rules: {
        "no-console": "off", // 关闭禁止使用 console 的规则
        "no-unused-vars": "off", // 关闭禁止定义未使用的变量的规则
        "no-case-declarations": "off", // 关闭禁止在 case 或 default 子句中出现词法声明（let、const、function和class）的规则
        "no-use-before-define": "off", // 关闭禁止在变量定义之前使用它们的规则
        "no-param-reassign": "off", // 关闭禁止对 function 的参数进行重新赋值的规则
        "space-before-function-paren": "off", // 关闭强制在 function 的左括号之前使用一致的空格的规则
        "class-methods-use-this": "off", // 关闭强制类方法使用 this 的规则
        "no-plusplus": 0, // 关闭禁用一元操作符 ++ 和 --
        "no-underscore-dangle": "off", // 允许指定的标识符具有悬空下划线
        "default-case": "off", // 关闭检查 switch 语句应该包含一个 default 默认

        "jsx-a11y/click-events-have-key-events": "off", // 关闭强制可点击元素有键盘事件的规则
        "jsx-a11y/interactive-supports-focus": "off", // 关闭强制具有交互处理程序的元素具有焦点的规则
        "jsx-a11y/no-noninteractive-element-interactions": "off", // 关闭不允许在非交互元素上使用交互事件的规则
        "jsx-a11y/no-static-element-interactions": "off", // 关闭不允许在静态元素上使用交互事件的规则
        "jsx-a11y/anchor-is-valid": "off", // 关闭检测 <a> 元素是否符合可访问性规范

        "react/react-in-jsx-scope": "off", // 关闭强制在 JSX 中使用 React 的规则
        "react/button-has-type": "off", // 关闭强制 button 元素的 type 属性必须被明确的规则
        "react/require-default-props": "off", // 关闭强制组件属性必须有默认值的规则
        "react/no-array-index-key": "off", // 关闭禁止在数组的索引作为 key 的规则
        "react/jsx-props-no-spreading": "off", // 关闭禁止 JSX 属性的扩展的规则
        "react-refresh/only-export-components": "warn", // 警告只能导出组件，不应该导出常量、工具函数等
        "react/prop-types": 0, // 关闭强制使用 propTypes 验证的规则
        "react-hooks/exhaustive-deps": 0, // 关闭强制对 useEffect 的依赖进行完整性检查的规则
        "react/function-component-definition": [
            2,
            {
                namedComponents: ["function-declaration", "arrow-function"], // 命名的函数组件必须是函数声明或箭头函数
                unnamedComponents: "arrow-function", // 未命名的函数组件必须是箭头函数
            },
        ],

        "import/first": "warn", // 警告所有的导入应该在其他所有语句之前
        "import/newline-after-import": "warn", // 警告导入语句后必须有空行
        "import/no-duplicates": "warn", // 警告模块只能被导入一次
        "import/no-extraneous-dependencies": "off", // 关闭禁止导入未在 package.json 的 dependencies 或 devDependencies 中声明的模块的规则
        "import/prefer-default-export": "off", // 关闭当模块只有一个导出时，优先使用默认导出的规则
        "import/no-cycle": 0, // 关闭禁止循环依赖的规则
        // 定义导入顺序，并对未执行的导入进行警告
        "import/order": [
            "warn",
            {
                // 定义了导入的组和组之间的顺序
                "groups": [
                    "builtin", // Node.js内置模块
                    "external", // 第三方模块
                    "internal", // 应用程序内部的模块
                    "parent", // 父级目录中导入的模块
                    ["sibling", "index"], // 具有相同或更高目录的兄弟模块
                    "object",
                    "type",
                ],
                // 定义了基于导入路径的额外的组
                "pathGroups": [
                    {
                        pattern: "@/**",
                        group: "internal",
                    },
                    {
                        pattern: "#/**",
                        group: "type",
                    },
                    {
                        pattern: "*.{scss,css,less,styl,stylus}",
                        group: "parent",
                    },
                    {
                        pattern: "*.{js,jsx,ts,tsx}",
                        group: "sibling",
                    },
                ],
                "newlines-between": "always", // 在组之间插入空行
                "pathGroupsExcludedImportTypes": ["sibling", "index"], // 定义了哪些类型的导入不应该被包含在 pathGroups 中
                "warnOnUnassignedImports": true, // 设置为true，导入的模块没有被分配到任何组，将会触发警告
                "alphabetize": { order: "asc", caseInsensitive: true }, // 对于每个组，按字母表顺序排序
            },
        ],

        "unused-imports/no-unused-imports-ts": "warn", // 警告未使用的导入（TypeScript）
        "unused-imports/no-unused-vars-ts": [
            "warn",
            {
                vars: "all", // 控制对未使用的变量的检查。这里设置为"all"，表示检查所有的变量
                varsIgnorePattern: "^_", // 定义了哪些「变量」应该被忽略，不进行未使用的检查。这里设置为 ^_ 表示以_开头的变量会被忽略
                args: "after-used", // 控制对未使用的参数的检查。这里设置为 after-used 表示只有在所有使用的参数之后的参数才会被检查
                argsIgnorePattern: "^_", // 定义了哪些「参数」应该被忽略，不进行未使用的检查。这里设置为 ^_ 表示以_开头的参数会被忽略
            },
        ],

        "@typescript-eslint/no-unused-vars": [
            "warn",
            {
                argsIgnorePattern: "^_",
                varsIgnorePattern: "^_",
            },
        ], // 警告声明了但未使用的变量，忽略以_开头的变量
        "@typescript-eslint/no-unused-expressions": "off", // 关闭禁止未使用的表达式的规则
        "@typescript-eslint/ban-ts-ignore": "off", // 关闭禁止使用 @ts-ignore 的规则
        "@typescript-eslint/ban-ts-comment": "off", // 关闭禁止使用 @ts-comment 的规则
        "@typescript-eslint/ban-types": "off", // 关闭禁止使用特定类型，如 {} 或 Object 的规则
        "@typescript-eslint/explicit-function-return-type": "off", // 关闭要求函数和类方法的显式返回类型的规则
        "@typescript-eslint/no-explicit-any": "off", // 关闭禁止使用 any 类型的规则
        "@typescript-eslint/no-var-requires": "off", // 关闭禁止使用 require 语句的规则
        "@typescript-eslint/no-empty-function": "off", // 关闭禁止空函数的规则
        "@typescript-eslint/no-use-before-define": "off", // 关闭禁止在变量定义之前使用它们的规则
        "@typescript-eslint/no-non-null-assertion": "off", // 关闭禁止非空断言的规则
        "@typescript-eslint/no-shadow": "off", // 关闭禁止变量声明与外层作用域的变量同名的规则
        "@typescript-eslint/explicit-module-boundary-types": "off", // 关闭要求导出的函数和类的公共类方法的显式返回和参数类型的规则
        "@typescript-eslint/naming-convention": [
            "error",
            {
                selector: "variableLike",
                format: ["camelCase", "PascalCase", "UPPER_CASE"],
                leadingUnderscore: "allow", // 允许指定的标识符具有悬空下划线
            },
        ],
    },
};
