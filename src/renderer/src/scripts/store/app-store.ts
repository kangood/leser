import { create } from 'zustand'
import { LogMenuActionType, PUSH_NOTIFICATION, SAVE_SETTINGS, SettingsActionTypes } from '../models/app';
import { RSSItem } from '../models/item';
import { useCombinedState } from './combined-store';
import { SourceOpenTarget } from '../models/source';
import { usePageStore } from './page-store';
import { useItemStore } from './item-store';

type AppStore = {
    settingsActionTypes?: SettingsActionTypes;
    logMenuActionType?: LogMenuActionType;
    saveSettings: () => void;
    pushNotification: (item: RSSItem) => void;
    setupAutoFetch: () => void;
}

let fetchTimeout: NodeJS.Timeout;

export const useAppStore = create<AppStore>((set) => ({
    saveSettings: () => {
        set({ settingsActionTypes: { type: SAVE_SETTINGS } });
    },
    pushNotification: (item: RSSItem) => {
        const sourceName = useCombinedState.getState().sources[item.source].name;
        if (!window.utils.isFocused()) {
            const options = { body: sourceName } as any;
            if (item.thumb) options.icon = item.thumb;
            const notification = new Notification(item.title, options);
            notification.onclick = () => {
                const state = useCombinedState.getState();
                if (state.sources[item.source].openTarget === SourceOpenTarget.External) {
                    window.utils.openExternal(item.link);
                } else if (!state.app.settings.display) {
                    window.utils.focus();
                    usePageStore.getState().showItemFromId(item._id);
                }
            }
        }
        set({ logMenuActionType: { type: PUSH_NOTIFICATION, iid: item._id, title: item.title, source: sourceName } });
    },
    setupAutoFetch: () => {
        clearTimeout(fetchTimeout);
        const setupTimeout = (interval?: number) => {
            if (!interval) interval = window.settings.getFetchInterval();
            if (interval) {
                fetchTimeout = setTimeout(() => {
                    let state = useCombinedState.getState();
                    if (!state.app.settings.display) {
                        if (!state.app.fetchingItems) { useItemStore.getState().fetchItems(true) }
                    } else {
                        setupTimeout(1);
                    }
                }, interval * 60000);
            }
        }
        setupTimeout();
    }
}))
