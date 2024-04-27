import * as db from "../db"
import intl from "react-intl-universal"
import { create } from 'zustand'
import { RSSSource, SourceState, starredCount, unreadCount } from '../models/source'
import { fetchFavicon } from "../utils";
import { useAppStore } from "./app-store";
import { MARK_UNREAD, RSSItem, insertItems } from "../models/item";
import { useGroupStore } from "./group-store";
import { devtools } from "zustand/middleware";

type SourceInTypes = {
    batch: boolean;
}

type SourceStore = {
    sources: SourceState;
    sourceInTypes?: SourceInTypes;
    initSourcesRequest: () => void;
    initSourcesSuccess: (sources: SourceState) => void;
    initSources: () => Promise<void>;
    insertSource: (source: RSSSource) => Promise<RSSSource>;
    addSourceSuccess: (source: RSSSource, batch: boolean) => void;
    updateSource: (source: RSSSource) => void;
    updateFavicon: (sids?: number[], force?: boolean) => Promise<void>;
    deleteSourceDone: (source: RSSSource) => void;
    deleteSource: (source: RSSSource, batch: boolean) => Promise<void>;
    updateUnreadCounts: () => void;
    updateStarredCounts: () => void;
    addSourceRequest: (batch: boolean) => void;
    addSourceFailure: (err: Error, batch: boolean) => void;
    addSource: (url: string, name?: string, batch?: boolean) => void;
    markReadDone: (item: RSSItem, type?: string) => void;
}

let insertPromises = Promise.resolve();
export const useSourceStore = create<SourceStore>()(devtools((set, get) => ({
    sources: {},
    initSourcesRequest: () => {
        console.log('~~initSourcesRequest~~');
    },
    initSourcesSuccess: (sources: SourceState) => {
        set({ sources: sources });
        // [appReducer]
        useAppStore.getState().initSourcesSuccess();
        // [feedReducer]
    },
    initSources: async () => {
        get().initSourcesRequest();
        // 查询数据库中的数据源，并初始化时把 [unreadCount, starredCount] 都置空，再重新计算
        await db.init();
        const sources = ( await db.sourcesDB.select().from(db.sources).exec() ) as RSSSource[];
        const state: SourceState = {};
        for (let source of sources) {
            source.unreadCount = 0;
            source.starredCount = 0;
            state[source.sid] = source;
        }
        await unreadCount(state);
        await starredCount(state);
        // 订阅源分组
        useGroupStore.getState().fixBrokenGroups(state);
        get().initSourcesSuccess(state);
    },
    insertSource: (source: RSSSource) => {
        return new Promise((resolve, reject) => {
            console.log('~~insertSource~~');
            insertPromises = insertPromises.then(async () => {
                let sids = Object.values(useSourceStore.getState().sources).map(s => s.sid);
                source.sid = Math.max(...sids, -1) + 1;
                const row = db.sources.createRow(source);
                try {
                    const inserted = (await db.sourcesDB
                        .insert()
                        .into(db.sources)
                        .values([row])
                        .exec()) as RSSSource[]
                    resolve(inserted[0]);
                } catch (err) {
                    if (err.code === 201) {
                        reject(intl.get("sources.exist"));
                    } else {
                        reject(err);
                    }
                }
            })
        })
    },
    addSourceSuccess: (source: RSSSource, batch: boolean) => {
        set({
            sources: {
                ...get().sources,
                [source.sid]: source
            },
            sourceInTypes: {
                batch: batch
            }
        });
    },
    updateSource: async (source: RSSSource) => {
        let sourceCopy = { ...source };
        delete sourceCopy.unreadCount;
        delete sourceCopy.starredCount;
        const row = db.sources.createRow(sourceCopy);
        await db.sourcesDB.insertOrReplace().into(db.sources).values([row]).exec();
        set((state) => ({ sources: { ...state.sources, [source.sid]: source } }));
    },
    updateFavicon: async (sids?: number[], force = false) => {
        const initSources = useSourceStore.getState().sources;
        if (!sids) {
            sids = Object.values(initSources)
                .filter(s => s.iconurl === undefined)
                .map(s => s.sid);
        } else {
            sids = sids.filter(sid => sid in initSources);
        }
        const promises = sids.map(async sid => {
            const url = initSources[sid].url;
            let favicon = (await fetchFavicon(url)) || "";
            const source = useSourceStore.getState().sources[sid];
            if (source && source.url === url && (force || source.iconurl === undefined)) {
                source.iconurl = favicon;
                get().updateSource(source);
            }
        })
        await Promise.all(promises);
    },
    deleteSourceDone: (source: RSSSource) => {
        const state = get().sources;
        delete state[source.sid];
        set({ sources: { ...state } });
    },
    deleteSource: async (source: RSSSource, batch = false) => {
        return new Promise(async (_resolve, reject) => {
            if (!batch) { useAppStore.getState().saveSettings() };
            try {
                await db.itemsDB.delete().from(db.items).where(db.items.source.eq(source.sid)).exec();
                await db.sourcesDB.delete().from(db.sources).where(db.sources.sid.eq(source.sid)).exec();
                get().deleteSourceDone(source);
                window.settings.saveGroups(useGroupStore.getState().groups);
            } catch (err) {
                console.log(err);
                reject(err);
            } finally {
                if (!batch) { useAppStore.getState().saveSettings() };
            }
        });
    },
    updateUnreadCounts: async () => {
        const sources: SourceState = {};
        for (let source of Object.values(get().sources)) {
            sources[source.sid] = {
                ...source,
                unreadCount: 0,
            }
        }
        set({ sources: await unreadCount(sources) });
    },
    updateStarredCounts: async () => {
        const sources: SourceState = {};
        for (let source of Object.values(useSourceStore.getState().sources)) {
            sources[source.sid] = {
                ...source,
                starredCount: 0,
            }
        }
        set({ sources: await starredCount(sources) });
    },
    addSourceRequest: (batch: boolean) => {
        set({ sourceInTypes: { batch: batch } });
    },
    addSourceFailure: (err: Error, batch: boolean) => {
        console.log('~~addSourceFailure~~', err);
        set({ sourceInTypes: { batch: batch } });
    },
    addSource: async (url: string, name: string = null, batch = false) => {
        const app = useAppStore.getState().app;
        console.log('addSource~~', app);
        if (app.sourceInit) {
            get().addSourceRequest(batch);
            const source = new RSSSource(url, name);
            try {
                console.log('addSource in', source);
                const feed = await RSSSource.fetchMetaData(source);
                const inserted = await get().insertSource(source);
                inserted.unreadCount = feed.items.length;
                inserted.starredCount = 0;
                get().addSourceSuccess(inserted, batch);
                window.settings.saveGroups(useGroupStore.getState().groups);
                get().updateFavicon([inserted.sid]);
                const items = await RSSSource.checkItems(inserted, feed.items);
                await insertItems(items);
                return inserted.sid;
            } catch (e) {
                get().addSourceFailure(e, batch);
                if (!batch) {
                    window.utils.showErrorBox(
                        intl.get("sources.errorAdd"),
                        String(e),
                        intl.get("context.copy"),
                    );
                }
                throw e;
            }
        }
        throw new Error("Sources not initialized.");
    },
    markReadDone: (item: RSSItem, type?: string) => {
        set((state) => ({
            sources: {
                ...state.sources,
                [item.source]: {
                    ...state.sources[item.source],
                    unreadCount: state.sources[item.source].unreadCount + (type === MARK_UNREAD ? 1 : -1)
                }
            }
        }))
    }
}), { name: "source" }))
