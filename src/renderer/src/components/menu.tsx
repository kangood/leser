import React from "react"
import intl from "react-intl-universal"
import { Icon } from "@fluentui/react/lib/Icon"
import { Nav, INavLink, INavLinkGroup } from "@fluentui/react"
import { RSSSource } from "../scripts/models/source"
import { ALL, FilterType } from "../scripts/models/feed"
import { AnimationClassNames, Stack, FocusZone } from "@fluentui/react"
import { useEffect, useState } from "react"
import { usePageFilter, usePageItemShown } from "@renderer/scripts/store/page-store"
import { useApp, useAppActions } from "@renderer/scripts/store/app-store"
import { useItemActions } from "@renderer/scripts/store/item-store"
import { useGroupsByMenu } from "@renderer/scripts/store/group-store"
import { useSources } from "@renderer/scripts/store/source-store"
import { useMenuActions, useMenuDisplay } from "@renderer/scripts/store/menu-store"

const Menu: React.FC = () => {
    // zustand store
    const menuDisplayZ = useMenuDisplay();
    const { toggleMenu, selectSourceGroup, allArticles, selectSource, updateGroupExpansion } = useMenuActions();
    const appState = useApp();
    const { openGroupMenu } = useAppActions();
    const filterType = usePageFilter().type;
    const pageItemShown = usePageItemShown();
    const { fetchItems } = useItemActions();
    const groupsZ = useGroupsByMenu();
    const sourcesZ = useSources();
    const selected = appState.menuKey;

    // 选中【未读、星标】时的标识
    const isUnreadOnly = (filterType & ~FilterType.Toggles) == FilterType.UnreadOnly;
    const isStarredOnly = (filterType & ~FilterType.Toggles) == FilterType.StarredOnly;

    const [menuDisplay, setMenuDisplay] = useState<boolean>(
        window.innerWidth >= 1200 // 初始化时设置菜单状态
    )
    // 宽度在经过 1200 断点时，调用一次 toggleMenu
    const handleResize = () => {
        const shouldDisplayMenu = window.innerWidth >= 1200
        // 两个状态不一样才执行开关，不然会一直进入判断
        if (shouldDisplayMenu !== menuDisplay) {
            setMenuDisplay(shouldDisplayMenu)
            toggleMenu(shouldDisplayMenu)
            window.settings.setDefaultMenu(shouldDisplayMenu)
        }
    }
    useEffect(() => {
        window.addEventListener("resize", handleResize)
        // 当组件首次加载时，就不走 handleResize 的判断了，立即检查窗口的宽度，并设置状态
        if (menuDisplay) {
            toggleMenu(true);
            window.settings.setDefaultMenu(menuDisplayZ)
        }
        return () => {
            window.removeEventListener("resize", handleResize)
        }
    }, [menuDisplay])
    
    // 刷新前的状态检查
    const canFetch = () =>
        appState.sourceInit &&
        appState.feedInit &&
        !appState.syncing &&
        !appState.fetchingItems
    const fetching = () => (!canFetch() ? " fetching" : "")
    // 刷新包装器
    const fetchWrapper = () => {
        if (canFetch()) {
            fetchItems();
        }
    }

    const countOverflow = (count: number) => count >= 1000 ? " 999+" : ` ${count}`

    const getLinkGroups = (): INavLinkGroup[] => {
        const singleSourceFilter = [];
        const groups = groupsZ
                .filter(g => g.sids.length > 0)
                .map(g => {
                    if (g.isMultiple) {
                        let sources = g.sids.map(sid => sourcesZ[sid])
                        if (isUnreadOnly) {
                            // 当前选中未读，就过滤掉未读为0的数据
                            sources = sources.filter((item) => item.unreadCount !== 0);
                        } else if (isStarredOnly) {
                            // 当前选中星标，就过滤掉非星标数据
                            sources = sources.filter((item) => item.starredCount > 0);
                        }
                        return {
                            name: g.name,
                            ariaLabel:
                                g.name +
                                countOverflow(
                                    sources
                                        .map(s => isStarredOnly ? s.starredCount : s.unreadCount)
                                        .reduce((a, b) => a + b, 0)
                                ),
                            key: "g-" + g.index,
                            url: null,
                            isExpanded: g.expanded,
                            onClick: () => selectSourceGroup(g, "g-" + g.index),
                            links: sources.map(getSource),
                        }
                    } else {
                        // 单独订阅源的【未读、星标】过滤处理
                        const rssSource = sourcesZ[g.sids[0]];
                        if (isUnreadOnly && rssSource.unreadCount === 0) {
                            singleSourceFilter.push('s-' + rssSource.sid);
                        } else if (isStarredOnly && rssSource.starredCount === 0) {
                            singleSourceFilter.push('s-' + rssSource.sid);
                        }
                        return getSource(rssSource);
                    }
                })
                // 二次过滤，去掉组别中没有子节点的数据（如果 g.links 存在说明有分组，则过滤掉分组内零元素的数据）
                .filter(g => g.links ? g.links.length > 0 : true)
                // 三次过滤，去掉单独一个订阅源的不用展示的数据
                .filter(g => !singleSourceFilter.includes(g.key))

        return [
            // 订阅源上面的渲染
            {
                links: [
                    {
                        name: intl.get("allArticles"),
                        ariaLabel:
                            intl.get("allArticles") +
                            countOverflow(
                                Object.values(sourcesZ)
                                    .filter(s => !s.hidden)
                                    .map(s => isStarredOnly ? s.starredCount : s.unreadCount)
                                    .reduce((a, b) => a + b, 0)
                            ),
                        key: ALL,
                        icon: "TextDocument",
                        onClick: () => {
                            // 在菜单需要隐藏时关闭
                            if (!menuDisplay) {
                                toggleMenu(false)
                            }
                            allArticles(selected !== ALL)
                        },
                        url: null,
                    },
                ],
            },
            // 订阅源及下面的渲染
            {
                name: intl.get("menu.subscriptions"),
                links: groups
            },
        ]
    }

    const getSource = (s: RSSSource): INavLink => ({
        name: s.name,
        ariaLabel: s.name + countOverflow(isStarredOnly ? s.starredCount : s.unreadCount),
        key: "s-" + s.sid,
        onClick: () => {
            selectSource(s)
            // 在菜单需要隐藏时关闭
            if (!menuDisplay) {
                toggleMenu(false)
            }
        },
        iconProps: s.iconurl ? getIconStyle(s.iconurl) : null,
        url: null,
    })

    const getIconStyle = (url: string) => ({
        style: { width: 16 },
        imageProps: {
            style: { width: "100%" },
            src: url,
        },
    })

    const onContext = (item: INavLink, event: React.MouseEvent) => {
        let sids: number[];
        let [type, index] = item.key.split("-");
        if (type === "s") {
            sids = [parseInt(index)];
        } else if (type === "g") {
            sids = groupsZ[parseInt(index)].sids;
        } else {
            return;
        }
        openGroupMenu(sids, event);
    }

    const _onRenderLink = (link: INavLink): JSX.Element => {
        let count = link.ariaLabel.split(" ").pop()
        return (
            <Stack
                className="link-stack"
                horizontal
                grow
                onContextMenu={event => onContext(link, event)}>
                <div className="link-text">{link.name}</div>
                {count && count !== "0" && (
                    <div className="unread-count">{count}</div>
                )}
            </Stack>
        )
    }

    const _onRenderGroupHeader = (group: INavLinkGroup): JSX.Element => {
        return (
            <p className={"subs-header " + AnimationClassNames.slideDownIn10}>
                {group.name}
            </p>
        )
    }

    return (
        status && (
            <div
                className={"menu-container" + (menuDisplayZ ? " show" : "")}
                onClick={() => toggleMenu()}>
                <div
                    className={"menu" + (pageItemShown ? " item-on" : "")}
                    onClick={e => e.stopPropagation()}>
                    <div className="btn-group dragging">
                        <a
                            className={"btn" + fetching() + " undragging"}
                            onClick={fetchWrapper}
                            title={intl.get("nav.refresh")}
                        >
                            <Icon iconName="Refresh"/>
                        </a>
                    </div>
                    <FocusZone
                        as="div"
                        disabled={!appState.menu}
                        className="nav-wrapper">
                        <Nav
                            // 订阅源头部样式
                            onRenderGroupHeader={_onRenderGroupHeader}
                            // 链接样式 + 订阅源的文章数量
                            onRenderLink={_onRenderLink}
                            // 行 item 数据组
                            groups={getLinkGroups()}
                            selectedKey={selected}
                            onLinkExpandClick={(event, item) =>
                                updateGroupExpansion(
                                    event,
                                    item.key,
                                    selected
                                )
                            }
                        />
                    </FocusZone>
                </div>
            </div>
        )
    )
}

export default Menu;