import React, { useState, useEffect } from "react";
import intl from "react-intl-universal";
import DefaultCard from "../cards/default-card";
import { PrimaryButton, FocusZone } from "@fluentui/react";
import { RSSItem } from "../../scripts/models/item";
import { List, AnimationClassNames } from "@fluentui/react";

const CardsFeed = (props) => {
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
        let elemLastRow = props.items.length % elemPerRow;
        let items = [...props.items];
        for (let i = 0; i < elemPerRow - elemLastRow; i += 1) items.push(null);
        return items;
    };

    const onRenderItem = (item: RSSItem, index: number) => {
        // 解决 wechat2rss 的 bug, 网站地址返回不对的时候，封面图的 URL 某些情况下可能会多了个 `https//`
        if (item?.thumb?.includes('https://https//')) {
            item.thumb = item.thumb.replace('https://https//', 'https://');
        }
        return item ? (
            <DefaultCard
                feedId={props.feed._id}
                key={item._id}
                item={item}
                source={props.sourceMap[item.source]}
                filter={props.filter}
                shortcuts={props.shortcuts}
                markRead={props.markRead}
                contextMenu={props.contextMenu}
                showItem={props.showItem}
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
        props.feed.loaded && (
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
                {props.feed.loaded && !props.feed.allLoaded ? (
                    <div className="load-more-wrapper">
                        <PrimaryButton
                            id="load-more"
                            text={intl.get("loadMore")}
                            disabled={props.feed.loading}
                            onClick={() => props.loadMore(props.feed)}
                        />
                    </div>
                ) : null}
                {props.items.length === 0 && (
                    <div className="empty">{intl.get("article.empty")}</div>
                )}
            </FocusZone>
        )
    );
};

export default CardsFeed;
