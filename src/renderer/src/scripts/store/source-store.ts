import * as db from "../db"
import intl from "react-intl-universal"
import { create } from 'zustand'
import { ADD_SOURCE, DELETE_SOURCE, RSSSource, SourceActionTypes, SourceState, UPDATE_SOURCE, UPDATE_STARRED_COUNTS, UPDATE_UNREAD_COUNTS, starredCount, unreadCount } from '../models/source'
import { useCombinedState } from './combined-store';
import { ActionStatus, fetchFavicon } from "../utils";
import { useAppStore } from "./app-store";

type SourceStore = {
    sourceActionTypes?: SourceActionTypes;
    insertSource: (source: RSSSource) => Promise<RSSSource>;
    addSourceSuccess: (source: RSSSource, batch: boolean) => void;
    updateSource: (source: RSSSource) => void;
    updateFavicon: (sids?: number[], force?: boolean) => void;
    deleteSourceDone: (source: RSSSource) => void;
    deleteSource: (source: RSSSource, batch: boolean) => Promise<void>;
    updateUnreadCounts: () => void;
    updateStarredCounts: () => void;
}

let insertPromises = Promise.resolve();
export const useSourceStore = create<SourceStore>((set, get) => ({
    insertSource: (source: RSSSource) => {
        return new Promise((resolve, reject) => {
            insertPromises = insertPromises.then(async () => {
                let sids = Object.values(useCombinedState.getState().sources).map(s => s.sid);
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
        set({ sourceActionTypes: {
            type: ADD_SOURCE,
            batch: batch,
            status: ActionStatus.Success,
            source: source,
        } });
    },
    updateSource: async (source: RSSSource) => {
        let sourceCopy = { ...source };
        delete sourceCopy.unreadCount;
        delete sourceCopy.starredCount;
        const row = db.sources.createRow(sourceCopy);
        await db.sourcesDB.insertOrReplace().into(db.sources).values([row]).exec();
        set({ sourceActionTypes: { type: UPDATE_SOURCE, source: source } });
    },
    updateFavicon: async (sids?: number[], force = false) => {
        const initSources = useCombinedState.getState().sources;
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
            const source = useCombinedState.getState().sources[sid];
            if (source && source.url === url && (force || source.iconurl === undefined)) {
                source.iconurl = favicon;
                get().updateSource(source);
            }
        })
        await Promise.all(promises);
    },
    deleteSourceDone: (source: RSSSource) => {
        set({ sourceActionTypes: { type: DELETE_SOURCE, source: source } });
    },
    deleteSource: async (source: RSSSource, batch = false) => {
        return new Promise(async (_resolve, reject) => {
            if (!batch) { useAppStore.getState().saveSettings() };
            try {
                await db.itemsDB.delete().from(db.items).where(db.items.source.eq(source.sid)).exec();
                await db.sourcesDB.delete().from(db.sources).where(db.sources.sid.eq(source.sid)).exec();
                get().deleteSourceDone(source);
                window.settings.saveGroups(useCombinedState.getState().groups);
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
        for (let source of Object.values(useCombinedState.getState().sources)) {
            sources[source.sid] = {
                ...source,
                unreadCount: 0,
            }
        }
        set({ sourceActionTypes: { type: UPDATE_UNREAD_COUNTS, sources: await unreadCount(sources) } });
    },
    updateStarredCounts: async () => {
        const sources: SourceState = {};
        for (let source of Object.values(useCombinedState.getState().sources)) {
            sources[source.sid] = {
                ...source,
                starredCount: 0,
            }
        }
        set({ sourceActionTypes: { type: UPDATE_STARRED_COUNTS, sources: await starredCount(sources) } });
    }
}))