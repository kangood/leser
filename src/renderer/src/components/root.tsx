import * as React from "react"
import { connect } from "react-redux"
import { closeContextMenu } from "../scripts/models/app"
import MenuContainer from "../containers/menu-container"
import NavContainer from "../containers/nav-container"
import SettingsContainer from "../containers/settings-container"
import { RootState } from "../scripts/reducer"
import Page from "./page"
import ContextMenu from "./context-menu"
import LogMenu from "./log-menu"

const Root = ({ locale, dispatch }) =>
    locale && (
        <div
            id="root"
            key={locale}
            onMouseDown={() => dispatch(closeContextMenu())}>
            <NavContainer />
            <Page />
            <LogMenu />
            <MenuContainer />
            <SettingsContainer />
            <ContextMenu />
        </div>
    )

const getLocale = (state: RootState) => ({ locale: state.app.locale })
export default connect(getLocale)(Root)
