import React, { useState, useEffect } from "react"
import intl from "react-intl-universal"
import { renderToString } from "react-dom/server"
import { RSSItem } from "../scripts/models/item"
import {
    Stack,
    CommandBarButton,
    IContextualMenuProps,
    FocusZone,
    ContextualMenuItemType,
    Spinner,
    Icon,
    Link,
} from "@fluentui/react"
import {
    SourceOpenTarget,
    SourceTextDirection,
} from "../scripts/models/source"
import { shareSubmenu } from "./context-menu"
import { platformCtrl, decodeFetchResponse } from "../scripts/utils"
import { useItemActions, useItems } from "@renderer/scripts/store/item-store"
import { useSourceActions, useSources } from "@renderer/scripts/store/source-store"
import { useAppActions, useAppLocale } from "@renderer/scripts/store/app-store"
import { usePageActions } from "@renderer/scripts/store/page-store"

const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20];

type ArticleState = {
    fontFamily: string
    fontSize: number
    loadWebpage: boolean
    loadFull: boolean
    fullContent: string
    loaded: boolean
    error: boolean
    errorDescription: string
}

type ArticleContainerProps = {
    itemId: number
}

const Article: React.FC<ArticleContainerProps> = (props) => {
    // zustand store
    const items = useItems();
    const item = items[props.itemId];
    const source = useSources()[items[props.itemId].source];
    const prevItemRef = React.useRef<RSSItem>(item);
    const { updateSource } = useSourceActions();
    const { dismissItem, showOffsetItem } = usePageActions();
    const { articleToggleHidden, itemShortcuts, markRead, markUnread, toggleStarred } = useItemActions();
    const locale = useAppLocale();
    const { openTextMenu, openImageMenu, closeContextMenu } = useAppActions();

    const [state, setState] = useState<ArticleState>({
        fontFamily: window.settings.getFont(),
        fontSize: window.settings.getFontSize(),
        loadWebpage: source.openTarget === SourceOpenTarget.Webpage,
        loadFull: source.openTarget === SourceOpenTarget.FullContent,
        fullContent: "",
        loaded: false,
        error: false,
        errorDescription: "",
    })

    // 初始化一次
    useEffect(() => {
        window.utils.addWebviewContextListener(contextMenuHandler);
        window.utils.addWebviewKeydownListener(keyDownHandler);
        window.utils.addWebviewErrorListener(webviewError);
        if (source.openTarget === SourceOpenTarget.FullContent) {
            loadFull();
        }
    }, []);

    // 项目改变时加载
    useEffect(() => {
        if (prevItemRef.current._id !== item._id) {
            setState(prevState => ({
                ...prevState,
                loadWebpage: source.openTarget === SourceOpenTarget.Webpage,
                loadFull: source.openTarget === SourceOpenTarget.FullContent
            }));
            if (source.openTarget === SourceOpenTarget.FullContent) {
                loadFull();
            }
        }
        prevItemRef.current = item;
    }, [item]);

    let webview: Electron.WebviewTag;
    useEffect(() => {
        // 加载
        const webviewIn = document.getElementById('article') as Electron.WebviewTag;
        if (webviewIn != webview) {
            webview = webviewIn;
            if (webviewIn) {
                webviewIn.focus();
                setState(prevState => ({ ...prevState, loaded: false, error: false }));
                webviewIn.addEventListener('did-stop-loading', webviewLoaded);
                let card = document.querySelector(
                    `#refocus div[data-iid="${item._id}"]`
                ) as HTMLElement
                if (card) {
                    // @ts-ignore
                    card.scrollIntoViewIfNeeded()
                }
            }
        }
        // 卸载
        return () => {
            let refocus = document.querySelector(
                `#refocus div[data-iid="${item._id}"]`
            ) as HTMLElement
            if (refocus) {
                refocus.focus();
            }
        };
    }, [item._id, state.loadWebpage, state.loadFull]);

    const webviewLoaded = () => {
        setState(prevState => ({ ...prevState, loaded: true }));
    }
    const webviewError = (reason: string) => {
        setState(prevState => ({ ...prevState, error: true, errorDescription: reason }));
    }
    const webviewReload = () => {
        if (webview) {
            setState(prevState => ({ ...prevState, loaded: false, error: false }));
            webview.reload();
        } else if (state.loadFull) {
            loadFull();
        }
    }

    const setFontSize = (size: number) => {
        window.settings.setFontSize(size);
        setState(prevState => ({ ...prevState, fontSize: size }));
    }
    const setFont = (font: string) => {
        window.settings.setFont(font);
        setState(prevState => ({ ...prevState, fontFamily: font }));
    }

    const fontSizeMenuProps = (): IContextualMenuProps => ({
        items: FONT_SIZE_OPTIONS.map(size => ({
            key: String(size),
            text: String(size),
            canCheck: true,
            checked: size === state.fontSize,
            onClick: () => setFontSize(size),
        })),
    })

    const fontFamilyMenuProps = (): IContextualMenuProps => ({
        items: window.fontList.map((font, idx) => ({
            key: String(idx),
            text: font === "" ? intl.get("default") : font,
            canCheck: true,
            checked: state.fontFamily === font,
            onClick: () => setFont(font),
        })),
    })

    const updateTextDirection = (direction: SourceTextDirection) => {
        updateSource({ ...source, textDir: direction });
    }

    const directionMenuProps = (): IContextualMenuProps => ({
        items: [
            {
                key: "LTR",
                text: intl.get("article.LTR"),
                iconProps: { iconName: "Forward" },
                canCheck: true,
                checked: source.textDir === SourceTextDirection.LTR,
                onClick: () => updateTextDirection(SourceTextDirection.LTR),
            },
            {
                key: "RTL",
                text: intl.get("article.RTL"),
                iconProps: { iconName: "Back" },
                canCheck: true,
                checked: source.textDir === SourceTextDirection.RTL,
                onClick: () => updateTextDirection(SourceTextDirection.RTL),
            },
            {
                key: "Vertical",
                text: intl.get("article.Vertical"),
                iconProps: { iconName: "Down" },
                canCheck: true,
                checked: source.textDir === SourceTextDirection.Vertical,
                onClick: () => updateTextDirection(SourceTextDirection.Vertical),
            },
        ],
    })

    const moreMenuProps = (): IContextualMenuProps => ({
        items: [
            {
                key: "openInBrowser",
                text: intl.get("openExternal"),
                iconProps: { iconName: "NavigateExternalInline" },
                onClick: e => {
                    window.utils.openExternal(
                        item.link,
                        platformCtrl(e)
                    )
                },
            },
            {
                key: "copyURL",
                text: intl.get("context.copyURL"),
                iconProps: { iconName: "Link" },
                onClick: () => window.utils.writeClipboard(item.link)
            },
            {
                key: "toggleHidden",
                text: item.hidden
                    ? intl.get("article.unhide")
                    : intl.get("article.hide"),
                iconProps: {
                    iconName: item.hidden ? "View" : "Hide3",
                },
                onClick: () => articleToggleHidden(item)
            },
            {
                key: "fontMenu",
                text: intl.get("article.font"),
                iconProps: { iconName: "Font" },
                disabled: state.loadWebpage,
                subMenuProps: fontFamilyMenuProps(),
            },
            {
                key: "fontSizeMenu",
                text: intl.get("article.fontSize"),
                iconProps: { iconName: "FontSize" },
                disabled: state.loadWebpage,
                subMenuProps: fontSizeMenuProps(),
            },
            {
                key: "directionMenu",
                text: intl.get("article.textDir"),
                iconProps: { iconName: "ChangeEntitlements" },
                disabled: state.loadWebpage,
                subMenuProps: directionMenuProps(),
            },
            {
                key: "divider_1",
                itemType: ContextualMenuItemType.Divider,
            },
            ...shareSubmenu(item),
        ],
    })

    const contextMenuHandler = (pos: [number, number], text: string, url: string) => {
        if (pos) {
            if (text || url) {
                openTextMenu(pos, text, url);
            } else {
                openImageMenu(pos);
            }
        } else {
            closeContextMenu();
        }
    }

    const keyDownHandler = (input: Electron.Input) => {
        if (input.type === "keyDown") {
            switch (input.key) {
                case "Escape":
                    dismissItem();
                    break;
                case "ArrowLeft":
                case "ArrowRight":
                    showOffsetItem(input.key === "ArrowLeft" ? -1 : 1);
                    break;
                case "l":
                case "L":
                    toggleWebpage();
                    break;
                case "w":
                case "W":
                    toggleFull();
                    break;
                case "H":
                case "h":
                    if (!input.meta) {
                        articleToggleHidden(item);
                    }
                    break;
                default:
                    const keyboardEvent = new KeyboardEvent("keydown", {
                        code: input.code,
                        key: input.key,
                        shiftKey: input.shift,
                        altKey: input.alt,
                        ctrlKey: input.control,
                        metaKey: input.meta,
                        repeat: input.isAutoRepeat,
                        bubbles: true,
                    });
                    itemShortcuts(item, keyboardEvent);
                    document.dispatchEvent(keyboardEvent);
                    break;
            }
        }
    }

    const toggleWebpage = () => {
        if (state.loadWebpage) {
            setState(prevState => ({ ...prevState, loadWebpage: false }));
        } else if (
            item.link.startsWith("https://") ||
            item.link.startsWith("http://")
        ) {
            setState(prevState => ({ ...prevState, loadWebpage: true, loadFull: false }));
        }
    }

    const toggleFull = () => {
        if (state.loadFull) {
            setState(prevState => ({ ...prevState, loadFull: false }));
        } else if (
            item.link.startsWith("https://") ||
            item.link.startsWith("http://")
        ) {
            setState(prevState => ({ ...prevState, loadFull: true, loadWebpage: false }));
            loadFull()
        }
    }
    const loadFull = async () => {
        setState(prevState => ({ ...prevState, fullContent: "", loaded: false, error: false }));
        const link = item.link;
        try {
            const result = await fetch(link);
            if (!result || !result.ok) {
                throw new Error();
            }
            const html = await decodeFetchResponse(result, true);
            if (link === item.link) {
                setState(prevState => ({ ...prevState, fullContent: html }));
            }
        } catch {
            if (link === item.link) {
                setState(prevState => ({
                    ...prevState,
                    loaded: true,
                    error: true,
                    errorDescription: "MERCURY_PARSER_FAILURE",
                }));
            }
        }
    }

    const articleView = () => {
        const a = encodeURIComponent(
            state.loadFull
                ? state.fullContent
                : item.content
        )
        const h = encodeURIComponent(
            renderToString(
                <>
                    <p className="title">{item.title}</p>
                    <p className="date">
                        {item.date.toLocaleString(
                            locale,
                            { hour12: !locale.startsWith("zh") }
                        )}
                    </p>
                    <article></article>
                </>
            )
        )
        return `article/article.html?a=${a}&h=${h}&f=${encodeURIComponent(
            state.fontFamily
        )}&s=${state.fontSize}&d=${source.textDir}&u=${
            item.link
        }&m=${state.loadFull ? 1 : 0}`
    }

    return (
        <FocusZone className="article">
            <Stack horizontal style={{ height: 36 }}>
                <span style={{ width: 96 }}></span>
                <Stack
                    className="actions"
                    grow
                    horizontal
                    tokens={{ childrenGap: 12 }}>
                    <Stack.Item grow>
                        <span className="source-name">
                            {state.loaded ? (
                                source.iconurl && (
                                    <img
                                        className="favicon"
                                        src={source.iconurl}
                                    />
                                )
                            ) : (
                                <Spinner size={1} />
                            )}
                            {source.name}
                            {item.creator && (
                                <span className="creator">
                                    {item.creator}
                                </span>
                            )}
                        </span>
                    </Stack.Item>
                    <CommandBarButton
                        title={
                            item.hasRead
                                ? intl.get("article.markUnread")
                                : intl.get("article.markRead")
                        }
                        iconProps={
                            item.hasRead
                                ? { iconName: "StatusCircleRing" }
                                : {
                                      iconName: "RadioBtnOn",
                                      style: {
                                          fontSize: 14,
                                          textAlign: "center",
                                      },
                                  }
                        }
                        onClick={() =>
                            item.hasRead ? markUnread(item) : markRead(item)
                        }
                    />
                    <CommandBarButton
                        title={
                            item.starred
                                ? intl.get("article.unstar")
                                : intl.get("article.star")
                        }
                        iconProps={{
                            iconName: item.starred
                                ? "FavoriteStarFill"
                                : "FavoriteStar",
                        }}
                        onClick={() =>
                            toggleStarred(item)
                        }
                    />
                    <CommandBarButton
                        title={intl.get("article.loadFull")}
                        className={state.loadFull ? "active" : ""}
                        iconProps={{ iconName: "RawSource" }}
                        onClick={toggleFull}
                    />
                    <CommandBarButton
                        title={intl.get("article.loadWebpage")}
                        className={state.loadWebpage ? "active" : ""}
                        iconProps={{ iconName: "Globe" }}
                        onClick={toggleWebpage}
                    />
                    <CommandBarButton
                        title={intl.get("more")}
                        iconProps={{ iconName: "More" }}
                        menuIconProps={{ style: { display: "none" } }}
                        menuProps={moreMenuProps()}
                    />
                </Stack>
                <Stack horizontal horizontalAlign="end" style={{ width: 112 }}>
                    <CommandBarButton
                        title={intl.get("close")}
                        iconProps={{ iconName: "BackToWindow" }}
                        onClick={dismissItem}
                    />
                </Stack>
            </Stack>
            {(!state.loadFull || state.fullContent) && (
                <webview
                    id="article"
                    className={state.error ? "error" : ""}
                    key={
                        item._id +
                        (state.loadWebpage ? "_" : "") +
                        (state.loadFull ? "__" : "")
                    }
                    src={
                        state.loadWebpage
                            ? item.link
                            : articleView()
                    }
                    allowpopups={"true" as unknown as boolean}
                    webpreferences="contextIsolation,disableDialogs,autoplayPolicy=document-user-activation-required"
                    partition={state.loadWebpage ? "sandbox" : undefined}
                />
            )}
            {state.error && (
                <Stack
                    className="error-prompt"
                    verticalAlign="center"
                    horizontalAlign="center"
                    tokens={{ childrenGap: 12 }}>
                    <Icon iconName="HeartBroken" style={{ fontSize: 32 }} />
                    <Stack
                        horizontal
                        horizontalAlign="center"
                        tokens={{ childrenGap: 7 }}>
                        <small>{intl.get("article.error")}</small>
                        <small>
                            <Link onClick={webviewReload}>
                                {intl.get("article.reload")}
                            </Link>
                        </small>
                    </Stack>
                    <span style={{ fontSize: 11 }}>
                        {state.errorDescription}
                    </span>
                </Stack>
            )}
        </FocusZone>
    )
}

export default Article;
