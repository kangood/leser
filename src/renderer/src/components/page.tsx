import React, { useEffect } from "react"
import { Icon, FocusTrapZone } from "@fluentui/react"
import { ViewType, WindowStateListenerType } from "../schema-types"
import ArticleSearch from "./utils/article-search"
import { SideTopRight } from "./side-top-right"
import { ContentFilter } from "./utils/content-filter"
import { FeedTop } from "./feeds/feed-top"
import { Feed } from "./feeds/feed"
import { usePageActions, usePageCurrentItem, usePageFeeds, usePageFilter, usePageItemFromFeed, usePageViewType } from "@renderer/scripts/store/page-store"
import { useApp, useAppActions, useAppContextMenuOn, useAppMenuOn, useAppSettingsDisplay } from "@renderer/scripts/store/app-store"
import Article from "./article"

const Page: React.FC = () => {
    // zustand store
    const filter = usePageFilter();
    const feeds = usePageFeeds();
    const currentItem = usePageCurrentItem();
    const pageItemFromFeed = usePageItemFromFeed();
    const { showOffsetItem, toggleSearch, switchFilter, dismissItem } = usePageActions();
    const appState = useApp();
    const appSettingsDisplay = useAppSettingsDisplay();
    const appContextMenuOn = useAppContextMenuOn();
    const { openViewMenu, openMarkAllMenu, toggleLogMenu, toggleSettings, toggleMenu } = useAppActions();
    const viewType = usePageViewType();
    const appMenuOn = useAppMenuOn();

    const [maximized, setMaximized] = React.useState<boolean>(window.utils.isMaximized());
    
    const offsetItemHandler = (event: React.MouseEvent, offset: number) => {
        event.stopPropagation()
        showOffsetItem(offset)
    }
    const prevItem = (event: React.MouseEvent) => offsetItemHandler(event, -1)
    const nextItem = (event: React.MouseEvent) => offsetItemHandler(event, 1)

    const viewsWrapper = () => {
        if (appState.contextMenu.event !== "#view-toggle") {
            openViewMenu();
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

    useEffect(() => {
        window.utils.addWindowStateListener(windowStateListener);
    }, [])

    const windowStateListener = (type: WindowStateListenerType, state: boolean) => {
        switch (type) {
            case WindowStateListenerType.Maximized:
                setMaximized(state)
                break
        }
    }

    return (
        viewType !== ViewType.List ? (
            // 视图类型!=列表时的内容模块
            <>
                {appSettingsDisplay ? null : (
                    <div
                        key="card"
                        className={
                            "main" + (appMenuOn ? " menu-on" : "")
                        }>
                        <ArticleSearch />
                        <div className="wide-side-wrapper dragging">
                            <FeedTop appState={appState} toggleMenu={toggleMenu} toggleSearch={toggleSearch} />
                            <ContentFilter filter={filter} switchFilter={switchFilter} />
                            <SideTopRight
                                markAllRead={openMarkAllMenu}
                                logs={toggleLogMenu}
                                viewsWrapper={viewsWrapper}
                                settings={toggleSettings}
                                minimize={minimize}
                                maximize={maximize}
                                maximized={maximized}
                                close={close}
                                appState={appState}
                            />
                        </div>
                        {feeds.map(fid => (
                            <Feed
                                viewType={viewType}
                                feedId={fid}
                                key={fid + viewType}
                            />
                        ))}
                    </div>
                )}
                {currentItem && (
                    <FocusTrapZone
                        disabled={appContextMenuOn}
                        disableRestoreFocus={true}
                        isClickableOutsideFocusTrap={true}
                        className="article-container"
                        onClick={dismissItem}>
                        <div
                            className="article-wrapper"
                            onClick={e => e.stopPropagation()}>
                            <Article itemId={currentItem} />
                        </div>
                        {pageItemFromFeed && (
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
                {appSettingsDisplay ? null : (
                    <div
                        key="list"
                        className={
                            "list-main" + (appMenuOn ? " menu-on" : "")
                        }>
                        <ArticleSearch />
                        <div className="list-feed-container">
                            <FeedTop appState={appState} toggleMenu={toggleMenu} toggleSearch={toggleSearch} />
                            {feeds.map(fid => (
                                <Feed
                                    viewType={viewType}
                                    feedId={fid}
                                    key={fid}
                                />
                            ))}
                            <ContentFilter filter={filter} switchFilter={switchFilter}/>
                        </div>
                        <div className="side-wrapper">
                            <SideTopRight
                                markAllRead={openMarkAllMenu}
                                logs={toggleLogMenu}
                                viewsWrapper={viewsWrapper}
                                settings={toggleSettings}
                                minimize={minimize}
                                maximize={maximize}
                                maximized={maximized}
                                close={close}
                                appState={appState}
                            />
                            {currentItem ? (
                                <div className="side-article-wrapper">
                                    <Article itemId={currentItem} />
                                </div>
                            ) : (
                                <div className="side-logo-wrapper">
                                    <img
                                        className="light"
                                        src="icons/logo.png"
                                    />
                                    <img
                                        className="dark"
                                        src="icons/logo.png"
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
