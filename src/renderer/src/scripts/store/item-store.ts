import * as db from '../db';
import { create } from 'zustand'
import { ItemState, MARK_READ, MARK_UNREAD, RSSItem, TOGGLE_HIDDEN, TOGGLE_STARRED, applyItemReduction, insertItems } from '../models/item';
import { RSSSource } from '../models/source';
import { appActions, appState } from "./app-store";
import { feedActions, feeds } from "./feed-store";
import { sourceActions, sourcesZ } from './source-store';
import { devtools } from 'zustand/middleware';
import { platformCtrl } from '../utils';
import { RSSFeed } from '../models/feed';
import { page, pageActions } from './page-store';
import lf from 'lovefield';
import { serviceActions } from './service-store';

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
    actions: {
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
        articleToggleHidden: (item: RSSItem) => void;
        contextMenuToggleHidden: (item: RSSItem) => void;
        itemShortcuts: (item: RSSItem, e: KeyboardEvent) => void;
        initFeedSuccess: (items: RSSItem[]) => void;
        loadMoreSuccess: (items: RSSItem[]) => void;
        markAllReadDone: (sids: number[], time?: number, before?: boolean) => void;
        markAllRead: (sids?: number[], date?: Date, before?: boolean) => void;
        freeMemory: (iids: Set<number>) => void;
    }
}

const useItemStore = create<ItemStore>()(devtools((set, get) => ({
    items: {},
    actions: {
        fetchItemsRequest: (fetchCount = 0) => {
            const itemInTypes: ItemInTypes = {
                fetchingItems: true,
                fetchingProgress: 0,
                fetchingTotal: fetchCount
            };
            appActions.fetchItemsRequest(itemInTypes);
        },
        fetchItemsSuccess: (items: RSSItem[], itemState: ItemState) => {
            let newMap = {};
            for (let i of items) {
                newMap[i._id] = i;
            }
            set((state) => ({ items: { ...state.items, ...newMap } }));
            // [appReducer]
            const itemInTypes: ItemInTypes = { items: items, itemState: itemState };
            appActions.fetchItemsSuccess(itemInTypes);
            // [feedReducer、sourceReducer]
        },
        fetchItemsFailure: (source: RSSSource, err: Error) => {
            const itemInTypes: ItemInTypes = {
                errSource: source,
                err: err
            };
            appActions.fetchItemsFailure(itemInTypes);
        },
        fetchItemsIntermediate: () => {
            appActions.fetchItemsIntermediate();
        },
        fetchItems: async (background = false, sids = null) => {
            let promises = new Array<Promise<RSSItem[]>>();
            const initState = { app: appState, sources: sourcesZ };
            if (!initState.app.fetchingItems && !initState.app.syncing) {
                if (
                    sids === null ||
                    sids.filter(sid => initState.sources[sid].serviceRef !== undefined).length > 0
                ) {
                    await serviceActions.syncWithService(background);
                }
                let timenow = new Date().getTime();
                const sourcesState = sourcesZ;
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
                        sourceActions.updateSource({ ...source, lastFetched: new Date() });
                    })
                    promise.finally(() => get().actions.fetchItemsIntermediate());
                    promises.push(promise);
                }
                get().actions.fetchItemsRequest(promises.length);
                const results = await Promise.allSettled(promises);
                return await new Promise<void>((resolve, reject) => {
                    let items = new Array<RSSItem>();
                    results.map((r, i) => {
                        if (r.status === "fulfilled") {
                            items.push(...r.value);
                        } else {
                            console.log(r.reason);
                            get().actions.fetchItemsFailure(sources[i], r.reason);
                        }
                    })
                    insertItems(items)
                        .then(inserted => {
                            get().actions.fetchItemsSuccess(inserted.reverse(), get().items);
                            resolve();
                            if (background) {
                                for (let item of inserted) {
                                    if (item.notify) {
                                        appActions.pushNotification(item);
                                    }
                                }
                                if (inserted.length > 0) {
                                    window.utils.requestAttention();
                                }
                            } else {
                                feedActions.dismissItems();
                            }
                            appActions.setupAutoFetch();
                        })
                        .catch((err: Error) => {
                            get().actions.fetchItemsSuccess([], get().items);
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
            // [feedReducer]
            feedActions.toggleHiddenDone(item, type);
        },
        toggleStarredDone: (item: RSSItem) => {
            get().actions.toggleHiddenDone(item, TOGGLE_STARRED);
            // [sourceReducer]
            sourceActions.toggleStarredDone(item);
        },
        markReadDone: (item: RSSItem) => {
            get().actions.toggleHiddenDone(item, MARK_READ);
            // [sourceReducer]
            sourceActions.markReadDone(item);
        },
        markUnreadDone: (item: RSSItem) => {
            get().actions.toggleHiddenDone(item, MARK_UNREAD);
            // [sourceReducer]
            sourceActions.markUnreadDone(item);
        },
        markRead: (item: RSSItem) => {
            item = get().items[item._id];
            if (!item.hasRead) {
                db.itemsDB
                    .update(db.items)
                    .where(db.items._id.eq(item._id))
                    .set(db.items.hasRead, true)
                    .exec();
                get().actions.markReadDone(item);
                if (item.serviceRef) {
                    serviceActions.getServiceHooks().markRead?.(item);
                }
            }
        },
        markUnread: (item: RSSItem) => {
            item = get().items[item._id];
            if (item.hasRead) {
                db.itemsDB
                    .update(db.items)
                    .where(db.items._id.eq(item._id))
                    .set(db.items.hasRead, false)
                    .exec();
                get().actions.markUnreadDone(item);
                if (item.serviceRef) {
                    serviceActions.getServiceHooks().markUnread?.(item);
                }
            }
        },
        toggleStarred: (item: RSSItem) => {
            db.itemsDB
                .update(db.items)
                .where(db.items._id.eq(item._id))
                .set(db.items.starred, !item.starred)
                .exec();
            get().actions.toggleStarredDone(item);
            if (item.serviceRef) {
                const hooks = serviceActions.getServiceHooks();
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
            get().actions.toggleHiddenDone(item);
        },
        articleToggleHidden: (item: RSSItem) => {
            if (!item.hidden) {
                pageActions.dismissItem();
            }
            if (!item.hasRead && !item.hidden) {
                get().actions.markRead(item);
            }
            get().actions.toggleHidden(item);
        },
        contextMenuToggleHidden: (item: RSSItem) => {
            if (!item.hasRead) {
                get().actions.markRead(item);
                item.hasRead = true;
            }
            get().actions.toggleHidden(item);
        },
        itemShortcuts: (item: RSSItem, e: KeyboardEvent) => {
            if (e.metaKey) return
            switch (e.key) {
                case "m":
                case "M":
                    if (item.hasRead) {
                        get().actions.markUnread(item);
                    } else {
                        get().actions.markRead(item);
                    }
                    break;
                case "b":
                case "B":
                    if (!item.hasRead) {
                        get().actions.markRead(item);
                    }
                    window.utils.openExternal(item.link, platformCtrl(e));
                    break;
                case "s":
                case "S":
                    get().actions.toggleStarred(item);
                    break;
                case "h":
                case "H":
                    if (!item.hasRead && !item.hidden) {
                        get().actions.markRead(item);
                    }
                    get().actions.toggleHidden(item);
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
            get().actions.initFeedSuccess(items);
        },
        markAllReadDone: (sids: number[], time: number, before: boolean) => {
            set(state => {
                let nextState = { ...state.items };
                const sidsLocal = new Set(sids);
                for (let item of Object.values(state.items)) {
                    if (sidsLocal.has(item.source) && !item.hasRead) {
                        if (
                            !time ||
                            (before
                                ? item.date.getTime() <= time
                                : item.date.getTime() >= time)
                        ) {
                            nextState[item._id] = {
                                ...item,
                                hasRead: true,
                            }
                        }
                    }
                }
                return { items: nextState };
            });
            // [sourceReducer]
            sourceActions.markAllReadDone(sids, time);
        },
        markAllRead: async (sids: number[] = null, date: Date = null, before = true) => {
            let state = { feeds: feeds, page: page };
            if (sids === null) {
                let feed = state.feeds[state.page.feedId];
                sids = feed.sids;
            }
            const action = serviceActions.getServiceHooks().markAllReadNew?.(sids, date, before);
            if (action) {
                await action
            }
            const predicates: lf.Predicate[] = [
                db.items.source.in(sids),
                db.items.hasRead.eq(false),
            ]
            if (date) {
                predicates.push(
                    before ? db.items.date.lte(date) : db.items.date.gte(date)
                )
            }
            const query = lf.op.and.apply(null, predicates)
            await db.itemsDB
                .update(db.items)
                .set(db.items.hasRead, true)
                .where(query)
                .exec()
            if (date) {
                get().actions.markAllReadDone(sids, date.getTime(), before);
                sourceActions.updateUnreadCounts();
                sourceActions.updateStarredCounts();
            } else {
                get().actions.markAllReadDone(sids);
            }
        },
        freeMemory: (iids: Set<number>) => {
            set(state => {
                const nextState: ItemState = {};
                for (let item of Object.values(state.items)) {
                    if (iids.has(item._id)) {
                        nextState[item._id] = item;
                    }
                }
                return { items: nextState };
            })
        },
    }
}), { name: "item" }))

export const items = useItemStore.getState().items;
export const itemActions = useItemStore.getState().actions;

export const useItems = () => useItemStore(state => state.items);
export const useItemsByFeed = (feed: RSSFeed) => useItemStore(state => feed.iids.map(iid => state.items[iid]));

export const useItemActions = () => useItemStore(state => state.actions);
