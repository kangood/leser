import React, { useEffect } from "react"
import { ProgressIndicator, IObjectWithKey } from "@fluentui/react"
import { WindowStateListenerType } from "../schema-types"
import { useApp, useAppActions, useAppMenuOn } from "@renderer/scripts/store/app-store"
import { usePageActions, usePageItemShown } from "@renderer/scripts/store/page-store"
import { useItemActions } from "@renderer/scripts/store/item-store"

const Nav: React.FC = () => {
    // zustand store
    const appState = useApp();
    const { openMarkAllMenu, toggleLogMenu, openViewMenu, toggleSettings, toggleMenu } = useAppActions();
    const pageItemShown = usePageItemShown();
    const { toggleSearch } = usePageActions();
    const { fetchItems } = useItemActions();
    const appMenuOn = useAppMenuOn();

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
            case WindowStateListenerType.Fullscreen:
                setBodyFullscreenState(state)
                break
            case WindowStateListenerType.Focused:
                setBodyFocusState(state)
                break
        }
    }

    const navShortcutsHandler = (e: KeyboardEvent | IObjectWithKey) => {
        if (!appState.settings.display) {
            switch (e.key) {
                case "F1":
                    toggleMenu()
                    break
                case "F2":
                    toggleSearch()
                    break
                case "F5":
                    fetchWrapper()
                    break
                case "F6":
                    openMarkAllMenu()
                    break
                case "F7":
                    if (!pageItemShown) toggleLogMenu()
                    break
                case "F8":
                    if (!pageItemShown) openViewMenu()
                    break
                case "F9":
                    if (!pageItemShown) toggleSettings()
                    break
            }
        }
    }

    const canFetch = () =>
        appState.sourceInit &&
        appState.feedInit &&
        !appState.syncing &&
        !appState.fetchingItems
    const getClassNames = () => {
        const classNames = new Array<string>();
        if (appState.settings.display) classNames.push("hide-btns");
        if (appMenuOn) classNames.push("menu-on");
        if (pageItemShown) classNames.push("item-on");
        return classNames.join(" ");
    }

    const fetchWrapper = () => {
        if (canFetch()) {
            fetchItems();
        }
    }

    const getProgress = () => {
        return appState.fetchingTotal > 0
            ? appState.fetchingProgress / appState.fetchingTotal
            : null
    }

    return (
        <div className={getClassNames()}>
            {!canFetch() && (
                <ProgressIndicator
                    className="progress"
                    percentComplete={getProgress()}
                />
            )}
        </div>
    )
}

export default Nav;
