import * as db from '../db';
import { create } from 'zustand'
import { ItemState, MARK_READ, MARK_UNREAD, RSSItem, TOGGLE_HIDDEN, TOGGLE_STARRED, applyItemReduction, insertItems } from '../models/item';
import { RSSSource } from '../models/source';
import { useAppStore } from "./app-store";
import { useFeedStore } from "./feed-store";
import { useServiceStore } from "./service-store";
import { useSourceStore } from './source-store';
import { devtools } from 'zustand/middleware';
import { platformCtrl } from '../utils';

export type ItemInTypes = {
    fetchingItems?: boolean;
    fetchingProgress?: number;
    fetchingTotal?: number;
    errSource?: RSSSource;
    err?: Error;
    items?: RSSItem[];
    itemState?: ItemState;
}

type ItemStore = {
    items: ItemState;
    itemInTypes?: ItemInTypes;
    fetchItemsRequest: (fetchCount: number) => void;
    fetchItemsSuccess: (items: RSSItem[], itemState: ItemState) => void;
    fetchItemsFailure: (source: RSSSource, err: Error) => void;
    fetchItemsIntermediate: () => void;
    fetchItems: (background?: boolean, sids?: number[]) => Promise<void>;
    toggleHiddenDone: (item: RSSItem, type?: string) => void;
    toggleStarredDone: (item: RSSItem) => void;
    markReadDone: (item: RSSItem) => void;
    markUnreadDone: (item: RSSItem) => void;
    markRead: (item: RSSItem) => void;
    markUnread: (item: RSSItem) => void;
    toggleStarred: (item: RSSItem) => void;
    toggleHidden: (item: RSSItem) => void;
    itemShortcuts: (item: RSSItem, e: KeyboardEvent) => void;
    initFeedSuccess: (items: RSSItem[]) => void;
    loadMoreSuccess: (items: RSSItem[]) => void;
}

export const useItemStore = create<ItemStore>()(devtools((set, get) => ({
    items: {},
    fetchItemsRequest: (fetchCount = 0) => {
        const itemInTypes: ItemInTypes = {
            fetchingItems: true,
            fetchingProgress: 0,
            fetchingTotal: fetchCount
        };
        useAppStore.getState().fetchItemsRequest(itemInTypes);
    },
    fetchItemsSuccess: (items: RSSItem[], itemState: ItemState) => {
        let newMap = {};
        for (let i of items) {
            newMap[i._id] = i;
        }
        set((state) => ({ items: { ...state.items, ...newMap } }));
        // [appReducer]
        const itemInTypes: ItemInTypes = { items: items, itemState: itemState };
        useAppStore.getState().fetchItemsSuccess(itemInTypes);
        // [feedReducer、sourceReducer]
    },
    fetchItemsFailure: (source: RSSSource, err: Error) => {
        const itemInTypes: ItemInTypes = {
            errSource: source,
            err: err
        };
        useAppStore.getState().fetchItemsFailure(itemInTypes);
    },
    fetchItemsIntermediate: () => {
        useAppStore.getState().fetchItemsIntermediate();
    },
    fetchItems: async (background = false, sids = null) => {
        let promises = new Array<Promise<RSSItem[]>>();
        const initState = { app: useAppStore.getState().app, sources: useSourceStore.getState().sources };
        if (!initState.app.fetchingItems && !initState.app.syncing) {
            if (
                sids === null ||
                sids.filter(sid => initState.sources[sid].serviceRef !== undefined).length > 0
            ) {
                await useServiceStore.getState().syncWithService(background);
            }
            let timenow = new Date().getTime();
            const sourcesState = useSourceStore.getState().sources;
            let sources =
                sids === null
                    ? Object.values(sourcesState).filter(s => {
                          let last = s.lastFetched ? s.lastFetched.getTime() : 0;
                          return (
                              !s.serviceRef &&
                              (last > timenow || last + (s.fetchFrequency || 0) * 60000 <= timenow)
                          );
                      })
                    : sids
                          .map(sid => sourcesState[sid])
                          .filter(s => !s.serviceRef);

            for (let source of sources) {
                let promise = RSSSource.fetchItems(source);
                promise.then(() => {
                    useSourceStore.getState().updateSource({ ...source, lastFetched: new Date() });
                })
                promise.finally(() => get().fetchItemsIntermediate());
                promises.push(promise);
            }
            get().fetchItemsRequest(promises.length);
            const results = await Promise.allSettled(promises);
            return await new Promise<void>((resolve, reject) => {
                let items = new Array<RSSItem>();
                results.map((r, i) => {
                    if (r.status === "fulfilled") {
                        items.push(...r.value);
                    } else {
                        console.log(r.reason);
                        get().fetchItemsFailure(sources[i], r.reason);
                    }
                })
                insertItems(items)
                    .then(inserted => {
                        get().fetchItemsSuccess(inserted.reverse(), useItemStore.getState().items);
                        resolve();
                        if (background) {
                            for (let item of inserted) {
                                if (item.notify) {
                                    useAppStore.getState().pushNotification(item);
                                }
                            }
                            if (inserted.length > 0) {
                                window.utils.requestAttention();
                            }
                        } else {
                            useFeedStore.getState().dismissItems();
                        }
                        useAppStore.getState().setupAutoFetch();
                    })
                    .catch((err: Error) => {
                        get().fetchItemsSuccess([], useItemStore.getState().items);
                        window.utils.showErrorBox( "A database error has occurred.", String(err) );
                        console.log(err);
                        reject(err);
                    })
            })
        }
    },
    toggleHiddenDone: (item: RSSItem, type = TOGGLE_HIDDEN) => {
        set((state) => ({
            items: {
                ...state.items,
                [item._id]: applyItemReduction(
                    state.items[item._id],
                    type
                )
            }
        }))
    },
    toggleStarredDone: (item: RSSItem) => {
        get().toggleHiddenDone(item, TOGGLE_STARRED);
        // [sourceReducer]
        useSourceStore.getState().toggleStarredDone(item);
    },
    markReadDone: (item: RSSItem) => {
        get().toggleHiddenDone(item, MARK_READ);
        // [sourceReducer]
        useSourceStore.getState().markReadDone(item);
    },
    markUnreadDone: (item: RSSItem) => {
        get().toggleHiddenDone(item, MARK_UNREAD);
        // [sourceReducer]
        useSourceStore.getState().markUnreadDone(item);
    },
    markRead: (item: RSSItem) => {
        item = useItemStore.getState().items[item._id];
        if (!item.hasRead) {
            db.itemsDB
                .update(db.items)
                .where(db.items._id.eq(item._id))
                .set(db.items.hasRead, true)
                .exec();
            get().markReadDone(item);
            if (item.serviceRef) {
                useServiceStore.getState().getServiceHooks().markRead?.(item);
            }
        }
    },
    markUnread: (item: RSSItem) => {
        item = useItemStore.getState().items[item._id];
        if (item.hasRead) {
            db.itemsDB
                .update(db.items)
                .where(db.items._id.eq(item._id))
                .set(db.items.hasRead, false)
                .exec();
            get().markUnreadDone(item);
            if (item.serviceRef) {
                useServiceStore.getState().getServiceHooks().markUnread?.(item);
            }
        }
    },
    toggleStarred: (item: RSSItem) => {
        db.itemsDB
            .update(db.items)
            .where(db.items._id.eq(item._id))
            .set(db.items.starred, !item.starred)
            .exec();
        get().toggleStarredDone(item);
        if (item.serviceRef) {
            const hooks = useServiceStore.getState().getServiceHooks();
            if (item.starred) {
                hooks.unstar?.(item);
            } else {
                hooks.star?.(item);
            }
        }
    },
    toggleHidden: (item: RSSItem) => {
        db.itemsDB
            .update(db.items)
            .where(db.items._id.eq(item._id))
            .set(db.items.hidden, !item.hidden)
            .exec();
        get().toggleHiddenDone(item);
    },
    itemShortcuts: (item: RSSItem, e: KeyboardEvent) => {
        if (e.metaKey) return
        switch (e.key) {
            case "m":
            case "M":
                if (item.hasRead) {
                    get().markUnread(item);
                } else {
                    get().markRead(item);
                }
                break;
            case "b":
            case "B":
                if (!item.hasRead) {
                    get().markRead(item);
                }
                window.utils.openExternal(item.link, platformCtrl(e));
                break;
            case "s":
            case "S":
                get().toggleStarred(item);
                break;
            case "h":
            case "H":
                if (!item.hasRead && !item.hidden) {
                    get().markRead(item);
                }
                get().toggleHidden(item);
                break;
        }
    },
    initFeedSuccess: (items: RSSItem[]) => {
        set(state => {
            let nextState = { ...state.items };
            for (let i of items) {
                nextState[i._id] = i;
            }
            return { items: nextState };
        });
    },
    loadMoreSuccess: (items: RSSItem[]) => {
        get().initFeedSuccess(items);
    }
}), { name: "item" }))
