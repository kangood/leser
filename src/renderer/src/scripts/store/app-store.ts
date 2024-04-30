import { create } from 'zustand'
import { AppLog, AppLogType, AppState, ContextMenuType } from '../models/app';
import { RSSItem } from '../models/item';
import { SourceOpenTarget } from '../models/source';
import { PageInTypes, usePageActions } from './page-store';
import { ItemInTypes, useItemActions } from './item-store';
import { getCurrentLocale, setThemeDefaultFont } from '../settings';
import intl from 'react-intl-universal';
import locales from "../i18n/_locales";
import { initTouchBarWithTexts } from '../utils';
import { useSourceStore } from './source-store';
import { useFeedActions } from './feed-store';
import { devtools } from 'zustand/middleware';
import { ALL } from '../models/feed';

type AppStore = {
    app: AppState;
    actions: {
        initSourcesSuccess: () => void;
        initFeedsSuccess: () => void;
        fetchItemsRequest: (itemInTypes: ItemInTypes) => void;
        fetchItemsFailure: (itemInTypes: ItemInTypes) => void;
        fetchItemsIntermediate: () => void;
        fetchItemsSuccess:(itemInTypes: ItemInTypes) => void;
        selectAllArticles: (pageInTypes: PageInTypes) => void;
        initIntlDone: (locale: string) => void;
        initIntl: () => Promise<void>;
        initApp: () => void;
        saveSettings: () => void;
        pushNotification: (item: RSSItem) => void;
        setupAutoFetch: () => void;
        openTextMenu: (position: [number, number], text: string, url?: string) => void;
        openItemMenu: (feedId: string, item: RSSItem, event: MouseEvent) => void;
        openViewMenu: () => void;
        openMarkAllMenu: () => void;
        toggleLogMenu: () => void;
        toggleSettings: (open?: boolean, sids?: Array<number>) => void;
    }
}

let fetchTimeout: NodeJS.Timeout;

export const useAppStore = create<AppStore>()(devtools((set, get) => ({
    app: new AppState(),
    actions: {
        initSourcesSuccess: () => {
            set((state) => ({ app: { ...state.app, sourceInit: true } }))
        },
        initFeedsSuccess: () => {
            set((state) => ({ app: { ...state.app, feedInit: true } }))
        },
        fetchItemsRequest: (itemInTypes: ItemInTypes) => {
            set((state) =>({ app: { ...state.app, ...itemInTypes } }))
        },
        fetchItemsFailure: (itemInTypes: ItemInTypes) => {
            set((state) =>({
                app: {
                    ...state.app,
                    logMenu: {
                        ...state.app.logMenu,
                        notify: !state.app.logMenu.display,
                        logs: [
                            ...state.app.logMenu.logs,
                            new AppLog(
                                AppLogType.Failure,
                                intl.get("log.fetchFailure", { name: itemInTypes.errSource.name }),
                                String(itemInTypes.err)
                            )
                        ]
                    }
                } 
            }))
        },
        fetchItemsIntermediate: () => {
            set((state) => ({ app: { ...state.app, fetchingProgress: state.app.fetchingProgress + 1 } }))
        },
        fetchItemsSuccess: (itemInTypes: ItemInTypes) => {
            set((state) => ({
                app: {
                    ...state.app,
                    fetchingItems: false,
                    fetchingTotal: 0,
                    logMenu: itemInTypes.items.length === 0 
                        ? state.app.logMenu
                        : {
                            ...state.app.logMenu,
                            logs: [
                                ...state.app.logMenu.logs,
                                new AppLog(
                                    AppLogType.Info,
                                    intl.get("log.fetchSuccess", { count: itemInTypes.items.length })
                                )
                            ]
                        }
                }
            }))
        },
        selectAllArticles: (pageInTypes: PageInTypes) => {
            set((state) => ({
                app: {
                    ...state.app,
                    menu: state.app.menu && pageInTypes.keepMenu,
                    menuKey: ALL,
                    title: intl.get("allArticles")
                }
            }))
        },
        initIntlDone: (locale: string) => {
            document.documentElement.lang = locale;
            setThemeDefaultFont(locale);
            set((state) => ({ app: { ...state.app, locale: locale } }));
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
                    get().actions.initIntlDone(locale);
                })
        },
        initApp: () => {
            document.body.classList.add(window.utils.platform);
            get().actions.initIntl()
                .then(async () => {
                    if (window.utils.platform === "darwin") {
                        initTouchBarWithTexts();
                    }
                    await useSourceStore.getState().initSources();
                })
                .then(() => {
                    useFeedActions().initFeeds();
                })
                .then(async () => {
                    usePageActions().selectAllArticles();
                    await useItemActions().fetchItems();
                })
                .then(() => {
                    useSourceStore.getState().updateFavicon();
                }).catch(error => {
                    console.log('An error occurred:', error);
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
                        usePageActions().showItemFromId(item._id);
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
                                useItemActions().fetchItems(true);
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
        },
        openItemMenu: (feedId: string, item: RSSItem, event: MouseEvent) => {
            set(state => ({
                app: {
                    ...state.app,
                    contextMenu: {
                        type: ContextMenuType.Item,
                        event: event,
                        target: [item, feedId]
                    }
                }
            }));
        },
        openViewMenu: () => {
            set(state => ({
                app: {
                    ...state.app,
                    contextMenu: {
                        type: state.app.contextMenu.type === ContextMenuType.View
                            ? ContextMenuType.Hidden
                            : ContextMenuType.View,
                        event: "#view-toggle"
                    },
                }
            }))
        },
        openMarkAllMenu: () => {
            set(state => ({
                app: {
                    ...state.app,
                    contextMenu: {
                        type:
                            state.app.contextMenu.type === ContextMenuType.MarkRead
                                ? ContextMenuType.Hidden
                                : ContextMenuType.MarkRead,
                        event: "#mark-all-toggle",
                    },
                }
            }))
        },
        toggleLogMenu: () => {
            set(state => ({
                app: {
                    ...state.app,
                    logMenu: {
                        ...state.app.logMenu,
                        display: !state.app.logMenu.display,
                        notify: false
                    }
                }
            }))
        },
        toggleSettings: (open = true, sids = new Array<number>()) => {
            set(state => ({
                app: {
                    ...state.app,
                    settings: {
                        display: open,
                        changed: false,
                        sids: sids,
                        saving: false,
                    },
                }
            }));
        },
    }
}), { name: "app" }))

export const useApp = () => useAppStore(state => state.app);
export const useAppSettingsDisplay = () => useAppStore(state => state.app.settings.display);
export const useAppContextMenuOn = () => useAppStore(state => state.app.contextMenu.type != ContextMenuType.Hidden);

export const useAppActions = () => useAppStore(state => state.actions);