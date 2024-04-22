import { create } from 'zustand'
import { useCombinedState } from './combined-store'
import { useItemStore } from './item-store';
import { RSSItem } from '../models/item';
import { PageActionTypes, SHOW_ITEM } from '../models/page';

type PageStore = {
    pageActionTypes?: PageActionTypes;
    showItem: (feedId: string, item: RSSItem) => void;
    showItemFromId: (id: number) => void;
}

export const usePageStore = create<PageStore>((set, get) => ({
    showItem: (feedId: string, item: RSSItem) => {
        const state = useCombinedState.getState();
        if (
            state.items.hasOwnProperty(item._id) &&
            state.sources.hasOwnProperty(item.source)
        ) {
            set({ pageActionTypes: { type: SHOW_ITEM, feedId: feedId, item: item } });
        }
    },
    showItemFromId: (iid: number) => {
        const state = useCombinedState.getState();
        const item = state.items[iid];
        if (!item.hasRead) { useItemStore.getState().markRead(item) }
        if (item) { get().showItem(null, item) }
    }
}))
