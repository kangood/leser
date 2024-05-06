import * as React from "react"
import Page from "./page"
import ContextMenu from "./context-menu"
import LogMenu from "./log-menu"
import Nav from "./nav"
import Settings from "./settings"
import Menu from "./menu"
import { useAppActions, useAppLocale } from "@renderer/scripts/store/app-store"

const Root = () => {
    const appLocale = useAppLocale();
    const { closeContextMenu } = useAppActions();

    return appLocale && (
        <div
            id="root"
            key={appLocale}
            onMouseDown={closeContextMenu}>
            <Nav />
            <Page />
            <LogMenu />
            <Menu />
            <Settings />
            <ContextMenu />
        </div>
    )
}

export default Root;
