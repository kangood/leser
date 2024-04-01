import { connect } from "react-redux"
import { createSelector } from "reselect"
import { RootState } from "../scripts/reducer"
import Page from "../components/page"
import { AppDispatch } from "../scripts/utils"
import { dismissItem, showOffsetItem, switchFilter, toggleSearch } from "../scripts/models/page"
import { ContextMenuType, openMarkAllMenu, openViewMenu, toggleLogMenu, toggleSettings } from "../scripts/models/app"
import { FilterType } from "../scripts/models/feed"

const getState = (state: RootState) => state.app
const getPage = (state: RootState) => state.page
const getSettings = (state: RootState) => state.app.settings.display
const getMenu = (state: RootState) => state.app.menu
const getContext = (state: RootState) => state.app.contextMenu.type != ContextMenuType.Hidden

const mapStateToProps = createSelector(
    [getState, getPage, getSettings, getMenu, getContext],
    (state, page, settingsOn, menuOn, contextOn) => ({
        feeds: [page.feedId],
        settingsOn: settingsOn,
        menuOn: menuOn,
        contextOn: contextOn,
        itemId: page.itemId,
        itemFromFeed: page.itemFromFeed,
        viewType: page.viewType,
        state: state,
        filter: page.filter.type
    })
)

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dismissItem: () => dispatch(dismissItem()),
    offsetItem: (offset: number) => dispatch(showOffsetItem(offset)),
    switchFilter: (filter: FilterType) => dispatch(switchFilter(filter)),
    toggleSearch: () => dispatch(toggleSearch()),
    logs: () => dispatch(toggleLogMenu()),
    views: () => dispatch(openViewMenu()),
    settings: () => dispatch(toggleSettings()),
    markAllRead: () => dispatch(openMarkAllMenu()),
})

const PageContainer = connect(mapStateToProps, mapDispatchToProps)(Page)
export default PageContainer
