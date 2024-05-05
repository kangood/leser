import * as React from "react";
import intl from "react-intl-universal";
import QRCode from "qrcode.react";
import {
    cutText,
    webSearch,
    getSearchEngineName,
    platformCtrl,
} from "../scripts/utils";
import {
    ContextualMenu,
    IContextualMenuItem,
    ContextualMenuItemType,
    DirectionalHint,
} from "@fluentui/react";
import { AppState, ContextMenuType } from "../scripts/models/app";
import { RSSItem } from "../scripts/models/item";
import { ViewType, ImageCallbackTypes, ViewConfigs } from "../schema-types";
import { FeedFilter, FilterType } from "../scripts/models/feed";
import { usePageActions, usePageFilter, usePageViewConfigs, usePageViewType } from "@renderer/scripts/store/page-store";
import { useAppActions, useAppContextMenu } from "@renderer/scripts/store/app-store";
import { useItemActions } from "@renderer/scripts/store/item-store";

export const shareSubmenu = (item: RSSItem): IContextualMenuItem[] => [
    { key: "qr", url: item.link, onRender: renderShareQR },
];

export const renderShareQR = (item: IContextualMenuItem) => (
    <div className="qr-container">
        <QRCode value={item.url} size={150} renderAs="svg" />
    </div>
);

type ContextMenuProps = {
    type: ContextMenuType;
    event?: MouseEvent | string;
    position?: [number, number];
    item?: RSSItem;
    feedId?: string;
    text?: string;
    url?: string;
    viewType?: ViewType;
    viewConfigs?: ViewConfigs;
    filter?: FilterType;
    sids?: number[];
}

const getAppContextMenuSelector: 
    (context: AppState["contextMenu"], viewType: ViewType, filter: FeedFilter, viewConfigs: ViewConfigs) => ContextMenuProps = 
    (context, viewType, filter, viewConfigs) => {

    switch (context.type) {
        case ContextMenuType.Item:
            return {
                type: context.type,
                event: context.event,
                viewConfigs: viewConfigs,
                item: context.target[0] as RSSItem,
                feedId: context.target[1] as string,
            }
        case ContextMenuType.Text:
            return {
                type: context.type,
                position: context.position,
                text: context.target[0] as string,
                url: context.target[1] as string,
            }
        case ContextMenuType.View:
            return {
                type: context.type,
                event: context.event,
                viewType: viewType,
                filter: filter.type,
            }
        case ContextMenuType.Group:
            return {
                type: context.type,
                event: context.event,
                sids: context.target as number[],
            }
        case ContextMenuType.Image:
            return {
                type: context.type,
                position: context.position,
            }
        case ContextMenuType.MarkRead:
            return {
                type: context.type,
                event: context.event,
            }
        default:
            return {
                type: ContextMenuType.Hidden
            }
    }
}

const ContextMenu: React.FC = () => {
    // zustand store
    const { toggleSettings, closeContextMenu } = useAppActions();
    const { toggleFilter, checkedFilter, showItem, setViewConfigs, switchView } = usePageActions();
    const { markRead, markUnread, markAllRead, toggleStarred, contextMenuToggleHidden, fetchItems } = useItemActions();
    const appContextMenuSelector = getAppContextMenuSelector(
        useAppContextMenu(),
        usePageViewType(),
        usePageFilter(),
        usePageViewConfigs()
    )

    const getSearchItem = (text: string): IContextualMenuItem => {
        const engine = window.settings.getSearchEngine();
        return {
            key: "searchText",
            text: intl.get("context.search", {
                text: cutText(text, 15),
                engine: getSearchEngineName(engine),
            }),
            iconProps: { iconName: "Search" },
            onClick: () => webSearch(text, engine),
        };
    }

    const getItems = (): IContextualMenuItem[] => {
        switch (appContextMenuSelector.type) {
            case ContextMenuType.Item:
                return [
                    {
                        key: "showItem",
                        text: intl.get("context.read"),
                        iconProps: { iconName: "TextDocument" },
                        onClick: () => {
                            markRead(appContextMenuSelector.item);
                            showItem(appContextMenuSelector.feedId, appContextMenuSelector.item);
                        },
                    },
                    {
                        key: "openInBrowser",
                        text: intl.get("openExternal"),
                        iconProps: { iconName: "NavigateExternalInline" },
                        onClick: (e) => {
                            markRead(appContextMenuSelector.item);
                            window.utils.openExternal(appContextMenuSelector.item.link, platformCtrl(e));
                        },
                    },
                    {
                        key: "markAsRead",
                        text: appContextMenuSelector.item.hasRead
                            ? intl.get("article.markUnread")
                            : intl.get("article.markRead"),
                        iconProps: appContextMenuSelector.item.hasRead
                            ? {
                                    iconName: "RadioBtnOn",
                                    style: { fontSize: 14, textAlign: "center" },
                                }
                            : { iconName: "StatusCircleRing" },
                        onClick: () => {
                            if (appContextMenuSelector.item.hasRead) {
                                markUnread(appContextMenuSelector.item);
                            } else {
                                markRead(appContextMenuSelector.item);
                            }
                        },
                        split: true,
                        subMenuProps: {
                            items: [
                                {
                                    key: "markBelow",
                                    text: intl.get("article.markBelow"),
                                    iconProps: {
                                        iconName: "Down",
                                        style: { fontSize: 14 },
                                    },
                                    onClick: () =>
                                        markAllRead(null, appContextMenuSelector.item.date),
                                },
                                {
                                    key: "markAbove",
                                    text: intl.get("article.markAbove"),
                                    iconProps: {
                                        iconName: "Up",
                                        style: { fontSize: 14 },
                                    },
                                    onClick: () =>
                                        markAllRead(null, appContextMenuSelector.item.date, false),
                                },
                            ],
                        },
                    },
                    {
                        key: "toggleStarred",
                        text: appContextMenuSelector.item.starred
                            ? intl.get("article.unstar")
                            : intl.get("article.star"),
                        iconProps: {
                            iconName: appContextMenuSelector.item.starred
                                ? "FavoriteStar"
                                : "FavoriteStarFill",
                        },
                        onClick: () => {
                            toggleStarred(appContextMenuSelector.item);
                        },
                    },
                    {
                        key: "toggleHidden",
                        text: appContextMenuSelector.item.hidden
                            ? intl.get("article.unhide")
                            : intl.get("article.hide"),
                        iconProps: {
                            iconName: appContextMenuSelector.item.hidden ? "View" : "Hide3",
                        },
                        onClick: () => {
                            contextMenuToggleHidden(appContextMenuSelector.item);
                        },
                    },
                    {
                        key: "divider_1",
                        itemType: ContextualMenuItemType.Divider,
                    },
                    {
                        key: "share",
                        text: intl.get("context.share"),
                        iconProps: { iconName: "Share" },
                        subMenuProps: {
                            items: shareSubmenu(appContextMenuSelector.item),
                        },
                    },
                    {
                        key: "copyTitle",
                        text: intl.get("context.copyTitle"),
                        onClick: () => {
                            window.utils.writeClipboard(appContextMenuSelector.item.title);
                        },
                    },
                    {
                        key: "copyURL",
                        text: intl.get("context.copyURL"),
                        onClick: () => {
                            window.utils.writeClipboard(appContextMenuSelector.item.link);
                        },
                    },
                    ...(appContextMenuSelector.viewConfigs !== undefined
                        ? [
                                {
                                    key: "divider_2",
                                    itemType: ContextualMenuItemType.Divider,
                                },
                                {
                                    key: "view",
                                    text: intl.get("context.view"),
                                    subMenuProps: {
                                        items: [
                                            {
                                                key: "showCover",
                                                text: intl.get("context.showCover"),
                                                canCheck: true,
                                                checked: Boolean(
                                                    appContextMenuSelector.viewConfigs & ViewConfigs.ShowCover
                                                ),
                                                onClick: () =>
                                                    setViewConfigs(
                                                        appContextMenuSelector.viewConfigs ^ ViewConfigs.ShowCover
                                                    ),
                                            },
                                            {
                                                key: "showSnippet",
                                                text: intl.get("context.showSnippet"),
                                                canCheck: true,
                                                checked: Boolean(
                                                    appContextMenuSelector.viewConfigs & ViewConfigs.ShowSnippet
                                                ),
                                                onClick: () =>
                                                    setViewConfigs(
                                                        appContextMenuSelector.viewConfigs ^ ViewConfigs.ShowSnippet
                                                    ),
                                            },
                                            {
                                                key: "fadeRead",
                                                text: intl.get("context.fadeRead"),
                                                canCheck: true,
                                                checked: Boolean(
                                                    appContextMenuSelector.viewConfigs & ViewConfigs.FadeRead
                                                ),
                                                onClick: () =>
                                                    setViewConfigs(
                                                        appContextMenuSelector.viewConfigs ^ ViewConfigs.FadeRead
                                                    ),
                                            },
                                        ],
                                    },
                                },
                            ]
                        : []),
                ];
            case ContextMenuType.Text: {
                const items: IContextualMenuItem[] = appContextMenuSelector.text
                    ? [
                            {
                                key: "copyText",
                                text: intl.get("context.copy"),
                                iconProps: { iconName: "Copy" },
                                onClick: () => {
                                    window.utils.writeClipboard(appContextMenuSelector.text);
                                },
                            },
                            getSearchItem(appContextMenuSelector.text),
                        ]
                    : [];
                if (appContextMenuSelector.url) {
                    items.push({
                        key: "urlSection",
                        itemType: ContextualMenuItemType.Section,
                        sectionProps: {
                            topDivider: items.length > 0,
                            items: [
                                {
                                    key: "openInBrowser",
                                    text: intl.get("openExternal"),
                                    iconProps: {
                                        iconName: "NavigateExternalInline",
                                    },
                                    onClick: (e) => {
                                        window.utils.openExternal(
                                            appContextMenuSelector.url,
                                            platformCtrl(e)
                                        );
                                    },
                                },
                                {
                                    key: "copyURL",
                                    text: intl.get("context.copyURL"),
                                    iconProps: { iconName: "Link" },
                                    onClick: () => {
                                        window.utils.writeClipboard(appContextMenuSelector.url);
                                    },
                                },
                            ],
                        },
                    });
                }
                return items;
            }
            case ContextMenuType.Image:
                return [
                    {
                        key: "openInBrowser",
                        text: intl.get("openExternal"),
                        iconProps: { iconName: "NavigateExternalInline" },
                        onClick: (e) => {
                            if (platformCtrl(e)) {
                                window.utils.imageCallback(
                                    ImageCallbackTypes.OpenExternalBg
                                );
                            } else {
                                window.utils.imageCallback(
                                    ImageCallbackTypes.OpenExternal
                                );
                            }
                        },
                    },
                    {
                        key: "saveImageAs",
                        text: intl.get("context.saveImageAs"),
                        iconProps: { iconName: "SaveTemplate" },
                        onClick: () => {
                            window.utils.imageCallback(ImageCallbackTypes.SaveAs);
                        },
                    },
                    {
                        key: "copyImage",
                        text: intl.get("context.copyImage"),
                        iconProps: { iconName: "FileImage" },
                        onClick: () => {
                            window.utils.imageCallback(ImageCallbackTypes.Copy);
                        },
                    },
                    {
                        key: "copyImageURL",
                        text: intl.get("context.copyImageURL"),
                        iconProps: { iconName: "Link" },
                        onClick: () => {
                            window.utils.imageCallback(ImageCallbackTypes.CopyLink);
                        },
                    },
                ];
            case ContextMenuType.View:
                return [
                    {
                        key: "section_1",
                        itemType: ContextualMenuItemType.Section,
                        sectionProps: {
                            title: intl.get("context.view"),
                            bottomDivider: true,
                            items: [
                                {
                                    key: "cardView",
                                    text: intl.get("context.cardView"),
                                    iconProps: { iconName: "GridViewMedium" },
                                    canCheck: true,
                                    checked: appContextMenuSelector.viewType === ViewType.Cards,
                                    onClick: () => switchView(ViewType.Cards),
                                },
                                {
                                    key: "listView",
                                    text: intl.get("context.listView"),
                                    iconProps: { iconName: "BacklogList" },
                                    canCheck: true,
                                    checked: appContextMenuSelector.viewType === ViewType.List,
                                    onClick: () => switchView(ViewType.List),
                                },
                                {
                                    key: "magazineView",
                                    text: intl.get("context.magazineView"),
                                    iconProps: { iconName: "Articles" },
                                    canCheck: true,
                                    checked: appContextMenuSelector.viewType === ViewType.Magazine,
                                    onClick: () => switchView(ViewType.Magazine),
                                },
                                {
                                    key: "compactView",
                                    text: intl.get("context.compactView"),
                                    iconProps: { iconName: "BulletedList" },
                                    canCheck: true,
                                    checked: appContextMenuSelector.viewType === ViewType.Compact,
                                    onClick: () => switchView(ViewType.Compact),
                                },
                            ],
                        },
                    },
                    {
                        key: "section_3",
                        itemType: ContextualMenuItemType.Section,
                        sectionProps: {
                            title: intl.get("search"),
                            bottomDivider: true,
                            items: [
                                {
                                    key: "caseSensitive",
                                    text: intl.get("context.caseSensitive"),
                                    iconProps: {
                                        style: {
                                            fontSize: 12,
                                            fontStyle: "normal",
                                        },
                                        children: "Aa",
                                    },
                                    canCheck: true,
                                    checked: !checkedFilter(FilterType.CaseInsensitive),
                                    onClick: () =>
                                        toggleFilter(FilterType.CaseInsensitive),
                                },
                                {
                                    key: "fullSearch",
                                    text: intl.get("context.fullSearch"),
                                    iconProps: { iconName: "Breadcrumb" },
                                    canCheck: true,
                                    checked: checkedFilter(FilterType.FullSearch),
                                    onClick: () => toggleFilter(FilterType.FullSearch),
                                },
                            ],
                        },
                    },
                    {
                        key: "showHidden",
                        text: intl.get("context.showHidden"),
                        canCheck: true,
                        checked: checkedFilter(FilterType.ShowHidden),
                        onClick: () => toggleFilter(FilterType.ShowHidden),
                    },
                ];
            case ContextMenuType.Group:
                return [
                    {
                        key: "markAllRead",
                        text: intl.get("nav.markAllRead"),
                        iconProps: { iconName: "CheckMark" },
                        onClick: () => markAllRead(appContextMenuSelector.sids),
                    },
                    {
                        key: "refresh",
                        text: intl.get("nav.refresh"),
                        iconProps: { iconName: "Sync" },
                        onClick: () => fetchItems(false, appContextMenuSelector.sids),
                    },
                    {
                        key: "manage",
                        text: intl.get("context.manageSources"),
                        iconProps: { iconName: "Settings" },
                        onClick: () => toggleSettings(true, appContextMenuSelector.sids),
                    },
                ];
            case ContextMenuType.MarkRead:
                return [
                    {
                        key: "section_1",
                        itemType: ContextualMenuItemType.Section,
                        sectionProps: {
                            title: intl.get("nav.markAllRead"),
                            items: [
                                {
                                    key: "all",
                                    text: intl.get("allArticles"),
                                    iconProps: { iconName: "ReceiptCheck" },
                                    onClick: () => markAllRead(),
                                },
                                {
                                    key: "1d",
                                    text: intl.get("app.daysAgo", { days: 1 }),
                                    onClick: () => {
                                        let date = new Date();
                                        date.setTime(date.getTime() - 86400000);
                                        markAllRead(null, date);
                                    },
                                },
                                {
                                    key: "3d",
                                    text: intl.get("app.daysAgo", { days: 3 }),
                                    onClick: () => {
                                        let date = new Date();
                                        date.setTime(date.getTime() - 3 * 86400000);
                                        markAllRead(null, date);
                                    },
                                },
                                {
                                    key: "7d",
                                    text: intl.get("app.daysAgo", { days: 7 }),
                                    onClick: () => {
                                        let date = new Date();
                                        date.setTime(date.getTime() - 7 * 86400000);
                                        markAllRead(null, date);
                                    },
                                },
                            ],
                        },
                    },
                ];
            default:
                return [];
        }
    };

    return appContextMenuSelector.type == ContextMenuType.Hidden ? null : (
        <ContextualMenu
            directionalHint={DirectionalHint.bottomLeftEdge}
            items={getItems()}
            target={
                appContextMenuSelector.event ||
                (appContextMenuSelector.position && {
                    left: appContextMenuSelector.position[0],
                    top: appContextMenuSelector.position[1],
                })
            }
            onDismiss={closeContextMenu}
        />
    );
};

export default ContextMenu;