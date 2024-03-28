import * as React from "react"
import { useEffect, useState } from "react"
import intl from "react-intl-universal"
import { Icon } from "@fluentui/react/lib/Icon"
import { AppState } from "../scripts/models/app"
import { ProgressIndicator, IObjectWithKey } from "@fluentui/react"
import { WindowStateListenerType } from "../schema-types"
import { useToggleMenuStore } from "@renderer/scripts/store/menu-store"

type NavProps = {
    state: AppState
    itemShown: boolean
    menu: () => void
    search: () => void
    markAllRead: () => void
    fetch: () => void
    logs: () => void
    views: () => void
    settings: () => void
}

const Nav: React.FC<NavProps> = ({
    state,
    itemShown,
    search,
    markAllRead,
    fetch,
    logs,
    views,
    settings
}) => {
    const [maximized, setMaximized] = useState<boolean>(window.utils.isMaximized());
    const toggleMenuDisplay = useToggleMenuStore(state => state.display);
    const toggleMenu = useToggleMenuStore(state => state.toggleMenu);

    useEffect(() => {
        setBodyFocusState(window.utils.isFocused())
        setBodyFullscreenState(window.utils.isFullscreen())
        window.utils.addWindowStateListener(windowStateListener)
        document.addEventListener("keydown", navShortcutsHandler)
        if (window.utils.platform === "darwin") {
            window.utils.addTouchBarEventsListener(navShortcutsHandler)
        }
        return () => {
            document.removeEventListener("keydown", navShortcutsHandler)
        }
    }, [])

    const setBodyFocusState = (focused: boolean) => {
        if (focused) document.body.classList.remove("blur")
        else document.body.classList.add("blur")
    }

    const setBodyFullscreenState = (fullscreen: boolean) => {
        if (fullscreen) document.body.classList.remove("not-fullscreen")
        else document.body.classList.add("not-fullscreen")
    }

    const windowStateListener = (type: WindowStateListenerType, state: boolean) => {
        switch (type) {
            case WindowStateListenerType.Maximized:
                setMaximized(state)
                break
            case WindowStateListenerType.Fullscreen:
                setBodyFullscreenState(state)
                break
            case WindowStateListenerType.Focused:
                setBodyFocusState(state)
                break
        }
    }

    const navShortcutsHandler = (e: KeyboardEvent | IObjectWithKey) => {
        if (!state.settings.display) {
            switch (e.key) {
                case "F1":
                    toggleMenu()
                    break
                case "F2":
                    search()
                    break
                case "F5":
                    fetchWrapper()
                    break
                case "F6":
                    markAllRead()
                    break
                case "F7":
                    if (!itemShown) logs()
                    break
                case "F8":
                    if (!itemShown) views()
                    break
                case "F9":
                    if (!itemShown) settings()
                    break
            }
        }
    }

    const minimize = () => {
        window.utils.minimizeWindow()
    }
    const maximize = () => {
        window.utils.maximizeWindow()
        setMaximized(!maximized)
    }
    const close = () => {
        window.utils.closeWindow()
    }

    const canFetch = () =>
        state.sourceInit &&
        state.feedInit &&
        !state.syncing &&
        !state.fetchingItems
    const getClassNames = () => {
        const classNames = new Array<string>()
        if (state.settings.display) classNames.push("hide-btns")
        if (toggleMenuDisplay) classNames.push("menu-on")
        if (itemShown) classNames.push("item-on")
        return classNames.join(" ")
    }

    const fetchWrapper = () => {
        if (canFetch()) fetch()
    }

    const viewsWrapper = () => {
        if (state.contextMenu.event !== "#view-toggle") {
            views()
        }
    }

    const getProgress = () => {
        return state.fetchingTotal > 0
            ? state.fetchingProgress / state.fetchingTotal
            : null
    }

    return (
        <div className={getClassNames()}>
            {/* <div className="btn-group" style={{ float: "right" }}>
                <a
                    className="btn"
                    id="mark-all-toggle"
                    onClick={markAllRead}
                    title={intl.get("nav.markAllRead")}
                    onMouseDown={e => {
                        if (
                            state.contextMenu.event ===
                            "#mark-all-toggle"
                        )
                            e.stopPropagation()
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
                    onClick={viewsWrapper}
                    onMouseDown={e => {
                        if (
                            state.contextMenu.event ===
                            "#view-toggle"
                        )
                            e.stopPropagation()
                    }}>
                    <Icon iconName="View" />
                </a>
                <a
                    className="btn"
                    title={intl.get("nav.settings")}
                    onClick={settings}>
                    <Icon iconName="Settings" />
                </a>
                <span className="seperator"></span>
                <a
                    className="btn system"
                    title={intl.get("nav.minimize")}
                    onClick={minimize}
                    style={{ fontSize: 12 }}>
                    <Icon iconName="Remove" />
                </a>
                <a
                    className="btn system"
                    title={intl.get("nav.maximize")}
                    onClick={maximize}>
                    {maximized ? (
                        <Icon
                            iconName="ChromeRestore"
                            style={{ fontSize: 11 }}
                        />
                    ) : (
                        <Icon
                            iconName="Checkbox"
                            style={{ fontSize: 10 }}
                        />
                    )}
                </a>
                <a
                    className="btn system close"
                    title={intl.get("close")}
                    onClick={close}>
                    <Icon iconName="Cancel" />
                </a>
            </div> */}
            {!canFetch() && (
                <ProgressIndicator
                    className="progress"
                    percentComplete={getProgress()}
                />
            )}
        </div>
    )
}

export default Nav
