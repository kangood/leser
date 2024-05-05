import { SourceGroup } from "@renderer/schema-types";
import { create } from "zustand"
import { devtools } from "zustand/middleware"
import { usePageActions } from "./page-store";
import { useFeedActions } from "./feed-store";
import { RSSSource } from "../models/source";
import { useGroupActions } from "./group-store";

type MenuStore = {
    display: boolean;
    actions: {
        selectSourceGroup: (group: SourceGroup, menuKey: string) => void;
        toggleMenu: (display?: boolean) => void;
        allArticles: (init?: boolean) => void;
        selectSource: (source: RSSSource) => void;
        updateGroupExpansion: (event: React.MouseEvent, key: string, selected: string) => void;
    }
}

const useMenuStore = create<MenuStore>()(devtools(set => ({
    display: false,
    actions: {
        toggleMenu: (display) => {
            set(state => ({
                display:
                    (display !== undefined) ? display : !state.display
            }))
        },
        selectSourceGroup: (group: SourceGroup, menuKey: string) => {
            usePageActions().selectSources(group.sids, menuKey, group.name);
            useFeedActions().initFeeds();
        },
        allArticles: (init = false) => {
            usePageActions().selectAllArticles(init);
            useFeedActions().initFeeds();
        },
        selectSource: (source: RSSSource) => {
            usePageActions().selectSources([source.sid], "s-" + source.sid, source.name);
            useFeedActions().initFeeds();
        },
        updateGroupExpansion: (event: React.MouseEvent, key: string, selected: string) => {
            if ((event.target as HTMLElement).tagName === "I" || key === selected) {
                let [type, index] = key.split("-");
                if (type === "g") {
                    useGroupActions().toggleGroupExpansion(parseInt(index));
                }
            }
        },
    }
}), { name: "menu" }))

export const useMenuDisplay = () => useMenuStore(state => state.display);

export const useMenuActions = () => useMenuStore(state => state.actions);
