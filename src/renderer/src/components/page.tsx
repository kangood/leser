import * as React from "react"
import { FeedContainer } from "../containers/feed-container"
import { Icon, FocusTrapZone } from "@fluentui/react"
import ArticleContainer from "../containers/article-container"
import { ViewType } from "../schema-types"
import ArticleSearch from "./utils/article-search"
import { useToggleMenuStore } from "@renderer/scripts/store/menu-store"
import intl from "react-intl-universal"
import { FilterType } from "../scripts/models/feed"
import { AppState } from "../scripts/models/app"

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
    switchFilter
}) => {

    const toggleMenuDisplay = useToggleMenuStore(state => state.display);
    const toggleMenu = useToggleMenuStore(state => state.toggleMenu);
    
    const offsetItemHandler = (event: React.MouseEvent, offset: number) => {
        event.stopPropagation()
        offsetItem(offset)
    }
    const prevItem = (event: React.MouseEvent) => offsetItemHandler(event, -1)
    const nextItem = (event: React.MouseEvent) => offsetItemHandler(event, 1)

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
                            <div className="feed-top">
                                {/* 这里是一个返回按钮，点击则打开菜单栏 */}
                                <img
                                    src="icons/backward.svg"
                                    onClick={() => toggleMenu(true)}
                                    className="backward"
                                />
                                <span className="title">{state.title}</span>
                            </div>
                            {feeds.map(fid => (
                                <FeedContainer
                                    viewType={viewType}
                                    feedId={fid}
                                    key={fid}
                                />
                            ))}
                            <div className="feed-bottom">
                                <a
                                    // className="starred"
                                    onClick={ () => switchFilter(FilterType.StarredOnly)}
                                    title={intl.get("context.starredOnly")}>
                                    <Icon iconName="FavoriteStarFill" />
                                </a>
                                <a
                                    // className="unread"
                                    onClick={ () => switchFilter(FilterType.UnreadOnly)}
                                    title={intl.get("context.unreadOnly")}>
                                    <Icon iconName="RadioBtnOn" />
                                </a>
                                <a
                                    // className="all"
                                    onClick={() => switchFilter(FilterType.Default)}
                                    title={intl.get("allArticles")}>
                                    <Icon iconName="ClearFilter" />
                                </a>
                            </div>
                        </div>
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
                )}
            </>
        )
    )
}

export default Page
