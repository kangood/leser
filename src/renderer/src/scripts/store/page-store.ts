import { create } from 'zustand'
import { useItemStore } from './item-store';
import { RSSItem } from '../models/item';
import { PageState } from '../models/page';
import { ALL, FeedFilter } from '../models/feed';
import { getWindowBreakpoint } from '../utils';
import { useSourceStore } from './source-store';

type PageInTypes = {
    keepMenu: boolean;
    filter: FeedFilter;
    init: boolean;
}

type PageStore = {
    page: PageState;
    pageInTypes?: PageInTypes;
    selectAllArticles: (init?: boolean) => void;
    showItem: (feedId: string, item: RSSItem) => void;
    showItemFromId: (id: number) => void;
}

export const usePageStore = create<PageStore>((set, get) => ({
    page: new PageState(),
    selectAllArticles: (init = false) => {
        set({
            page: {
                ...get().page,
                feedId: ALL,
                itemId: null
            },
            pageInTypes: {
                keepMenu: getWindowBreakpoint(),
                filter: get().page.filter,
                init: init
            }
        });
    },
    showItem: (feedId: string, item: RSSItem) => {
        const state = { items: useItemStore.getState().items, sources: useSourceStore.getState().sources };
        if (
            state.items.hasOwnProperty(item._id) &&
            state.sources.hasOwnProperty(item.source)
        ) {
            set({
                page: {
                    ...get().page,
                    itemId: item._id,
                    itemFromFeed: Boolean(feedId)
                }
            });
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
    }
}))
