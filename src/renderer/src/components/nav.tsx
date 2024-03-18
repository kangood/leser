import { ProgressIndicator, IObjectWithKey } from "@fluentui/react";
import { Icon } from "@fluentui/react/lib/Icon";
import React, { useEffect, useState } from "react";
import intl from "react-intl-universal";

import { WindowStateListenerType } from "../schema-types";
import { AppState } from "../scripts/models/app";

type NavProps = {
    state: AppState;
    itemShown: boolean;
    menu: () => void;
    search: () => void;
    markAllRead: () => void;
    fetch: () => void;
    logs: () => void;
    views: () => void;
    settings: () => void;
};

const Nav: React.FC<NavProps> = ({
    state,
    itemShown,
    menu,
    search,
    markAllRead,
    fetch,
    logs,
    views,
    settings,
}) => {
    const [maximized, setMaximized] = useState<boolean>(window.utils.isMaximized());

    useEffect(() => {
        const setBodyFocusState = (focused: boolean) => {
            if (focused) document.body.classList.remove("blur");
            else document.body.classList.add("blur");
        };

        const setBodyFullscreenState = (fullscreen: boolean) => {
            if (fullscreen) document.body.classList.remove("not-fullscreen");
            else document.body.classList.add("not-fullscreen");
        };

        const windowStateListener = (type: WindowStateListenerType, state: boolean) => {
            switch (type) {
                case WindowStateListenerType.Maximized:
                    setMaximized(state);
                    break;
                case WindowStateListenerType.Fullscreen:
                    setBodyFullscreenState(state);
                    break;
                case WindowStateListenerType.Focused:
                    setBodyFocusState(state);
                    break;
            }
        };

        window.utils.addWindowStateListener(windowStateListener);

        document.addEventListener("keydown", navShortcutsHandler);
        if (window.utils.platform === "darwin")
            window.utils.addTouchBarEventsListener(navShortcutsHandler);

        return () => {
            document.removeEventListener("keydown", navShortcutsHandler);
        };
    }, []);

    const navShortcutsHandler = (e: KeyboardEvent | IObjectWithKey) => {
        if (!state.settings.display) {
            switch (e.key) {
                case "F1":
                    menu();
                    break;
                case "F2":
                    search();
                    break;
                case "F5":
                    fetch();
                    break;
                case "F6":
                    markAllRead();
                    break;
                case "F7":
                    if (!itemShown) logs();
                    break;
                case "F8":
                    if (!itemShown) views();
                    break;
                case "F9":
                    if (!itemShown) settings();
                    break;
            }
        }
    };

    const minimize = () => {
        window.utils.minimizeWindow();
    };

    const maximize = () => {
        window.utils.maximizeWindow();
        setMaximized(!maximized);
    };

    const close = () => {
        window.utils.closeWindow();
    };

    const canFetch = () =>
        state.sourceInit && state.feedInit && !state.syncing && !state.fetchingItems;

    const fetching = () => (!canFetch() ? " fetching" : "");

    const getClassNames = () => {
        const classNames = new Array<string>();
        if (state.settings.display) classNames.push("hide-btns");
        if (state.menu) classNames.push("menu-on");
        if (itemShown) classNames.push("item-on");
        return classNames.join(" ");
    };

    const getProgress = () => {
        return state.fetchingTotal > 0 ? state.fetchingProgress / state.fetchingTotal : null;
    };

    return (
        <nav className={getClassNames()}>
            <div className="btn-group">
                {/* 导航栏最左边的 a 标签，内嵌一个图标，点击出现菜单栏 */}
                <a className="btn hide-wide" title={intl.get("nav.menu")} onClick={menu}>
                    <Icon
                        iconName={
                            window.utils.platform === "darwin" ? "SidePanel" : "GlobalNavButton"
                        }
                    />
                </a>
            </div>
            <span className="title">{state.title}</span>
            <div className="btn-group" style={{ float: "right" }}>
                <a className={`btn${fetching()}`} onClick={fetch} title={intl.get("nav.refresh")}>
                    <Icon iconName="Refresh" />
                </a>
                <a
                    className="btn"
                    id="mark-all-toggle"
                    onClick={markAllRead}
                    title={intl.get("nav.markAllRead")}
                    onMouseDown={e => {
                        if (state.contextMenu.event === "#mark-all-toggle") e.stopPropagation();
                    }}>
                    <Icon iconName="InboxCheck" />
                </a>
                <a
                    className="btn"
                    id="log-toggle"
                    title={intl.get("nav.notifications")}
                    onClick={logs}>
                    {state.logMenu.notify ? (
                        <Icon iconName="RingerSolid" />
                    ) : (
                        <Icon iconName="Ringer" />
                    )}
                </a>
                <a
                    className="btn"
                    id="view-toggle"
                    title={intl.get("nav.view")}
                    onClick={views}
                    onMouseDown={e => {
                        if (state.contextMenu.event === "#view-toggle") e.stopPropagation();
                    }}>
                    <Icon iconName="View" />
                </a>
                <a className="btn" title={intl.get("nav.settings")} onClick={settings}>
                    <Icon iconName="Settings" />
                </a>
                <span className="seperator" />
                <a
                    className="btn system"
                    title={intl.get("nav.minimize")}
                    onClick={minimize}
                    style={{ fontSize: 12 }}>
                    <Icon iconName="Remove" />
                </a>
                <a className="btn system" title={intl.get("nav.maximize")} onClick={maximize}>
                    {maximized ? (
                        <Icon iconName="ChromeRestore" style={{ fontSize: 11 }} />
                    ) : (
                        <Icon iconName="Checkbox" style={{ fontSize: 10 }} />
                    )}
                </a>
                <a className="btn system close" title={intl.get("close")} onClick={close}>
                    <Icon iconName="Cancel" />
                </a>
            </div>
            {!canFetch() && (
                <ProgressIndicator className="progress" percentComplete={getProgress()} />
            )}
        </nav>
    );
};

export default Nav;
