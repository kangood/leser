import * as db from '../db';
import { create } from 'zustand'
import { FETCH_ITEMS, ItemActionTypes, ItemState, MARK_READ, RSSItem, insertItems } from '../models/item';
import { ActionStatus } from '../utils';
import { RSSSource } from '../models/source';
import { useAppStore } from "./app-store";
import { useFeedStore } from "./feed-store";
import { useServiceStore } from "./service-store";
import { useSourceStore } from './source-store';

type ItemStore = {
    items: ItemState;
    itemActionTypes?: ItemActionTypes;
    fetchItemsRequest: (fetchCount: number) => void;
    fetchItemsSuccess: (items: RSSItem[], itemState: ItemState) => void;
    fetchItemsFailure: (source: RSSSource, err: Error) => void;
    fetchItemsIntermediate: () => void;
    fetchItems: (background?: boolean, sids?: number[]) => void;
    markReadDone: (item: RSSItem) => void;
    markRead: (item: RSSItem) => void;
}

export const useItemStore = create<ItemStore>((set, get) => ({
    items: {},
    fetchItemsRequest: (fetchCount = 0) => {
        set({ itemActionTypes: { type: FETCH_ITEMS, status: ActionStatus.Request, fetchCount } })
    },
    fetchItemsSuccess: (items: RSSItem[], itemState: ItemState) => {
        set({ itemActionTypes: { type: FETCH_ITEMS, status: ActionStatus.Success, items: items, itemState: itemState } })
    },
    fetchItemsFailure: (source: RSSSource, err: Error) => {
        set({ itemActionTypes: { type: FETCH_ITEMS, status: ActionStatus.Failure, errSource: source, err: err } })
    },
    fetchItemsIntermediate: () => {
        set({ itemActionTypes: { type: FETCH_ITEMS, status: ActionStatus.Intermediate } })
    },
    fetchItems: async(background = false, sids = null) => {
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
    markReadDone: (item: RSSItem) => {
        set({ itemActionTypes: { type: MARK_READ, item: item } });
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
}))
