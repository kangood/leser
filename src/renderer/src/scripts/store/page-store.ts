import { create } from 'zustand'
import { useItemStore } from './item-store';
import { RSSItem } from '../models/item';
import { PageState } from '../models/page';
import { ALL, FeedFilter, FilterType } from '../models/feed';
import { getWindowBreakpoint } from '../utils';
import { useSourceStore } from './source-store';
import { devtools } from 'zustand/middleware';
import { useAppStore } from './app-store';
import { useFeedStore } from './feed-store';

export type PageInTypes = {
    keepMenu: boolean;
    init: boolean;
}

type PageStore = {
    page: PageState;
    checkedFilter: (filterType: FilterType) => boolean;
    toggleFilter: (filterType: FilterType) => void;
    applyFilter: (feedFilter: FeedFilter) => void;
    selectAllArticles: (init?: boolean) => Promise<void>;
    showItem: (feedId: string, item: RSSItem) => void;
    showItemFromId: (id: number) => void;
}

export const usePageStore = create<PageStore>()(devtools((set, get) => ({
    page: new PageState(),
    checkedFilter: (filterType: FilterType) => {
        // 原 filterType 的状态和传过来的 filterType 作与运算，返回 checked 值
        return Boolean(get().page.filter.type & filterType);
    },
    toggleFilter: (filterType: FilterType) => {
        // 用于计算 filterType，再调用 applyFilter
        let nextFilter = { ...get().page.filter };
        nextFilter.type ^= filterType;
        get().applyFilter(nextFilter);
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
            useFeedStore.getState().initFeeds(true);
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
        useAppStore.getState().selectAllArticles(pageInTypes);
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
            useItemStore.getState().markRead(item);
        }
        if (item) {
            get().showItem(null, item);
        }
    },
    
}), { name: "page" }))
