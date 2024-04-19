import { create } from 'zustand'
import { FeedFilter, FilterType } from '../models/feed';
import { PageState } from '../models/page';
import { useFeedStore } from './feed-store';

type PageStateType = {
    page: PageState;
    toggleFilter: (filterType: FilterType) => void;
    applyFilter: (feedFilter: FeedFilter) => void;
}

export const usePageState = create<PageStateType>((set, get) => ({
    page: new PageState(),
    toggleFilter: (filterType: FilterType) => {
        let nextFilter = { ...get().page.filter };
        nextFilter.type ^= filterType;
        get().applyFilter(nextFilter);
    },
    applyFilter: (feedFilter: FeedFilter) => {
        const oldFilterType = get().page.filter.type;
        // 新老 filterType 对比，不一样就 set
        if (feedFilter.type !== oldFilterType) {
            window.settings.setFilterType(feedFilter.type);
            set(state => ({ page: { ...state.page, filter: feedFilter } }));
            // 调用 initFeeds
            useFeedStore.getState().initFeeds(true);
        }
    },
}))
