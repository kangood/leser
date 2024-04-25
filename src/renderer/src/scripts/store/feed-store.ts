import { create } from "zustand";
import { ALL, FeedFilter, FeedState, RSSFeed } from "../models/feed";
import { RSSItem } from "../models/item";
import { usePageStore } from "./page-store";
import { useItemStore } from "./item-store";

type FeedStore = {
    feeds: FeedState;
    initFeedsRequest: () => void;
    initFeedSuccess: (feed: RSSFeed, items: RSSItem[]) => void;
    initFeedFailure: (err: Error) => void;
    initFeedsSuccess: () => void;
    initFeeds: (force?: boolean) => Promise<void>;
    dismissItems: () => void;
};

const LOAD_QUANTITY = 50;

export const useFeedStore = create<FeedStore>((set, get) => ({
    feeds: { [ALL]: new RSSFeed(ALL) },
    initFeedsRequest: () => {
        console.log('~~initFeedsRequest~~');
    },
    initFeedSuccess: (feed: RSSFeed, items: RSSItem[]) => {
        set({
            feeds: {
                [feed._id]: {
                    ...feed,
                    loaded: true,
                    allLoaded: items.length < LOAD_QUANTITY,
                    iids: items.map(i => i._id),
                },
            }
        });
    },
    initFeedFailure: (err: Error) => {
        console.log('~~initFeedFailure~~', err);
    },
    initFeedsSuccess: () => {
        console.log('~~initFeedsSuccess~~');
    },
    initFeeds: async (force = false) => {
        get().initFeedsRequest();
        let promises = new Array<Promise<void>>();
        for (let feed of Object.values(useFeedStore.getState().feeds)) {
            if (!feed.loaded || force) {
                let p = RSSFeed.loadFeed(feed)
                    .then(items => {
                        get().initFeedSuccess(feed, items);
                    })
                    .catch(err => {
                        get().initFeedFailure(err);
                    });
                promises.push(p);
            }
        }
        await Promise.allSettled(promises);
        get().initFeedsSuccess();
    },
    dismissItems: () => {
        const state = { page: usePageStore.getState().page, feeds: useFeedStore.getState().feeds, items: useItemStore.getState().items };
        let fid = state.page.feedId;
        let filter = state.feeds[fid].filter;
        let iids = new Set<number>();
        for (let iid of state.feeds[fid].iids) {
            let item = state.items[iid];
            if (!FeedFilter.testItem(filter, item)) {
                iids.add(iid);
            }
        }
        let nextState = { ...get().feeds };
        let feed = get().feeds[fid];
        console.log('~~dismissItems~~');
        set({
            feeds: {
                ...nextState,
                [fid]: {
                    ...feed,
                    iids: feed.iids.filter(iid => !iids.has(iid))
                }
            }
         });
    }
}));
