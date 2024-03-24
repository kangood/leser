import { connect } from "react-redux"
import { createSelector } from "reselect"
import { RootState } from "../scripts/reducer"
import Page from "../components/page"
import { AppDispatch } from "../scripts/utils"
import { dismissItem, showOffsetItem, switchFilter } from "../scripts/models/page"
import { ContextMenuType } from "../scripts/models/app"
import { FilterType } from "../scripts/models/feed"

const getPage = (state: RootState) => state.page
const getSettings = (state: RootState) => state.app.settings.display
const getMenu = (state: RootState) => state.app.menu
const getContext = (state: RootState) =>
    state.app.contextMenu.type != ContextMenuType.Hidden

const mapStateToProps = createSelector(
    [getPage, getSettings, getMenu, getContext],
    (page, settingsOn, menuOn, contextOn) => ({
        feeds: [page.feedId],
        settingsOn: settingsOn,
        menuOn: menuOn,
        contextOn: contextOn,
        itemId: page.itemId,
        itemFromFeed: page.itemFromFeed,
        viewType: page.viewType,
    })
)

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dismissItem: () => dispatch(dismissItem()),
    offsetItem: (offset: number) => dispatch(showOffsetItem(offset)),
    switchFilter: (filter: FilterType) => dispatch(switchFilter(filter)),
})

const PageContainer = connect(mapStateToProps, mapDispatchToProps)(Page)
export default PageContainer
