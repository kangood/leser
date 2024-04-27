import * as db from '../db';
import { create } from 'zustand'
import { ItemState, MARK_READ, RSSItem, applyItemReduction, insertItems } from '../models/item';
import { RSSSource } from '../models/source';
import { useAppStore } from "./app-store";
import { useFeedStore } from "./feed-store";
import { useServiceStore } from "./service-store";
import { useSourceStore } from './source-store';
import { devtools } from 'zustand/middleware';

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
    markReadDone: (item: RSSItem) => void;
    markRead: (item: RSSItem) => void;
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
    toggleHiddenDone: (item: RSSItem, type?: string) => {
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
    markReadDone: (item: RSSItem) => {
        get().toggleHiddenDone(item, MARK_READ);
        // [sourceReducer]
        useSourceStore.getState().markReadDone(item);
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
    }
}), { name: "item" }))
