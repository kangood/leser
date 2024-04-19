import { connect } from "react-redux"
import { createSelector } from "reselect"
import { RootState } from "../scripts/reducer"
import { Menu } from "../components/menu"
import { openGroupMenu } from "../scripts/models/app"
import { toggleGroupExpansion } from "../scripts/models/group"
import { SourceGroup } from "../schema-types"
import {
    selectAllArticles,
    selectSources,
} from "../scripts/models/page"
import { ViewType } from "../schema-types"
import { initFeeds } from "../scripts/models/feed"
import { RSSSource } from "../scripts/models/source"
import { fetchItems } from "../scripts/models/item"

const getApp = (state: RootState) => state.app
const getSources = (state: RootState) => state.sources
const getGroups = (state: RootState) => state.groups
const getItemOn = (state: RootState) => state.page.itemId !== null && state.page.viewType !== ViewType.List
const getFilterType = (state: RootState) => state.page.filter.type

const mapStateToProps = createSelector(
    [getApp, getSources, getGroups, getItemOn, getFilterType],
    (app, sources, groups, itemOn, filterType) => ({
        state: app,
        status: app.sourceInit && !app.settings.display,
        display: app.menu,
        selected: app.menuKey,
        sources: sources,
        groups: groups.map((g, i) => ({ ...g, index: i })),
        itemOn: itemOn,
        filterType: filterType
    })
)

const mapDispatchToProps = dispatch => ({
    allArticles: (init = false) => {
        dispatch(selectAllArticles(init)), dispatch(initFeeds())
    },
    selectSourceGroup: (group: SourceGroup, menuKey: string) => {
        dispatch(selectSources(group.sids, menuKey, group.name))
        dispatch(initFeeds())
    },
    selectSource: (source: RSSSource) => {
        dispatch(selectSources([source.sid], "s-" + source.sid, source.name))
        dispatch(initFeeds())
    },
    groupContextMenu: (sids: number[], event: React.MouseEvent) => {
        dispatch(openGroupMenu(sids, event))
    },
    updateGroupExpansion: (
        event: React.MouseEvent<HTMLElement>,
        key: string,
        selected: string
    ) => {
        if ((event.target as HTMLElement).tagName === "I" || key === selected) {
            let [type, index] = key.split("-")
            if (type === "g") dispatch(toggleGroupExpansion(parseInt(index)))
        }
    },
    fetch: () => dispatch(fetchItems()),
})

const MenuContainer = connect(mapStateToProps, mapDispatchToProps)(Menu)
export default MenuContainer
