import { create } from 'zustand'
import { useItemActions, useItems } from './item-store';
import { RSSItem } from '../models/item';
import { PageState } from '../models/page';
import { ALL, FeedFilter, FilterType, SOURCE } from '../models/feed';
import { getWindowBreakpoint } from '../utils';
import { devtools } from 'zustand/middleware';
import { useApp, useAppActions } from './app-store';
import { useFeedActions, useFeeds } from './feed-store';
import { useSources } from './source-store';
import { ViewConfigs, ViewType } from '@renderer/schema-types';

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
                useFeedActions().initFeeds(true);
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
            useAppActions().selectAllArticles(pageInTypes);
            // [feedReducer]
        },
        showItem: (feedId: string, item: RSSItem) => {
            const state = { items: useItems(), sources: useSources() };
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
            const item = useItems()[iid];
            if (!item.hasRead) {
                useItemActions().markRead(item);
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
            let state = { page: get().page, feeds: useFeeds(), items: useItems() };
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
                    useItemActions().markRead(item);
                    get().actions.showItem(feedId, item);
                    return;
                } else if (!feed.allLoaded) {
                    useFeedActions().loadMore(feed)
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
            if (useApp().menuKey !== menuKey) {
                set(state => ({
                    page: {
                        ...state.page,
                        feedId: SOURCE,
                        itemId: null,
                    }
                }))
                // [feedReducer]
                useFeedActions().selectSources(sids);
                // [appReducer]
                useAppActions().selectSources(menuKey, title);
            }
        },
    },
}), { name: "page" }))

export const usePage = () => usePageStore(state => state.page);
export const usePageFilter = () => usePageStore(state => state.page.filter);
export const usePageViewType = () => usePageStore(state => state.page.viewType);
export const usePageCurrentItem = () => usePageStore(state => state.page.itemId);
export const usePageViewConfigs = () => usePageStore(state => state.page.viewConfigs);
export const usePageFeeds = () => usePageStore(state => [state.page.feedId]);
export const usePageItemFromFeed = () => usePageStore(state => state.page.itemFromFeed);
export const usePageItemShown = () => usePageStore(state => state.page.itemId && state.page.viewType !== ViewType.List);

export const usePageActions = () => usePageStore(state => state.actions);
