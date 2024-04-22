import { create } from 'zustand'
import { FeedFilter, FilterType } from '../models/feed';
import { createSelector } from 'reselect';
import { AppState, ContextMenuType } from '../models/app';
import { ViewConfigs, ViewType } from '@renderer/schema-types';
import { useCombinedState } from './combined-store';
import { useFeedStore } from './feed-store';

type ContextMenuStore = {
    feedFilter: FeedFilter;
    contextMenu: AppState["contextMenu"];
    checkedFilter: (filterType: FilterType) => boolean;
    toggleFilter: (filterType: FilterType) => void;
    applyFilter: (feedFilter: FeedFilter) => void;
    resetContextMenu: (contextMenu?: AppState["contextMenu"], viewType?: ViewType, feedFilter?: FeedFilter, viewConfigs?: ViewConfigs) => void;
}

export const useContextMenuStore = create<ContextMenuStore>((set, get) => {
    return {
        feedFilter: useCombinedState.getState().page.filter,
        contextMenu: useCombinedState.getState().app.contextMenu,
        checkedFilter: (filterType: FilterType) => {
            // 原 filterType 的状态和传过来的 filterType 作与运算，返回 checked 值
            return Boolean(get().feedFilter.type & filterType);
        },
        toggleFilter: (filterType: FilterType) => {
            // 用于计算 filterType，再调用 applyFilter
            let nextFilter = { ...get().feedFilter };
            nextFilter.type ^= filterType;
            get().applyFilter(nextFilter);
        },
        // 由 toggleFilter 调用
        applyFilter: (feedFilter: FeedFilter) => {
            const oldFilterType = get().feedFilter.type;
            // 新老 filterType 对比，不一样就 set
            if (feedFilter.type !== oldFilterType) {
                window.settings.setFilterType(feedFilter.type);
                set({ feedFilter });
                // 调用 initFeeds
                useFeedStore.getState().initFeeds(true);
            }
        },
        // 根据不同的 contextMenu.type 返回不同的 contextMenu（是 redux 容器中的 mapStateToProps 函数内容）
        resetContextMenu: createSelector(
            () => get().contextMenu,
            () => useCombinedState.getState().page.viewType,
            () => useCombinedState.getState().page.filter,
            () => useCombinedState.getState().page.viewConfigs,
            (contextMenu, viewType, filter, viewConfigs) => {
                switch (contextMenu.type) {
                    case ContextMenuType.Item:
                        return {
                            type: contextMenu.type,
                            event: contextMenu.event,
                            viewConfigs: viewConfigs,
                            item: contextMenu.target[0],
                            feedId: contextMenu.target[1],
                        };
                    case ContextMenuType.Text:
                        return {
                            type: contextMenu.type,
                            position: contextMenu.position,
                            text: contextMenu.target[0],
                            url: contextMenu.target[1],
                        };
                    case ContextMenuType.View:
                        return {
                            type: contextMenu.type,
                            event: contextMenu.event,
                            viewType: viewType,
                            filter: filter.type,
                        };
                    case ContextMenuType.Group:
                        return {
                            type: contextMenu.type,
                            event: contextMenu.event,
                            sids: contextMenu.target,
                        };
                    case ContextMenuType.Image:
                        return {
                            type: contextMenu.type,
                            position: contextMenu.position,
                        };
                    case ContextMenuType.MarkRead:
                        return {
                            type: contextMenu.type,
                            event: contextMenu.event,
                        };
                    default:
                        return { type: ContextMenuType.Hidden };
                }
            }
        )
    }
})
