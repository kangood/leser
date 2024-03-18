import { connect } from "react-redux";
import { createSelector } from "reselect";

import Nav from "../components/nav";
import { ViewType } from "../schema-types";
import {
    toggleMenu,
    toggleLogMenu,
    toggleSettings,
    openViewMenu,
    openMarkAllMenu,
} from "../scripts/models/app";
import { fetchItems } from "../scripts/models/item";
import { toggleSearch } from "../scripts/models/page";
import { RootState } from "../scripts/reducer";

const getState = (state: RootState) => state.app;
const getItemShown = (state: RootState) =>
    state.page.itemId && state.page.viewType !== ViewType.List;

const mapStateToProps = createSelector([getState, getItemShown], (state, itemShown) => ({
    state,
    itemShown,
}));

const mapDispatchToProps = dispatch => ({
    fetch: () => dispatch(fetchItems()),
    menu: () => dispatch(toggleMenu()),
    logs: () => dispatch(toggleLogMenu()),
    views: () => dispatch(openViewMenu()),
    settings: () => dispatch(toggleSettings()),
    search: () => dispatch(toggleSearch()),
    markAllRead: () => dispatch(openMarkAllMenu()),
});

const NavContainer = connect(mapStateToProps, mapDispatchToProps)(Nav);
export default NavContainer;
