import * as React from "react"
import { useState, useEffect } from "react"
import intl from "react-intl-universal"
import {
    urlTest,
    byteToMB,
    calculateItemSize,
    getSearchEngineName,
} from "../../scripts/utils"
import { ThemeSettings, SearchEngines } from "../../schema-types"
import {
    getThemeSettings,
    setThemeSettings,
    exportAll,
} from "../../scripts/settings"
import {
    Stack,
    Label,
    Toggle,
    TextField,
    DefaultButton,
    ChoiceGroup,
    IChoiceGroupOption,
    Dropdown,
    IDropdownOption,
    PrimaryButton,
} from "@fluentui/react"
import DangerButton from "../utils/danger-button"
import { useAppActions } from "@renderer/scripts/store/app-store"

const AppTab: React.FC = () => {
    // zustand store
    const { deleteArticles, importAll } = useAppActions();
    
    const setLanguage = (option: string) => {
        window.settings.setLocaleSettings(option);
        useAppActions().initIntl();
    };
    const setFetchInterval = (interval: number) => {
        window.settings.setFetchInterval(interval);
        useAppActions().setupAutoFetch();
    };

    const [pacStatus, setPacStatus] = useState<boolean>(window.settings.getProxyStatus())
    const [pacUrl, setPacUrl] = useState<string>(window.settings.getProxy())
    const [themeSettingsState, setThemeSettingsState] = useState<ThemeSettings>(getThemeSettings())
    const [itemSize, setItemSize] = useState<string>(null)
    const [cacheSize, setCacheSize] = useState<string>(null)
    const [deleteIndex, setDeleteIndex] = useState<string>(null)

    useEffect(() => {
        getItemSize()
        getCacheSize()
    }, [])

    const getCacheSize = () => {
        window.utils.getCacheSize().then(size => {
            setCacheSize(byteToMB(size))
        })
    }

    const getItemSize = () => {
        calculateItemSize().then(size => {
            setItemSize(byteToMB(size))
        })
    }

    const clearCache = () => {
        window.utils.clearCache().then(() => {
            getCacheSize()
        })
    }

    const themeChoices = (): IChoiceGroupOption[] => [
        { key: ThemeSettings.Default, text: intl.get("followSystem") },
        { key: ThemeSettings.Light, text: intl.get("app.lightTheme") },
        { key: ThemeSettings.Dark, text: intl.get("app.darkTheme") },
    ]

    const fetchIntervalOptions = (): IDropdownOption[] => [
        { key: 0, text: intl.get("app.never") },
        { key: 10, text: intl.get("time.minute", { m: 10 }) },
        { key: 15, text: intl.get("time.minute", { m: 15 }) },
        { key: 20, text: intl.get("time.minute", { m: 20 }) },
        { key: 30, text: intl.get("time.minute", { m: 30 }) },
        { key: 45, text: intl.get("time.minute", { m: 45 }) },
        { key: 60, text: intl.get("time.hour", { h: 1 }) },
    ]
    const onFetchIntervalChanged = (item: IDropdownOption) => {
        setFetchInterval(item.key as number)
    }

    const searchEngineOptions = (): IDropdownOption[] =>
        [
            SearchEngines.Google,
            SearchEngines.Bing,
            SearchEngines.Baidu,
            SearchEngines.DuckDuckGo,
        ].map(engine => ({
            key: engine,
            text: getSearchEngineName(engine),
        }))
    const onSearchEngineChanged = (item: IDropdownOption) => {
        window.settings.setSearchEngine(item.key as number)
    }

    const deleteOptions = (): IDropdownOption[] => [
        { key: "7", text: intl.get("app.daysAgo", { days: 7 }) },
        { key: "14", text: intl.get("app.daysAgo", { days: 14 }) },
        { key: "21", text: intl.get("app.daysAgo", { days: 21 }) },
        { key: "28", text: intl.get("app.daysAgo", { days: 28 }) },
        { key: "0", text: intl.get("app.deleteAll") },
    ]

    const deleteChange = (_, item: IDropdownOption) => {
        setDeleteIndex(item ? String(item.key) : null)
    }

    const confirmDelete = () => {
        setItemSize(null)
        deleteArticles(parseInt(deleteIndex)).then(() => getItemSize())
    }

    const languageOptions = (): IDropdownOption[] => [
        { key: "default", text: intl.get("followSystem") },
        { key: "de", text: "Deutsch" },
        { key: "en-US", text: "English" },
        { key: "es", text: "Español" },
        { key: "cs", text: "Čeština" },
        { key: "fr-FR", text: "Français" },
        { key: "it", text: "Italiano" },
        { key: "nl", text: "Nederlands" },
        { key: "pt-BR", text: "Português do Brasil" },
        { key: "pt-PT", text: "Português de Portugal" },
        { key: "fi-FI", text: "Suomi" },
        { key: "sv", text: "Svenska" },
        { key: "tr", text: "Türkçe" },
        { key: "uk", text: "Українська" },
        { key: "ru", text: "Русский" },
        { key: "ko", text: "한글" },
        { key: "ja", text: "日本語" },
        { key: "zh-CN", text: "中文（简体）" },
        { key: "zh-TW", text: "中文（繁體）" },
    ]

    const toggleStatus = () => {
        window.settings.toggleProxyStatus()
        setPacStatus(window.settings.getProxyStatus())
        setPacUrl(window.settings.getProxy())
    }

    const handleInputChange = event => {
        const name: string = event.target.name

        if (name === "pacUrl") {
            setPacUrl(event.target.value.trim())
        }
    }

    const setUrl = (event: React.FormEvent) => {
        event.preventDefault()
        if (urlTest(pacUrl))
            window.settings.setProxy(pacUrl)
    }

    const onThemeChange = (_, option: IChoiceGroupOption) => {
        setThemeSettings(option.key as ThemeSettings);
        setThemeSettingsState(option.key as ThemeSettings);
    }

    return (
        <div className="tab-body">
            <Label>{intl.get("app.language")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getLocaleSettings()}
                        options={languageOptions()}
                        onChanged={option =>
                            setLanguage(String(option.key))
                        }
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <ChoiceGroup
                label={intl.get("app.theme")}
                options={themeChoices()}
                onChange={onThemeChange}
                selectedKey={themeSettingsState}
            />

            <Label>{intl.get("app.fetchInterval")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getFetchInterval()}
                        options={fetchIntervalOptions()}
                        onChanged={onFetchIntervalChanged}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <Label>{intl.get("searchEngine.name")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <Dropdown
                        defaultSelectedKey={window.settings.getSearchEngine()}
                        options={searchEngineOptions()}
                        onChanged={onSearchEngineChanged}
                        style={{ width: 200 }}
                    />
                </Stack.Item>
            </Stack>

            <Stack horizontal verticalAlign="baseline">
                <Stack.Item grow>
                    <Label>{intl.get("app.enableProxy")}</Label>
                </Stack.Item>
                <Stack.Item>
                    <Toggle
                        checked={pacStatus}
                        onChange={toggleStatus}
                    />
                </Stack.Item>
            </Stack>
            {pacStatus && (
                <form onSubmit={setUrl}>
                    <Stack horizontal>
                        <Stack.Item grow>
                            <TextField
                                required
                                onGetErrorMessage={v =>
                                    urlTest(v.trim())
                                        ? ""
                                        : intl.get("app.badUrl")
                                }
                                placeholder={intl.get("app.pac")}
                                name="pacUrl"
                                onChange={handleInputChange}
                                value={pacUrl}
                            />
                        </Stack.Item>
                        <Stack.Item>
                            <DefaultButton
                                disabled={!urlTest(pacUrl)}
                                type="sumbit"
                                text={intl.get("app.setPac")}
                            />
                        </Stack.Item>
                    </Stack>
                    <span className="settings-hint up">
                        {intl.get("app.pacHint")}
                    </span>
                </form>
            )}

            <Label>{intl.get("app.cleanup")}</Label>
            <Stack horizontal>
                <Stack.Item grow>
                    <Dropdown
                        placeholder={intl.get("app.deleteChoices")}
                        options={deleteOptions()}
                        selectedKey={deleteIndex}
                        onChange={deleteChange}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DangerButton
                        disabled={
                            itemSize === null ||
                            deleteIndex === null
                        }
                        text={intl.get("app.confirmDelete")}
                        onClick={confirmDelete}
                    />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {itemSize
                    ? intl.get("app.itemSize", { size: itemSize })
                    : intl.get("app.calculatingSize")}
            </span>
            <Stack horizontal>
                <Stack.Item>
                    <DefaultButton
                        text={intl.get("app.cache")}
                        disabled={
                            cacheSize === null ||
                            cacheSize === "0MB"
                        }
                        onClick={clearCache}
                    />
                </Stack.Item>
            </Stack>
            <span className="settings-hint up">
                {cacheSize
                    ? intl.get("app.cacheSize", { size: cacheSize })
                    : intl.get("app.calculatingSize")}
            </span>

            <Label>{intl.get("app.data")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <PrimaryButton
                        onClick={exportAll}
                        text={intl.get("app.backup")}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DefaultButton
                        onClick={importAll}
                        text={intl.get("app.restore")}
                    />
                </Stack.Item>
            </Stack>
        </div>
    )
}

export default AppTab
