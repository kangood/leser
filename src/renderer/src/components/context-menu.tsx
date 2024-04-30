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
import { ContextMenuType } from "../scripts/models/app";
import { RSSItem } from "../scripts/models/item";
import { ContextReduxProps } from "../containers/context-menu-container";
import { ViewType, ImageCallbackTypes, ViewConfigs } from "../schema-types";
import { FilterType } from "../scripts/models/feed";
import { usePageActions, usePageStore } from "@renderer/scripts/store/page-store";

export type ContextMenuProps = ContextReduxProps & {
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
    showItem: (feedId: string, item: RSSItem) => void;
    markRead: (item: RSSItem) => void;
    markUnread: (item: RSSItem) => void;
    toggleStarred: (item: RSSItem) => void;
    toggleHidden: (item: RSSItem) => void;
    switchView: (viewType: ViewType) => void;
    setViewConfigs: (configs: ViewConfigs) => void;
    markAllRead: (sids?: number[], date?: Date, before?: boolean) => void;
    fetchItems: (sids: number[]) => void;
    settings: (sids: number[]) => void;
    close: () => void;
};

export const shareSubmenu = (item: RSSItem): IContextualMenuItem[] => [
    { key: "qr", url: item.link, onRender: renderShareQR },
];

export const renderShareQR = (item: IContextualMenuItem) => (
    <div className="qr-container">
        <QRCode value={item.url} size={150} renderAs="svg" />
    </div>
);

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

export const ContextMenu: React.FC<ContextMenuProps> = (props) => {
    const { toggleFilter, checkedFilter } = usePageActions();

    const getItems = (): IContextualMenuItem[] => {
        switch (props.type) {
            case ContextMenuType.Item:
                return [
                    {
                        key: "showItem",
                        text: intl.get("context.read"),
                        iconProps: { iconName: "TextDocument" },
                        onClick: () => {
                            props.markRead(props.item);
                            props.showItem(props.feedId, props.item);
                        },
                    },
                    {
                        key: "openInBrowser",
                        text: intl.get("openExternal"),
                        iconProps: { iconName: "NavigateExternalInline" },
                        onClick: (e) => {
                            props.markRead(props.item);
                            window.utils.openExternal(props.item.link, platformCtrl(e));
                        },
                    },
                    {
                        key: "markAsRead",
                        text: props.item.hasRead
                            ? intl.get("article.markUnread")
                            : intl.get("article.markRead"),
                        iconProps: props.item.hasRead
                            ? {
                                    iconName: "RadioBtnOn",
                                    style: { fontSize: 14, textAlign: "center" },
                                }
                            : { iconName: "StatusCircleRing" },
                        onClick: () => {
                            if (props.item.hasRead) { props.markUnread(props.item) }
                            else { props.markRead(props.item)};
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
                                        props.markAllRead(null, props.item.date),
                                },
                                {
                                    key: "markAbove",
                                    text: intl.get("article.markAbove"),
                                    iconProps: {
                                        iconName: "Up",
                                        style: { fontSize: 14 },
                                    },
                                    onClick: () =>
                                        props.markAllRead(null, props.item.date, false),
                                },
                            ],
                        },
                    },
                    {
                        key: "toggleStarred",
                        text: props.item.starred
                            ? intl.get("article.unstar")
                            : intl.get("article.star"),
                        iconProps: {
                            iconName: props.item.starred
                                ? "FavoriteStar"
                                : "FavoriteStarFill",
                        },
                        onClick: () => {
                            props.toggleStarred(props.item);
                        },
                    },
                    {
                        key: "toggleHidden",
                        text: props.item.hidden
                            ? intl.get("article.unhide")
                            : intl.get("article.hide"),
                        iconProps: {
                            iconName: props.item.hidden ? "View" : "Hide3",
                        },
                        onClick: () => {
                            props.toggleHidden(props.item);
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
                            items: shareSubmenu(props.item),
                        },
                    },
                    {
                        key: "copyTitle",
                        text: intl.get("context.copyTitle"),
                        onClick: () => {
                            window.utils.writeClipboard(props.item.title);
                        },
                    },
                    {
                        key: "copyURL",
                        text: intl.get("context.copyURL"),
                        onClick: () => {
                            window.utils.writeClipboard(props.item.link);
                        },
                    },
                    ...(props.viewConfigs !== undefined
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
                                                    props.viewConfigs & ViewConfigs.ShowCover
                                                ),
                                                onClick: () =>
                                                    props.setViewConfigs(
                                                        props.viewConfigs ^ ViewConfigs.ShowCover
                                                    ),
                                            },
                                            {
                                                key: "showSnippet",
                                                text: intl.get("context.showSnippet"),
                                                canCheck: true,
                                                checked: Boolean(
                                                    props.viewConfigs & ViewConfigs.ShowSnippet
                                                ),
                                                onClick: () =>
                                                    props.setViewConfigs(
                                                        props.viewConfigs ^ ViewConfigs.ShowSnippet
                                                    ),
                                            },
                                            {
                                                key: "fadeRead",
                                                text: intl.get("context.fadeRead"),
                                                canCheck: true,
                                                checked: Boolean(
                                                    props.viewConfigs & ViewConfigs.FadeRead
                                                ),
                                                onClick: () =>
                                                    props.setViewConfigs(
                                                        props.viewConfigs ^ ViewConfigs.FadeRead
                                                    ),
                                            },
                                        ],
                                    },
                                },
                            ]
                        : []),
                ];
            case ContextMenuType.Text: {
                const items: IContextualMenuItem[] = props.text
                    ? [
                            {
                                key: "copyText",
                                text: intl.get("context.copy"),
                                iconProps: { iconName: "Copy" },
                                onClick: () => {
                                    window.utils.writeClipboard(props.text);
                                },
                            },
                            getSearchItem(props.text),
                        ]
                    : [];
                if (props.url) {
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
                                            props.url,
                                            platformCtrl(e)
                                        );
                                    },
                                },
                                {
                                    key: "copyURL",
                                    text: intl.get("context.copyURL"),
                                    iconProps: { iconName: "Link" },
                                    onClick: () => {
                                        window.utils.writeClipboard(props.url);
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
                                    checked: props.viewType === ViewType.Cards,
                                    onClick: () => props.switchView(ViewType.Cards),
                                },
                                {
                                    key: "listView",
                                    text: intl.get("context.listView"),
                                    iconProps: { iconName: "BacklogList" },
                                    canCheck: true,
                                    checked: props.viewType === ViewType.List,
                                    onClick: () => props.switchView(ViewType.List),
                                },
                                {
                                    key: "magazineView",
                                    text: intl.get("context.magazineView"),
                                    iconProps: { iconName: "Articles" },
                                    canCheck: true,
                                    checked: props.viewType === ViewType.Magazine,
                                    onClick: () => props.switchView(ViewType.Magazine),
                                },
                                {
                                    key: "compactView",
                                    text: intl.get("context.compactView"),
                                    iconProps: { iconName: "BulletedList" },
                                    canCheck: true,
                                    checked: props.viewType === ViewType.Compact,
                                    onClick: () => props.switchView(ViewType.Compact),
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
                        onClick: () => props.markAllRead(props.sids),
                    },
                    {
                        key: "refresh",
                        text: intl.get("nav.refresh"),
                        iconProps: { iconName: "Sync" },
                        onClick: () => props.fetchItems(props.sids),
                    },
                    {
                        key: "manage",
                        text: intl.get("context.manageSources"),
                        iconProps: { iconName: "Settings" },
                        onClick: () => props.settings(props.sids),
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
                                    onClick: () => props.markAllRead(),
                                },
                                {
                                    key: "1d",
                                    text: intl.get("app.daysAgo", { days: 1 }),
                                    onClick: () => {
                                        let date = new Date();
                                        date.setTime(date.getTime() - 86400000);
                                        props.markAllRead(null, date);
                                    },
                                },
                                {
                                    key: "3d",
                                    text: intl.get("app.daysAgo", { days: 3 }),
                                    onClick: () => {
                                        let date = new Date();
                                        date.setTime(date.getTime() - 3 * 86400000);
                                        props.markAllRead(null, date);
                                    },
                                },
                                {
                                    key: "7d",
                                    text: intl.get("app.daysAgo", { days: 7 }),
                                    onClick: () => {
                                        let date = new Date();
                                        date.setTime(date.getTime() - 7 * 86400000);
                                        props.markAllRead(null, date);
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

    return props.type == ContextMenuType.Hidden ? null : (
        <ContextualMenu
            directionalHint={DirectionalHint.bottomLeftEdge}
            items={getItems()}
            target={
                props.event ||
                (props.position && {
                    left: props.position[0],
                    top: props.position[1],
                })
            }
            onDismiss={props.close}
        />
    );
};

