import { create } from "zustand";
import { ALL, FeedFilter, FeedState, RSSFeed, SOURCE } from "../models/feed";
import { RSSItem, applyItemReduction } from "../models/item";
import { itemActions, items } from "./item-store";
import { produce } from "immer";
import { devtools } from "zustand/middleware";
import { RSSSource } from "../models/source";
import { page } from "./page-store";
import { appActions } from "./app-store";

type FeedStore = {
    feeds: FeedState;
    actions: {
        initFeedsRequest: () => void;
        initFeedSuccess: (feed: RSSFeed, items: RSSItem[]) => void;
        initFeedFailure: (err: Error) => void;
        initFeedsSuccess: () => void;
        initFeeds: (force?: boolean) => Promise<void>;
        dismissItems: () => void;
        loadMoreRequest: (feed: RSSFeed) => void;
        loadMoreSuccess: (feed: RSSFeed, items: RSSItem[]) => void;
        loadMoreFailure: (feed: RSSFeed, err: Error) => void;
        loadMore: (feed: RSSFeed) => Promise<void>;
        hideSource: (source: RSSSource) => void;
        unhideSource: (source: RSSSource) => void;
        toggleHiddenDone: (item: RSSItem, type: string) => void;
        selectSources: (sids: number[]) => void;
    }
};

const LOAD_QUANTITY = 50;

const useFeedStore = create<FeedStore>()(devtools((set, get) => ({
    // 初始值差个 `groups:[]`
    feeds: { [ALL]: new RSSFeed(ALL) },
    actions: {
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
            // [itemReducer]
            itemActions.initFeedSuccess(items);
            // [pageReducer]
        },
        initFeedFailure: (err: Error) => {
            console.log('~~initFeedFailure~~', err);
        },
        initFeedsSuccess: () => {
            console.log('~~initFeedsSuccess~~');
            appActions.initFeedsSuccess();
        },
        initFeeds: async (force = false) => {
            get().actions.initFeedsRequest();
            let promises = new Array<Promise<void>>();
            for (let feed of Object.values(get().feeds)) {
                if (!feed.loaded || force) {
                    let p = RSSFeed.loadFeed(feed)
                        .then(items => {
                            get().actions.initFeedSuccess(feed, items);
                        })
                        .catch(err => {
                            get().actions.initFeedFailure(err);
                        });
                    promises.push(p);
                }
            }
            await Promise.allSettled(promises);
            get().actions.initFeedsSuccess();
        },
        dismissItems: () => {
            const state = { page: page, feeds: get().feeds, items: items };
            let fid = state.page.feedId;
            let filter = state.feeds[fid].filter;
            let iids = new Set<number>();
            for (let iid of state.feeds[fid].iids) {
                let item = state.items[iid];
                if (!FeedFilter.testItem(filter, item)) {
                    iids.add(iid);
                }
            }
            let feed = get().feeds[fid];
            console.log('~~dismissItems~~');
            set(produce((draft: FeedStore) => {
                draft.feeds[fid].iids = feed.iids.filter(iid => !iids.has(iid));
            }));
            // let nextState = { ...get().feeds };
            // set({
            //     feeds: {
            //         ...nextState,
            //         [fid]: {
            //             ...feed,
            //             iids: feed.iids.filter(iid => !iids.has(iid))
            //         }
            //     }
            // });
        },
        loadMoreRequest: (feed: RSSFeed) => {
            set(state => ({
                feeds: {
                    ...state.feeds,
                    [feed._id]: {
                        ...feed,
                        loaded: true
                    }
                }
            }));
        },
        loadMoreSuccess: (feed: RSSFeed, items: RSSItem[]) => {
            set(state => ({
                feeds: {
                    ...state.feeds,
                    [feed._id]: {
                        ...feed,
                        loading: false,
                        allLoaded: items.length < LOAD_QUANTITY,
                        iids: [
                            ...feed.iids,
                            ...items.map(i => i._id)
                        ]
                    }
                }
            }));
            // [itemReducer]
            itemActions.loadMoreSuccess(items);
        },
        loadMoreFailure: (feed: RSSFeed, _err: Error) => {
            set(state => ({
                feeds: {
                    ...state.feeds,
                    [feed._id]: {
                        ...feed,
                        loading: false
                    }
                }
            }));
        },
        loadMore: async (feed: RSSFeed) => {
            if (feed.loaded && !feed.loading && !feed.allLoaded) {
                get().actions.loadMoreRequest(feed);
                const skipNum = feed.iids.filter(i =>
                    FeedFilter.testItem(feed.filter, items[i])
                ).length;
                return RSSFeed.loadFeed(feed, skipNum)
                    .then(items => {
                        get().actions.loadMoreSuccess(feed, items);
                    })
                    .catch(e => {
                        console.log(e);
                        get().actions.loadMoreFailure(feed, e);
                    });
            }
            return new Promise((_, reject) => {
                reject();
            })
        },
        hideSource: (source: RSSSource) => {
            set(state => {
                let nextState = {};
                for (let [id, feed] of Object.entries(state.feeds)) {
                    nextState[id] = new RSSFeed(
                        id,
                        feed.sids.filter(sid => sid != source.sid),
                        feed.filter
                    );
                }
                return { feeds: nextState };
            });
        },
        unhideSource: (source: RSSSource) => {
            set(state => ({
                feeds: {
                    ...state.feeds,
                    [ALL]: new RSSFeed(
                        ALL,
                        [...state.feeds[ALL].sids, source.sid],
                        state.feeds[ALL].filter
                    ),
                }
            }))
        },
        toggleHiddenDone: (item: RSSItem, type: string) => {
            set(state => {
                let nextItem = applyItemReduction(item, type);
                let filteredFeeds = Object.values(state.feeds).filter(
                    feed =>
                        feed.loaded && !FeedFilter.testItem(feed.filter, nextItem)
                );
                if (filteredFeeds.length > 0) {
                    let nextState = { ...state.feeds };
                    for (let feed of filteredFeeds) {
                        nextState[feed._id] = {
                            ...feed,
                            iids: feed.iids.filter(id => id != nextItem._id),
                        }
                    }
                    return { feeds: nextState };
                } else {
                    return { feeds: state.feeds };
                }
            });
        },
        selectSources: (sids: number[]) => {
            set(state => ({
                feeds: {
                    ...state.feeds,
                    [SOURCE]: new RSSFeed(
                        SOURCE,
                        sids,
                        page.filter
                    ),
                }
            }));
        }
    }
}), { name: "feed" }))

export const feeds = useFeedStore.getState().feeds;
export const feedActions = useFeedStore.getState().actions;

export const useFeedById = (feedId: string) => useFeedStore(state => state.feeds[feedId]);
export const useFeedActions = () => useFeedStore(state => state.actions);
