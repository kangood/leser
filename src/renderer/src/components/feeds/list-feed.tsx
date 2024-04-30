import React, { useState, useEffect } from "react";
import intl from "react-intl-universal";
import {
    PrimaryButton,
    FocusZone,
    FocusZoneDirection,
    List,
} from "@fluentui/react";
import { RSSItem } from "../../scripts/models/item";
import { AnimationClassNames } from "@fluentui/react";
import { ViewType } from "../../schema-types";
import ListCard from "../cards/list-card";
import MagazineCard from "../cards/magazine-card";
import CompactCard from "../cards/compact-card";
import { CardProps } from "../cards/card";
import { FeedProps } from "./feed";
import { usePageCurrentItem, usePageFilter, usePageActions, usePageViewConfigs } from "@renderer/scripts/store/page-store";
import { useFeedById, useFeedActions } from "@renderer/scripts/store/feed-store";
import { useItemActions, useItemsByFeed } from "@renderer/scripts/store/item-store";
import { useSourceMap } from "@renderer/scripts/store/source-store";
import { useAppActions } from "@renderer/scripts/store/app-store";

const ListFeed = (props: FeedProps) => {
    // zustand store
    const sourceMap = useSourceMap();
    const openItemMenu = useAppActions().openItemMenu;
    const filter = usePageFilter();
    const currentItem = usePageCurrentItem();
    const viewConfigs = usePageViewConfigs();
    const showItem = usePageActions().showItem;
    const feed = useFeedById(props.feedId);
    const loadMore = useFeedActions().loadMore;
    const items = useItemsByFeed(feed);
    const { itemShortcuts, markRead } = useItemActions();

    const [loaded, setLoaded] = useState(false);

    const onRenderItem = (item: RSSItem) => {
        // 解决 wechat2rss 的 bug, 网站地址返回不对的时候，封面图的 URL 某些情况下可能会多了个 `https//`
        if (item?.thumb?.includes('https://https//')) {
            item.thumb = item.thumb.replace('https://https//', 'https://');
        }
        const cardProps = {
            feedId: feed._id,
            key: item._id,
            item: item,
            source: sourceMap[item.source],
            filter: filter,
            viewConfigs: viewConfigs,
            shortcuts: itemShortcuts,
            markRead: markRead,
            contextMenu: openItemMenu,
            showItem: showItem,
        } as CardProps;

        if (props.viewType === ViewType.List && currentItem === item._id) {
            cardProps.selected = true;
        }

        switch (props.viewType) {
            case ViewType.Magazine:
                return <MagazineCard {...cardProps} />;
            case ViewType.Compact:
                return <CompactCard {...cardProps} />;
            default:
                return <ListCard {...cardProps} />;
        }
    };

    const getClassName = () => {
        switch (props.viewType) {
            case ViewType.Magazine:
                return "magazine-feed";
            case ViewType.Compact:
                return "compact-feed";
            default:
                return "list-feed";
        }
    };

    const canFocusChild = (el: HTMLElement) => {
        if (el.id === "load-more") {
            const container = document.getElementById("refocus");
            const result =
                container.scrollTop >
                container.scrollHeight - 2 * container.offsetHeight;
            if (!result) container.scrollTop += 100;
            return result;
        } else {
            return true;
        }
    };

    useEffect(() => {
        setLoaded(feed.loaded);
    }, [feed.loaded]);

    return (
        loaded && (
            <FocusZone
                as="div"
                id="refocus"
                direction={FocusZoneDirection.vertical}
                className={getClassName()}
                shouldReceiveFocus={canFocusChild}
                data-is-scrollable
            >
                <List
                    className={AnimationClassNames.slideUpIn10}
                    items={items}
                    onRenderCell={onRenderItem}
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

export default ListFeed;
