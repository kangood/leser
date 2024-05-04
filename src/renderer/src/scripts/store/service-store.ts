import * as db from "../db";
import lf from "lovefield";
import { create } from 'zustand';
import { SYNC_LOCAL_ITEMS, ServiceActionTypes, ServiceHooks, getServiceHooksFromType } from '../models/service';
import { ServiceConfigs, SyncService } from '@renderer/schema-types';
import { useApp, useAppActions } from './app-store';
import { RSSSource } from '../models/source';
import { useSourceActions, useSources } from "./source-store";
import { insertItems } from "../models/item";
import { useItemActions, useItems } from "./item-store";
import { devtools } from "zustand/middleware";
import { useGroupActions, useGroups } from "./group-store";

type ServiceStore = {
    service?: ServiceConfigs;
    serviceActionTypes?: ServiceActionTypes;
    actions: {
        getServiceHooks: () => ServiceHooks;
        saveServiceConfigs: (configs: ServiceConfigs) => void;
        reauthenticate: (hooks: ServiceHooks) => void;
        syncLocalItems: (unread: Set<string>, starred: Set<string>) => void;
        updateSources: (hook: ServiceHooks["updateSourcesNew"]) => Promise<void>;
        syncItems: (hook: ServiceHooks["syncItemsNew"]) => Promise<void>;
        syncWithService: (background?: boolean) => Promise<void>;
        fetchItems: (hook: ServiceHooks["fetchItemsNew"], background: boolean) => Promise<void>;
        importGroups: () => Promise<void>;
        removeService: () => Promise<void>;
    },
}
const useServiceStore = create<ServiceStore>()(devtools((set, get) => ({
    service: { type: SyncService.None },
    actions: {
        getServiceHooks: () => {
            return getServiceHooksFromType(get().service.type);
        },
        saveServiceConfigs: (configs: ServiceConfigs) => {
            window.settings.setServiceConfigs(configs);
            set({ service: configs });
        },
        reauthenticate: async (hooks: ServiceHooks) => {
            let configs = get().service;
            if (!(await hooks.authenticate(configs))) {
                configs = await hooks.reauthenticate(configs);
                get().actions.saveServiceConfigs(configs);
            }
        },
        syncLocalItems: (unread: Set<string>, starred: Set<string>) => {
            set({ serviceActionTypes: { type: SYNC_LOCAL_ITEMS, unreadIds: unread, starredIds: starred } })
        },
        updateSources: async (hook: ServiceHooks["updateSourcesNew"]) => {
            const [sources, groupsMap] = await hook();
            const existing = new Map<string, RSSSource>();
            for (let source of Object.values(useSources())) {
                if (source.serviceRef) {
                    existing.set(source.serviceRef, source);
                }
            }
            const forceSettings = () => {
                if (!useApp().settings.saving) {
                    useAppActions().saveSettings();
                }
            }
            let promises = sources.map(async s => {
                if (existing.has(s.serviceRef)) {
                    const doc = existing.get(s.serviceRef);
                    existing.delete(s.serviceRef);
                    return doc;
                } else {
                    const docs = (
                        await db.sourcesDB
                            .select()
                            .from(db.sources)
                            .where(db.sources.url.eq(s.url))
                            .exec()
                    ) as RSSSource[];
                    if (docs.length === 0) {
                        forceSettings();
                        // 添加数据源
                        const inserted = await useSourceActions().insertSource(s);
                        inserted.unreadCount = 0;
                        useSourceActions().addSourceSuccess(inserted, true);
                        window.settings.saveGroups(useGroups());
                        // 更新网站图标
                        useSourceActions().updateFavicon([inserted.sid]);
                        return inserted;
                    } else if (docs[0].serviceRef !== s.serviceRef) {
                        // 将现有来源标记为远程，并删除所有项目
                        const doc = docs[0];
                        forceSettings();
                        doc.serviceRef = s.serviceRef;
                        doc.unreadCount = 0;
                        useSourceActions().updateSource(doc);
                        await db.itemsDB
                            .delete()
                            .from(db.items)
                            .where(db.items.source.eq(doc.sid))
                            .exec();
                        return doc;
                    } else {
                        return docs[0];
                    }
                }
            })
            for (let [_, source] of existing) {
                // 删除服务端同步过来的数据源
                forceSettings();
                promises.push(useSourceActions().deleteSource(source, true).then(() => null));
            }
            let sourcesResults = (await Promise.all(promises)).filter(s => s);
            if (groupsMap) {
                // 添加数据源、导入分组
                forceSettings();
                for (let source of sourcesResults) {
                    if (groupsMap.has(source.serviceRef)) {
                        const gid = useGroupActions().createSourceGroup(groupsMap.get(source.serviceRef));
                        useGroupActions().addSourceToGroup(gid, source.sid);
                    }
                }
                const configs = get().service;
                delete configs.importGroups;
                get().actions.saveServiceConfigs(configs);
            }
        },
        syncItems: async (hook: ServiceHooks["syncItemsNew"]) => {
            const [unreadRefs, starredRefs] = await hook();
            const unreadCopy = new Set(unreadRefs);
            const starredCopy = new Set(starredRefs);
            const rows = await db.itemsDB
                .select(db.items.serviceRef, db.items.hasRead, db.items.starred)
                .from(db.items)
                .where(
                    lf.op.and(
                        db.items.serviceRef.isNotNull(),
                        lf.op.or(
                            db.items.hasRead.eq(false),
                            db.items.starred.eq(true)
                        )
                    )
                )
                .exec();
            const updates = new Array<lf.query.Update>();
            for (let row of rows) {
                const serviceRef = row["serviceRef"];
                if (row["hasRead"] === false && !unreadRefs.delete(serviceRef)) {
                    updates.push(
                        db.itemsDB
                            .update(db.items)
                            .set(db.items.hasRead, true)
                            .where(db.items.serviceRef.eq(serviceRef))
                    );
                }
                if (row["starred"] === true && !starredRefs.delete(serviceRef)) {
                    updates.push(
                        db.itemsDB
                            .update(db.items)
                            .set(db.items.starred, false)
                            .where(db.items.serviceRef.eq(serviceRef))
                    );
                }
            }
            for (let unread of unreadRefs) {
                updates.push(
                    db.itemsDB
                        .update(db.items)
                        .set(db.items.hasRead, false)
                        .where(db.items.serviceRef.eq(unread))
                );
            }
            for (let starred of starredRefs) {
                updates.push(
                    db.itemsDB
                        .update(db.items)
                        .set(db.items.starred, true)
                        .where(db.items.serviceRef.eq(starred))
                );
            }
            if (updates.length > 0) {
                await db.itemsDB.createTransaction().exec(updates);
                await useSourceActions().updateUnreadCounts();
                await useSourceActions().updateStarredCounts();
                get().actions.syncLocalItems(unreadCopy, starredCopy);
            }
        },
        fetchItems: async (hook: ServiceHooks["fetchItemsNew"], background: boolean) => {
            const [items, configs] = await hook();
            if (items.length > 0) {
                const inserted = await insertItems(items);
                useItemActions().fetchItemsSuccess(inserted.reverse(), useItems());
                if (background) {
                    for (let item of inserted) {
                        if (item.notify) {
                            useAppActions().pushNotification(item);
                        }
                    }
                    if (inserted.length > 0) window.utils.requestAttention();
                }
                get().actions.saveServiceConfigs(configs);
            }
        },
        syncWithService: async (background = false) => {
            const hooks = get().actions.getServiceHooks();
            if (hooks.updateSourcesNew && hooks.fetchItems && hooks.syncItems) {
                try {
                    // [appReducer]
                    useAppActions().syncWithServiceRequest();
                    if (hooks.reauthenticate) {
                        get().actions.reauthenticate(hooks);
                    }
                    await get().actions.updateSources(hooks.updateSourcesNew);
                    await get().actions.syncItems(hooks.syncItemsNew);
                    await get().actions.fetchItems(hooks.fetchItemsNew, background);
                    // [appReducer]
                    useAppActions().syncWithServiceSuccess();
                } catch (err) {
                    console.log(err);
                    // [appReducer]
                    useAppActions().syncWithServiceFailure(err);
                } finally {
                    if (useApp().settings.saving) {
                        useAppActions().saveSettings();
                    }
                }
            }
        },
        importGroups: async () => {
            const configs = get().service;
            if (configs.type !== SyncService.None) {
                useAppActions().saveSettings();
                configs.importGroups = true;
                get().actions.saveServiceConfigs(configs);
                await get().actions.syncWithService();
            }
        },
        removeService: async () => {
            useAppActions().saveSettings();
            const sources = useSources();
            const promises = Object.values(sources)
                .filter(s => s.serviceRef)
                .map(async s => {
                    await useSourceActions().deleteSource(s, true);
                });
            await Promise.all(promises);
            get().actions.saveServiceConfigs({ type: SyncService.None });
            useAppActions().saveSettings();
        },
    },
}), { name: "service" }))

export const useServiceOn = () => useServiceStore(state => state.service.type !== SyncService.None);
export const useService = () => useServiceStore(state => state.service);

export const useServiceActions = () => useServiceStore(state => state.actions);

export const authenticate = async (configs: ServiceConfigs) => {
    const hooks = getServiceHooksFromType(configs.type);
    if (hooks.authenticate) {
        return await hooks.authenticate(configs);
    } else {
        return true;
    }
}

export const reauthenticate = async (configs: ServiceConfigs) => {
    const hooks = getServiceHooksFromType(configs.type);
    try {
        if (hooks.reauthenticate) {
            return await hooks.reauthenticate(configs);
        }
    } catch (err) {
        console.log(err);
        return configs;
    }
}