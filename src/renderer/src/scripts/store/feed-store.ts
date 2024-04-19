import { create } from "zustand";
import { FeedActionTypes, FeedState, INIT_FEED, INIT_FEEDS, RSSFeed } from "../models/feed";
import { RSSItem } from "../models/item";
import { ActionStatus } from "../utils";

type FeedStateType = {
    feeds?: FeedState;
    feedActionTypes?: FeedActionTypes;
    initFeedsRequest: () => void;
    initFeedSuccess: (feed: RSSFeed, items: RSSItem[]) => void;
    initFeedFailure: (err: Error) => void;
    initFeedsSuccess: () => void;
    initFeeds: (force?: boolean) => Promise<void>;
};
  
export const useFeedStore = create<FeedStateType>((set, get) => ({
    initFeedsRequest: () => {
        set({ feedActionTypes: { type: INIT_FEEDS, status: ActionStatus.Request } });
    },
    initFeedSuccess: (feed: RSSFeed, items: RSSItem[]) => {
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
        set({ feedActionTypes: { type: INIT_FEED, status: ActionStatus.Failure, err: err } });
    },
    initFeedsSuccess: () => {
        set({ feedActionTypes: { type: INIT_FEEDS, status: ActionStatus.Success } });
    },
    initFeeds: async (force = false) => {
        get().initFeedsRequest();
        let promises = new Array<Promise<void>>();
        for (let feed of Object.values(get().feeds)) {
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
}));
