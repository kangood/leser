import * as React from "react"
import ReactDOM from 'react-dom/client';
import { Provider } from "react-redux"
import { createStore, applyMiddleware, compose } from "redux"
import thunkMiddleware from "redux-thunk"
import { initializeIcons } from "@fluentui/react/lib/Icons"
import { rootReducer, RootState } from "./scripts/reducer"
import Root from "./components/root"
import { AppDispatch } from "./scripts/utils"
import { applyThemeSettings } from "./scripts/settings"
import { initApp, openTextMenu } from "./scripts/models/app"
import { devToolsEnhancer } from 'redux-devtools-extension';
import { useAppStore } from "./scripts/store/app-store";

window.settings.setProxy()

applyThemeSettings()
initializeIcons("icons/")

const store = createStore(
    rootReducer,
    compose(
        applyMiddleware<AppDispatch, RootState>(thunkMiddleware),
        devToolsEnhancer({})
    )
)

// store.dispatch(initApp())
useAppStore.getState().initApp();

window.utils.addMainContextListener((pos, text) => {
    // store.dispatch(openTextMenu(pos, text))
    useAppStore.getState().openTextMenu(pos, text);
})

window.fontList = [""]
window.utils.initFontList().then(fonts => {
    window.fontList.push(...fonts)
})

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
    <Provider store={store}>
        <Root />
    </Provider>,
)
