import * as React from "react"
import { FeedContainer } from "../containers/feed-container"
import { Icon, FocusTrapZone } from "@fluentui/react"
import ArticleContainer from "../containers/article-container"
import { ViewType } from "../schema-types"
import ArticleSearch from "./utils/article-search"
import { useToggleMenuStore } from "@renderer/scripts/store/menu-store"
import { FilterType } from "../scripts/models/feed"
import { AppState } from "../scripts/models/app"
import { SideTopRight } from "./side-top-right"
import { ContentFilter } from "./utils/content-filter"
import { FeedTop } from "./feeds/feed-top"

type PageProps = {
    contextOn: boolean
    settingsOn: boolean // 是否打开了设置模块
    feeds: string[]
    itemId: number
    itemFromFeed: boolean
    viewType: ViewType // 视图类型
    state: AppState
    dismissItem: () => void
    offsetItem: (offset: number) => void
    switchFilter: (filter: FilterType) => void
    toggleSearch: () => void
    markAllRead: () => void
    logs: () => void
    views: () => void
    settings: () => void
}

const Page: React.FC<PageProps> = ({
    contextOn,
    settingsOn,
    feeds,
    itemId,
    itemFromFeed,
    viewType,
    state,
    dismissItem,
    offsetItem,
    switchFilter,
    toggleSearch,
    markAllRead,
    logs,
    views,
    settings,
}) => {

    const toggleMenuDisplay = useToggleMenuStore(state => state.display);
    const toggleMenu = useToggleMenuStore(state => state.toggleMenu);
    const [maximized, setMaximized] = React.useState<boolean>(window.utils.isMaximized());
    
    const offsetItemHandler = (event: React.MouseEvent, offset: number) => {
        event.stopPropagation()
        offsetItem(offset)
    }
    const prevItem = (event: React.MouseEvent) => offsetItemHandler(event, -1)
    const nextItem = (event: React.MouseEvent) => offsetItemHandler(event, 1)

    const viewsWrapper = () => {
        if (state.contextMenu.event !== "#view-toggle") {
            views()
        }
    }

    const minimize = () => {
        window.utils.minimizeWindow()
    }

    const maximize = () => {
        window.utils.maximizeWindow()
        setMaximized(!maximized)
    }

    const close = () => {
        window.utils.closeWindow()
    }

    return (
        viewType !== ViewType.List ? (
            // 视图类型!=列表时的内容模块
            <>
                {settingsOn ? null : (
                    <div
                        key="card"
                        className={
                            "main" + (toggleMenuDisplay ? " menu-on" : "")
                        }>
                        <ArticleSearch />
                        <div className="wide-side-wrapper">
                            <FeedTop state={state} toggleMenu={toggleMenu} toggleSearch={toggleSearch} />
                            <ContentFilter switchFilter={switchFilter} />
                            <SideTopRight
                                markAllRead={markAllRead}
                                logs={logs}
                                viewsWrapper={viewsWrapper}
                                settings={settings}
                                minimize={minimize}
                                maximize={maximize}
                                maximized={maximized}
                                close={close}
                                state={state}
                            />
                        </div>
                        {feeds.map(fid => (
                            <FeedContainer
                                viewType={viewType}
                                feedId={fid}
                                key={fid + viewType}
                            />
                        ))}
                    </div>
                )}
                {itemId && (
                    <FocusTrapZone
                        disabled={contextOn}
                        ignoreExternalFocusing={true}
                        isClickableOutsideFocusTrap={true}
                        className="article-container"
                        onClick={dismissItem}>
                        <div
                            className="article-wrapper"
                            onClick={e => e.stopPropagation()}>
                            <ArticleContainer itemId={itemId} />
                        </div>
                        {itemFromFeed && (
                            <>
                                <div className="btn-group prev">
                                    <a className="btn" onClick={prevItem}>
                                        <Icon iconName="Back" />
                                    </a>
                                </div>
                                <div className="btn-group next">
                                    <a className="btn" onClick={nextItem}>
                                        <Icon iconName="Forward" />
                                    </a>
                                </div>
                            </>
                        )}
                    </FocusTrapZone>
                )}
            </>
        ) : (
            // 视图类型=列表时的内容模块
            <>
                {/* 打开设置模块时隐藏，没打开则正常显示内容 */}
                {settingsOn ? null : (
                    <div
                        key="list"
                        className={
                            "list-main" + (toggleMenuDisplay ? " menu-on" : "")
                        }>
                        <ArticleSearch />
                        <div className="list-feed-container">
                            <FeedTop state={state} toggleMenu={toggleMenu} toggleSearch={toggleSearch} />
                            {feeds.map(fid => (
                                <FeedContainer
                                    viewType={viewType}
                                    feedId={fid}
                                    key={fid}
                                />
                            ))}
                            <ContentFilter switchFilter={switchFilter}/>
                        </div>
                        <div className="side-wrapper">
                            <SideTopRight
                                markAllRead={markAllRead}
                                logs={logs}
                                viewsWrapper={viewsWrapper}
                                settings={settings}
                                minimize={minimize}
                                maximize={maximize}
                                maximized={maximized}
                                close={close}
                                state={state}
                            />
                            {itemId ? (
                                <div className="side-article-wrapper">
                                    <ArticleContainer itemId={itemId} />
                                </div>
                            ) : (
                                <div className="side-logo-wrapper">
                                    <img
                                        className="light"
                                        src="icons/logo-outline.svg"
                                    />
                                    <img
                                        className="dark"
                                        src="icons/logo-outline-dark.svg"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </>
        )
    )
}

export default Page
