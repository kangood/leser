import { create } from 'zustand'
import { itemActions, useItemStore } from './item-store';
import { RSSItem } from '../models/item';
import { PageState } from '../models/page';
import { ALL, FeedFilter, FilterType, SOURCE } from '../models/feed';
import { getWindowBreakpoint } from '../utils';
import { devtools } from 'zustand/middleware';
import { appActions, useAppStore } from './app-store';
import { feedActions, useFeedStore } from './feed-store';
import { ViewConfigs, ViewType } from '@renderer/schema-types';
import { useSourceStore } from './source-store';

export type PageInTypes = {
    keepMenu: boolean;
    init: boolean;
}

type PageStore = {
    page: PageState;
    actions: {
        checkedFilter: (filterType: FilterType) => boolean;
        toggleFilter: (filterType: FilterType) => void;
        applyFilter: (feedFilter: FeedFilter) => void;
        switchFilter: (filterType: FilterType) => void;
        selectAllArticles: (init?: boolean) => Promise<void>;
        showItem: (feedId: string, item: RSSItem) => void;
        showItemFromId: (id: number) => void;
        dismissItem: () => void;
        showOffsetItem: (offset: number) => void;
        toggleSearch: () => void;
        setViewConfigs: (configs: ViewConfigs) => void;
        switchView: (viewType: ViewType) => void;
        selectSources: (sids: number[], menuKey: string, title: string) => void;
        performSearch: (query: string) => void;
    }
}

export const usePageStore = create<PageStore>()(devtools((set, get) => ({
    page: new PageState(),
    actions: {
        checkedFilter: (filterType: FilterType) => {
            // 原 filterType 的状态和传过来的 filterType 作与运算，返回 checked 值
            return Boolean(get().page.filter.type & filterType);
        },
        toggleFilter: (filterType: FilterType) => {
            // 用于计算 filterType，再调用 applyFilter
            let nextFilter = { ...get().page.filter };
            nextFilter.type ^= filterType;
            get().actions.applyFilter(nextFilter);
        },
        // 由 toggleFilter 调用
        applyFilter: (feedFilter: FeedFilter) => {
            const oldFilterType = get().page.filter.type;
            // 新老 filterType 对比，不一样就 set
            if (feedFilter.type !== oldFilterType) {
                window.settings.setFilterType(feedFilter.type);
                set((state) => ({ page: { ...state.page, filter: feedFilter } }));
                // [feedReducer]...
                // 调用 initFeeds
                feedActions.initFeeds(true);
            }
        },
        switchFilter: (filterType: FilterType) => {
            let oldFilter = get().page.filter;
            let oldType = oldFilter.type;
            let newType = filterType | (oldType & FilterType.Toggles);
            if (oldType != newType) {
                get().actions.applyFilter({
                    ...oldFilter,
                    type: newType,
                })
            }
        },
        selectAllArticles: async (init = false) => {
            const pageInTypes = { keepMenu: getWindowBreakpoint(), init };
            set((state) => ({
                page: {
                    ...state.page,
                    feedId: ALL,
                    itemId: null
                },
            }));
            // [appReducer]
            appActions.selectAllArticles(pageInTypes);
            // [feedReducer]
        },
        showItem: (feedId: string, item: RSSItem) => {
            const state = { items: useItemStore.getState().items, sources: useSourceStore.getState().sources };
            if (
                state.items.hasOwnProperty(item._id) &&
                state.sources.hasOwnProperty(item.source)
            ) {
                set((state) =>({
                    page: {
                        ...state.page,
                        itemId: item._id,
                        itemFromFeed: Boolean(feedId)
                    }
                }));
            }
        },
        showItemFromId: (iid: number) => {
            const item = useItemStore.getState().items[iid];
            if (!item.hasRead) {
                itemActions.markRead(item);
            }
            if (item) {
                get().actions.showItem(null, item);
            }
        },
        dismissItem: () => {
            set(state => ({
                page: {
                    ...state.page,
                    itemId: null
                }
            }));
        },
        showOffsetItem: (offset: number) => {
            let state = { page: get().page, feeds: useFeedStore.getState().feeds, items: useItemStore.getState().items };
            if (!state.page.itemFromFeed) {
                return;
            }
            let [itemId, feedId] = [state.page.itemId, state.page.feedId];
            let feed = state.feeds[feedId];
            let iids = feed.iids;
            let itemIndex = iids.indexOf(itemId);
            let newIndex = itemIndex + offset;
            if (itemIndex < 0) {
                let item = state.items[itemId];
                let prevs = feed.iids
                    .map(
                        (id, index) => [state.items[id], index] as [RSSItem, number]
                    )
                    .filter(([i, _]) => i.date > item.date);
                if (prevs.length > 0) {
                    let prev = prevs[0];
                    for (let j = 1; j < prevs.length; j += 1) {
                        if (prevs[j][0].date < prev[0].date) prev = prevs[j];
                    }
                    newIndex = prev[1] + offset + (offset < 0 ? 1 : 0);
                } else {
                    newIndex = offset - 1;
                }
            }
            if (newIndex >= 0) {
                if (newIndex < iids.length) {
                    let item = state.items[iids[newIndex]];
                    itemActions.markRead(item);
                    get().actions.showItem(feedId, item);
                    return;
                } else if (!feed.allLoaded) {
                    feedActions.loadMore(feed)
                        .then(() => {
                            get().actions.showOffsetItem(offset);
                        })
                        .catch(() => {
                            get().actions.dismissItem();
                        });
                    return;
                }
            }
            get().actions.dismissItem();
        },
        toggleSearch: () => {
            let state = get().page;
            set(({
                page: {
                    ...state,
                    searchOn: !state.searchOn
                }
            }));
            if (state.searchOn) {
                get().actions.applyFilter({
                    ...state.filter,
                    search: "",
                })
            }
        },
        setViewConfigs: (configs: ViewConfigs) => {
            window.settings.setViewConfigs(get().page.viewType, configs);
            set(state => ({
                page: {
                    ...state.page,
                    viewConfigs: configs,
                }
            }));
        },
        switchView: (viewType: ViewType) => {
            window.settings.setDefaultView(viewType);
            set(state => ({
                page: {
                    ...state.page,
                    viewType: viewType,
                    viewConfigs: window.settings.getViewConfigs(viewType),
                    itemId: null
                }
            }));
        },
        selectSources: (sids: number[], menuKey: string, title: string) => {
            if (useAppStore.getState().app.menuKey !== menuKey) {
                set(state => ({
                    page: {
                        ...state.page,
                        feedId: SOURCE,
                        itemId: null,
                    }
                }))
                // [feedReducer]
                feedActions.selectSources(sids);
                // [appReducer]
                appActions.selectSources(menuKey, title);
            }
        },
        performSearch: (query: string) => {
            set(state => {
                if (state.page.searchOn) {
                    pageActions.applyFilter({
                        ...state.page.filter,
                        search: query,
                    })
                } 
                return { ...state };
            });
        },
    },
}), { name: "page" }))

export const pageActions = usePageStore.getState().actions;

export const usePageFilter = () => usePageStore(state => state.page.filter);
export const usePageSearchOn = () => usePageStore(state => state.page.searchOn);
export const usePageViewType = () => usePageStore(state => state.page.viewType);
export const usePageCurrentItem = () => usePageStore(state => state.page.itemId);
export const usePageViewConfigs = () => usePageStore(state => state.page.viewConfigs);
export const usePageFeeds = () => usePageStore(state => [state.page.feedId]);
export const usePageItemFromFeed = () => usePageStore(state => state.page.itemFromFeed);
export const usePageItemShown = () => usePageStore(state => state.page.itemId && state.page.viewType !== ViewType.List);

export const usePageActions = () => usePageStore(state => state.actions);
