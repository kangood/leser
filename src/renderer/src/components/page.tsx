import { Icon, FocusTrapZone } from "@fluentui/react";
import React from "react";

import ArticleContainer from "../containers/article-container";
import { FeedContainer } from "../containers/feed-container";
import { ViewType } from "../schema-types";

import ArticleSearch from "./utils/article-search";

type PageProps = {
    menuOn: boolean; // 是否展开了菜单栏
    contextOn: boolean;
    settingsOn: boolean; // 是否打开了设置模块
    feeds: string[];
    itemId: number;
    itemFromFeed: boolean;
    viewType: ViewType; // 视图类型
    dismissItem: () => void;
    offsetItem: (offset: number) => void;
};

const Page: React.FC<PageProps> = ({
    menuOn,
    contextOn,
    settingsOn,
    feeds,
    itemId,
    itemFromFeed,
    viewType,
    dismissItem,
    offsetItem,
}) => {
    const offsetItemHandler = (event: React.MouseEvent, offset: number) => {
        event.stopPropagation();
        offsetItem(offset);
    };

    const prevItemHandler = (event: React.MouseEvent) => offsetItemHandler(event, -1);

    const nextItemHandler = (event: React.MouseEvent) => offsetItemHandler(event, 1);

    return viewType !== ViewType.List ? (
        // 视图类型!=列表时的内容模块
        <>
            {settingsOn ? null : (
                <div key="card" className={`main${menuOn ? " menu-on" : ""}`}>
                    <ArticleSearch />
                    {feeds.map(fid => (
                        <FeedContainer viewType={viewType} feedId={fid} key={fid + viewType} />
                    ))}
                </div>
            )}
            {itemId && (
                <FocusTrapZone
                    disabled={contextOn}
                    ignoreExternalFocusing
                    isClickableOutsideFocusTrap
                    className="article-container"
                    onClick={dismissItem}>
                    <div className="article-wrapper" onClick={e => e.stopPropagation()}>
                        <ArticleContainer itemId={itemId} />
                    </div>
                    {itemFromFeed && (
                        <>
                            <div className="btn-group prev">
                                <a className="btn" onClick={prevItemHandler}>
                                    <Icon iconName="Back" />
                                </a>
                            </div>
                            <div className="btn-group next">
                                <a className="btn" onClick={nextItemHandler}>
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
                <div key="list" className={`list-main${menuOn ? " menu-on" : ""}`}>
                    <ArticleSearch />
                    <div className="list-feed-container">
                        {feeds.map(fid => (
                            <FeedContainer viewType={viewType} feedId={fid} key={fid} />
                        ))}
                    </div>
                    {itemId ? (
                        <div className="side-article-wrapper">
                            <ArticleContainer itemId={itemId} />
                        </div>
                    ) : (
                        <div className="side-logo-wrapper">
                            <img className="light" src="icons/logo-outline.svg" alt="" />
                            <img className="dark" src="icons/logo-outline-dark.svg" alt="" />
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

export default Page;
