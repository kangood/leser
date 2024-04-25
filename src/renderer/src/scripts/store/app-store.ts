import { create } from 'zustand'
import { AppLog, AppLogType, AppState, ContextMenuType, LogMenuActionType, PUSH_NOTIFICATION, SettingsActionTypes } from '../models/app';
import { RSSItem } from '../models/item';
import { SourceOpenTarget } from '../models/source';
import { usePageStore } from './page-store';
import { useItemStore } from './item-store';
import { getCurrentLocale, setThemeDefaultFont } from '../settings';
import intl from 'react-intl-universal';
import locales from "../i18n/_locales";
import { initTouchBarWithTexts } from '../utils';
import { useSourceStore } from './source-store';
import { useFeedStore } from './feed-store';

type AppStore = {
    app: AppState;
    initIntlDone: (locale: string) => void;
    initIntl: () => Promise<void>;
    initApp: () => void;
    saveSettings: () => void;
    pushNotification: (item: RSSItem) => void;
    setupAutoFetch: () => void;
    openTextMenu: (position: [number, number], text: string, url?: string) => void;
}

let fetchTimeout: NodeJS.Timeout;

export const useAppStore = create<AppStore>((set, get) => ({
    app: new AppState(),
    initIntlDone: (locale: string) => {
        document.documentElement.lang = locale;
        setThemeDefaultFont(locale);
        set({ app: { ...get().app, locale: locale } });
    },
    initIntl: async () => {
        let locale = getCurrentLocale();
        return intl
            .init({
                currentLocale: locale,
                locales: locales,
                fallbackLocale: "en-US",
            })
            .then(() => {
                get().initIntlDone(locale);
            })
    },
    initApp: () => {
        document.body.classList.add(window.utils.platform);
        get().initIntl()
            .then(async () => {
                if (window.utils.platform === "darwin") { initTouchBarWithTexts() };
                await useSourceStore.getState().initSources();
            })
            .then(() => {
                useFeedStore.getState().initFeeds();
            })
            .then(async () => {
                usePageStore.getState().selectAllArticles();
                await useItemStore.getState().fetchItems();
            })
            .then(() => {
                useSourceStore.getState().updateFavicon();
            });
    },
    saveSettings: () => {
        set({
            app: {
                ...get().app,
                settings: {
                    ...get().app.settings,
                    display: true,
                    changed: true,
                    saving: !get().app.settings.saving,
                }
            },
        });
    },
    pushNotification: (item: RSSItem) => {
        const sourceName = useSourceStore.getState().sources[item.source].name;
        const state = { sources: useSourceStore.getState().sources, app: useAppStore.getState().app };
        if (!window.utils.isFocused()) {
            const options = { body: sourceName } as any;
            if (item.thumb) options.icon = item.thumb;
            const notification = new Notification(item.title, options);
            notification.onclick = () => {
                if (state.sources[item.source].openTarget === SourceOpenTarget.External) {
                    window.utils.openExternal(item.link);
                } else if (!state.app.settings.display) {
                    window.utils.focus();
                    usePageStore.getState().showItemFromId(item._id);
                }
            }
        }
        set({
            app: {
                ...state.app,
                logMenu:  {
                    ...state.app.logMenu,
                    notify: true,
                    logs: [
                        ...state.app.logMenu.logs,
                        new AppLog(
                            AppLogType.Article,
                            item.title,
                            sourceName,
                            item._id
                        ),
                    ],
                }
            } 
        });
    },
    setupAutoFetch: () => {
        clearTimeout(fetchTimeout);
        const setupTimeout = (interval?: number) => {
            if (!interval) {
                interval = window.settings.getFetchInterval();
            } else {
                fetchTimeout = setTimeout(() => {
                    let app = useAppStore.getState().app;
                    if (!app.settings.display) {
                        if (!app.fetchingItems) {
                            useItemStore.getState().fetchItems(true);
                        }
                    } else {
                        setupTimeout(1);
                    }
                }, interval * 60000);
            }
        }
        setupTimeout();
    },
    openTextMenu: (position: [number, number], text: string, url: string = null) => {
        set({
            app: {
                ...get().app,
                contextMenu: {
                    type: ContextMenuType.Text,
                    position: position,
                    target: [text, url],
                }
            } 
        });
    }
}))
