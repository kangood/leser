import { create } from "zustand";
import { DISMISS_ITEMS, FeedActionTypes, FeedFilter, FeedState, INIT_FEED, INIT_FEEDS, RSSFeed } from "../models/feed";
import { RSSItem } from "../models/item";
import { ActionStatus } from "../utils";
import { useCombinedState } from "./combined-store";

type FeedStore = {
    feedActionTypes?: FeedActionTypes;
    initFeedsRequest: () => void;
    initFeedSuccess: (feed: RSSFeed, items: RSSItem[]) => void;
    initFeedFailure: (err: Error) => void;
    initFeedsSuccess: () => void;
    initFeeds: (force?: boolean) => Promise<void>;
    dismissItems: () => void;
};
  
export const useFeedStore = create<FeedStore>((set, get) => ({
    initFeedsRequest: () => {
        set({ feedActionTypes: { type: INIT_FEEDS, status: ActionStatus.Request } });
    },
    initFeedSuccess: (feed: RSSFeed, items: RSSItem[]) => {
        console.log('initFeedSuccess');
        set({
            feedActionTypes: {
                type: INIT_FEED,
                status: ActionStatus.Success,
                items: items,
                feed: feed,
            }
        });
    },
    initFeedFailure: (err: Error) => {
        console.log('initFeedFailure');
        set({ feedActionTypes: { type: INIT_FEED, status: ActionStatus.Failure, err: err } });
    },
    initFeedsSuccess: () => {
        set({ feedActionTypes: { type: INIT_FEEDS, status: ActionStatus.Success } });
    },
    initFeeds: async (force = false) => {
        get().initFeedsRequest();
        let promises = new Array<Promise<void>>();
        for (let feed of Object.values(useCombinedState.getState().feeds)) {
            if (!feed.loaded || force) {
                let p = RSSFeed.loadFeed(feed)
                    .then(items => {
                        get().initFeedSuccess(feed, items);
                    })
                    .catch(err => {
                        console.log(err);
                        get().initFeedFailure(err);
                    });
                promises.push(p);
            }
        }
        await Promise.allSettled(promises);
        get().initFeedsSuccess();
    },
    dismissItems: () => {
        const state = useCombinedState.getState();
        let fid = state.page.feedId;
        let filter = state.feeds[fid].filter;
        let iids = new Set<number>();
        for (let iid of state.feeds[fid].iids) {
            let item = state.items[iid];
            if (!FeedFilter.testItem(filter, item)) {
                iids.add(iid);
            }
        }
        set({ feedActionTypes: { type: DISMISS_ITEMS, fid: fid, iids: iids } });
    }
}));
