import {
    Nav,
    INavLink,
    INavLinkGroup,
    AnimationClassNames,
    Stack,
    FocusZone,
} from "@fluentui/react";
import { Icon } from "@fluentui/react/lib/Icon";
import React, { useEffect, useState } from "react";
import intl from "react-intl-universal";

import { SourceGroup } from "../schema-types";
import { ALL } from "../scripts/models/feed";
import { SourceState, RSSSource } from "../scripts/models/source";

export type MenuProps = {
    status: boolean;
    display: boolean;
    selected: string;
    sources: SourceState;
    groups: SourceGroup[];
    searchOn: boolean;
    itemOn: boolean;
    toggleMenu: () => void;
    allArticles: (init?: boolean) => void;
    selectSourceGroup: (group: SourceGroup, menuKey: string) => void;
    selectSource: (source: RSSSource) => void;
    groupContextMenu: (sids: number[], event: React.MouseEvent) => void;
    updateGroupExpansion: (
        event: React.MouseEvent<HTMLElement>,
        key: string,
        selected: string,
    ) => void;
    toggleSearch: () => void;
};

const Menu: React.FC<MenuProps> = ({
    status,
    display,
    selected,
    sources,
    groups,
    searchOn,
    itemOn,
    toggleMenu,
    allArticles,
    selectSourceGroup,
    selectSource,
    groupContextMenu,
    updateGroupExpansion,
    toggleSearch,
}) => {
    const [menuHidden, setMenuHidden] = useState<boolean>(
        window.innerWidth < 1200, // 初始化时设置菜单状态
    );
    // 宽度在 1200 以上 和 1200 以下，各自调用一次 toggleMenu
    const handleResize = () => {
        const shouldHideMenu = window.innerWidth < 1200;
        if (shouldHideMenu !== menuHidden) {
            setMenuHidden(shouldHideMenu);
            toggleMenu();
        }
    };
    useEffect(() => {
        // 当组件首次加载时，立即检查窗口的宽度，并根据需要设置菜单的显示状态
        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, [menuHidden]);

    const countOverflow = (count: number) => (count >= 1000 ? " 999+" : ` ${count}`);

    const getLinkGroups = (): INavLinkGroup[] => [
        {
            links: [
                {
                    name: intl.get("search"),
                    ariaLabel: intl.get("search") + (searchOn ? " ✓" : " "),
                    key: "search",
                    icon: "Search",
                    onClick: toggleSearch,
                    url: null,
                },
                {
                    name: intl.get("allArticles"),
                    ariaLabel:
                        intl.get("allArticles") +
                        countOverflow(
                            Object.values(sources)
                                .filter(s => !s.hidden)
                                .map(s => s.unreadCount)
                                .reduce((a, b) => a + b, 0),
                        ),
                    key: ALL,
                    icon: "TextDocument",
                    onClick: () => allArticles(selected !== ALL),
                    url: null,
                },
            ],
        },
        {
            name: intl.get("menu.subscriptions"),
            links: groups
                .filter(g => g.sids.length > 0)
                .map(g => {
                    if (g.isMultiple) {
                        const sources = g.sids.map(sid => sources[sid]);
                        return {
                            name: g.name,
                            ariaLabel:
                                g.name +
                                countOverflow(
                                    sources.map(s => s.unreadCount).reduce((a, b) => a + b, 0),
                                ),
                            key: `g-${g.index}`,
                            url: null,
                            isExpanded: g.expanded,
                            onClick: () => selectSourceGroup(g, `g-${g.index}`),
                            links: sources.map(getSource),
                        };
                    }
                    return getSource(sources[g.sids[0]]);
                }),
        },
    ];

    const getSource = (s: RSSSource): INavLink => ({
        name: s.name,
        ariaLabel: s.name + countOverflow(s.unreadCount),
        key: `s-${s.sid}`,
        onClick: () => selectSource(s),
        iconProps: s.iconurl ? getIconStyle(s.iconurl) : null,
        url: null,
    });

    const getIconStyle = (url: string) => ({
        style: { width: 16 },
        imageProps: {
            style: { width: "100%" },
            src: url,
        },
    });

    const onContext = (item: INavLink, event: React.MouseEvent) => {
        let sids: number[];
        const [type, index] = item.key.split("-");
        if (type === "s") {
            sids = [parseInt(index, 10)];
        } else if (type === "g") {
            sids = groups[parseInt(index, 10)].sids;
        } else {
            return;
        }
        groupContextMenu(sids, event);
    };

    const _onRenderLink = (link: INavLink): JSX.Element => {
        const count = link.ariaLabel.split(" ").pop();
        return (
            <Stack
                className="link-stack"
                horizontal
                grow
                onContextMenu={event => onContext(link, event)}>
                <div className="link-text">{link.name}</div>
                {count && count !== "0" && <div className="unread-count">{count}</div>}
            </Stack>
        );
    };

    const _onRenderGroupHeader = (group: INavLinkGroup): JSX.Element => {
        return <p className={`subs-header ${AnimationClassNames.slideDownIn10}`}>{group.name}</p>;
    };

    return (
        status && (
            <div className={`menu-container${display ? " show" : ""}`} onClick={toggleMenu}>
                <div
                    className={`menu${itemOn ? " item-on" : ""}`}
                    onClick={e => e.stopPropagation()}>
                    <div className="btn-group">
                        <a
                            className="btn hide-wide"
                            title={intl.get("menu.close")}
                            onClick={toggleMenu}>
                            <Icon iconName="Back" />
                        </a>
                        <a
                            className="btn inline-block-wide"
                            title={intl.get("menu.close")}
                            onClick={toggleMenu}>
                            <Icon
                                iconName={
                                    window.utils.platform === "darwin"
                                        ? "SidePanel"
                                        : "GlobalNavButton"
                                }
                            />
                        </a>
                    </div>
                    <FocusZone as="div" disabled={!display} className="nav-wrapper">
                        <Nav
                            onRenderGroupHeader={_onRenderGroupHeader}
                            onRenderLink={_onRenderLink}
                            groups={getLinkGroups()}
                            selectedKey={selected}
                            onLinkExpandClick={(event, item) =>
                                updateGroupExpansion(event, item.key, selected)
                            }
                        />
                    </FocusZone>
                </div>
            </div>
        )
    );
};

export default Menu;
