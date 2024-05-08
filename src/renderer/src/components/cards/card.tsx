import * as React from "react"
import { RSSSource, SourceOpenTarget } from "../../scripts/models/source"
import { RSSItem } from "../../scripts/models/item"
import { getWindowBreakpoint, platformCtrl } from "../../scripts/utils"
import { FeedFilter } from "../../scripts/models/feed"
import { ViewConfigs } from "../../schema-types"
import { useAppActions } from "@renderer/scripts/store/app-store"

export type CardProps = {
    feedId: string
    item: RSSItem
    source: RSSSource
    filter: FeedFilter
    selected?: boolean
    viewConfigs?: ViewConfigs
    shortcuts: (item: RSSItem, e: KeyboardEvent) => void
    markRead: (item: RSSItem) => void
    contextMenu: (feedId: string, item: RSSItem, e) => void
    showItem: (fid: string, item: RSSItem) => void
    onClick?: (props: CardProps, e: React.MouseEvent) => void
    onMouseUp?: (props: CardProps, e: React.MouseEvent) => void
    onKeyDown?: (props: CardProps, e: React.KeyboardEvent) => void
}

export const Card: React.FC<CardProps> = (props) => {
    return (
        <div
            onClick={(e) => props.onClick(props, e)}
            onMouseUp={(e) => props.onMouseUp(props, e)}
            onKeyDown={(e) => props.onKeyDown(props, e)}
        >
        </div>
    );
}

export const bindCardEventsToProps = (props: CardProps) => {
    
    const { toggleMenu } = useAppActions();

    const openInBrowser = (e: React.MouseEvent) => {
        props.markRead(props.item)
        window.utils.openExternal(props.item.link, platformCtrl(e))
    }

    const onClick = (e: React.MouseEvent) => {
        // 如果窗口宽度小于断点，则关闭菜单栏
        if (!getWindowBreakpoint()) {
            toggleMenu(false);
        }
        e.preventDefault()
        e.stopPropagation()
        switch (props.source.openTarget) {
            case SourceOpenTarget.External: {
                openInBrowser(e)
                break
            }
            default: {
                props.markRead(props.item)
                props.showItem(props.feedId, props.item)
                break
            }
        }
    }

    const onMouseUp = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        switch (e.button) {
            case 1:
                openInBrowser(e)
                break
            case 2:
                props.contextMenu(props.feedId, props.item, e)
        }
    }

    const onKeyDown = (e: React.KeyboardEvent) => {
        props.shortcuts(props.item, e.nativeEvent)
    }

    return {
        onClick,
        onMouseUp,
        onKeyDown
    }
}
