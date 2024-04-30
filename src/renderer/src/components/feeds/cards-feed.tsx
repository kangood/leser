import React, { useState, useEffect } from "react";
import intl from "react-intl-universal";
import { PrimaryButton, FocusZone } from "@fluentui/react";
import { useShallow } from "zustand/react/shallow";
import { List, AnimationClassNames } from "@fluentui/react";

import DefaultCard from "../cards/default-card";
import { RSSItem } from "../../scripts/models/item";
import { useItemActions, useItemStore, useItems } from "@renderer/scripts/store/item-store";
import { useFeed, useFeedStore, useLoadMore } from "@renderer/scripts/store/feed-store";
import { useFilter, usePageStore, useShowItem } from "@renderer/scripts/store/page-store";
import { useSourceMap } from "@renderer/scripts/store/source-store";
import { useOpenItemMenu } from "@renderer/scripts/store/app-store";
import { FeedProps } from "./feed";

const CardsFeed = (props: FeedProps) => {
    // zustand store
    const sourceMap = useSourceMap();
    const openItemMenu = useOpenItemMenu();
    const filter = useFilter();
    const showItem = useShowItem();
    const feed = useFeed(props.feedId);
    const loadMore = useLoadMore();
    const items = useItems(feed);
    const { itemShortcuts, markRead } = useItemActions();

    const [width, setWidth] = useState(window.innerWidth);
    const [height, setHeight] = useState(window.innerHeight);

    const updateWindowSize = (entries: ResizeObserverEntry[]) => {
        if (entries) {
            setWidth(entries[0].contentRect.width - 40);
            setHeight(window.innerHeight);
        }
    };

    useEffect(() => {
        setWidth(document.querySelector(".main")!.clientWidth - 40);

        const observer = new ResizeObserver(updateWindowSize);
        observer.observe(document.querySelector(".main"));
        return () => {
            observer.disconnect();
        };
    }, []);

    const getItemCountForPage = () => {
        let elemPerRow = Math.floor(width / 280);
        let rows = Math.ceil(height / 304);
        return elemPerRow * rows;
    };

    const getPageHeight = () => {
        return height + (304 - (height % 304));
    };

    const flexFixItems = () => {
        let elemPerRow = Math.floor(width / 280);
        let elemLastRow = items.length % elemPerRow;
        let itemsNew = [...items];
        for (let i = 0; i < elemPerRow - elemLastRow; i++) {
            itemsNew.push(null);
        }
        return itemsNew;
    };

    const onRenderItem = (item: RSSItem, index: number) => {
        // 解决 wechat2rss 的 bug, 网站地址返回不对的时候，封面图的 URL 某些情况下可能会多了个 `https//`
        if (item?.thumb?.includes('https://https//')) {
            item.thumb = item.thumb.replace('https://https//', 'https://');
        }
        return item ? (
            <DefaultCard
                feedId={feed._id}
                key={item._id}
                item={item}
                source={sourceMap[item.source]}
                filter={filter}
                shortcuts={itemShortcuts}
                markRead={markRead}
                contextMenu={openItemMenu}
                showItem={showItem}
            />
        ) : (
            <div className="flex-fix" key={"f-" + index}></div>
        );
    };

    const canFocusChild = (el: HTMLElement) => {
        if (el.id === "load-more") {
            const container = document.getElementById("refocus")!;
            const result =
                container.scrollTop >
                container.scrollHeight - 2 * container.offsetHeight;
            if (!result) container.scrollTop += 100;
            return result;
        } else {
            return true;
        }
    };

    return (
        feed.loaded && (
            <FocusZone
                as="div"
                id="refocus"
                className="cards-feed-container"
                shouldReceiveFocus={canFocusChild}
                data-is-scrollable
            >
                <List
                    className={AnimationClassNames.slideUpIn10}
                    items={flexFixItems()}
                    onRenderCell={onRenderItem}
                    getItemCountForPage={getItemCountForPage}
                    getPageHeight={getPageHeight}
                    ignoreScrollingState
                    usePageCache
                />
                {feed.loaded && !feed.allLoaded ? (
                    <div className="load-more-wrapper">
                        <PrimaryButton
                            id="load-more"
                            text={intl.get("loadMore")}
                            disabled={feed.loading}
                            onClick={() => loadMore(feed)}
                        />
                    </div>
                ) : null}
                {items.length === 0 && (
                    <div className="empty">{intl.get("article.empty")}</div>
                )}
            </FocusZone>
        )
    );
};

export default CardsFeed;
