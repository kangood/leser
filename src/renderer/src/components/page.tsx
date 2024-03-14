import * as React from "react"
import { FeedContainer } from "../containers/feed-container"
import { AnimationClassNames, Icon, FocusTrapZone } from "@fluentui/react"
import ArticleContainer from "../containers/article-container"
import { ViewType } from "../schema-types"
import ArticleSearch from "./utils/article-search"

type PageProps = {
    menuOn: boolean // 是否展开了菜单栏
    contextOn: boolean
    settingsOn: boolean // 是否打开了设置模块
    feeds: string[]
    itemId: number
    itemFromFeed: boolean
    viewType: ViewType // 视图类型
    dismissItem: () => void
    offsetItem: (offset: number) => void
}

class Page extends React.Component<PageProps> {
    offsetItem = (event: React.MouseEvent, offset: number) => {
        event.stopPropagation()
        this.props.offsetItem(offset)
    }
    prevItem = (event: React.MouseEvent) => this.offsetItem(event, -1)
    nextItem = (event: React.MouseEvent) => this.offsetItem(event, 1)

    render = () => {
        return (
            this.props.viewType !== ViewType.List ? (
                // 视图类型!=列表时的内容模块
                <>
                    {this.props.settingsOn ? null : (
                        <div
                            key="card"
                            className={
                                "main" + (this.props.menuOn ? " menu-on" : "")
                            }>
                            <ArticleSearch />
                            {this.props.feeds.map(fid => (
                                <FeedContainer
                                    viewType={this.props.viewType}
                                    feedId={fid}
                                    key={fid + this.props.viewType}
                                />
                            ))}
                        </div>
                    )}
                    {this.props.itemId && (
                        <FocusTrapZone
                            disabled={this.props.contextOn}
                            ignoreExternalFocusing={true}
                            isClickableOutsideFocusTrap={true}
                            className="article-container"
                            onClick={this.props.dismissItem}>
                            <div
                                className="article-wrapper"
                                onClick={e => e.stopPropagation()}>
                                <ArticleContainer itemId={this.props.itemId} />
                            </div>
                            {this.props.itemFromFeed && (
                                <>
                                    <div className="btn-group prev">
                                        <a className="btn" onClick={this.prevItem}>
                                            <Icon iconName="Back" />
                                        </a>
                                    </div>
                                    <div className="btn-group next">
                                        <a className="btn" onClick={this.nextItem}>
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
                    {this.props.settingsOn ? null : (
                        <div
                            key="list"
                            className={
                                "list-main" + (this.props.menuOn ? " menu-on" : "")
                            }>
                            <ArticleSearch />
                            <div className="list-feed-container">
                                {this.props.feeds.map(fid => (
                                    <FeedContainer
                                        viewType={this.props.viewType}
                                        feedId={fid}
                                        key={fid}
                                    />
                                ))}
                            </div>
                            {this.props.itemId ? (
                                <div className="side-article-wrapper">
                                    <ArticleContainer itemId={this.props.itemId} />
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
}

export default Page
