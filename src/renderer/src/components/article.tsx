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
    RSSSource,
    SourceOpenTarget,
    SourceTextDirection,
} from "../scripts/models/source"
import { shareSubmenu } from "./context-menu"
import { platformCtrl, decodeFetchResponse } from "../scripts/utils"

const FONT_SIZE_OPTIONS = [12, 13, 14, 15, 16, 17, 18, 19, 20]

type ArticleProps = {
    item: RSSItem
    source: RSSSource
    locale: string
    shortcuts: (item: RSSItem, e: KeyboardEvent) => void
    dismiss: () => void
    offsetItem: (offset: number) => void
    toggleHasRead: (item: RSSItem) => void
    toggleStarred: (item: RSSItem) => void
    toggleHidden: (item: RSSItem) => void
    textMenu: (position: [number, number], text: string, url: string) => void
    imageMenu: (position: [number, number]) => void
    dismissContextMenu: () => void
    updateSourceTextDirection: (
        source: RSSSource,
        direction: SourceTextDirection
    ) => void
}

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

const Article: React.FC<ArticleProps> = (props) => {

    let webview: Electron.WebviewTag;
    const prevItemRef = React.useRef<RSSItem>(props.item);

    const [state, setState] = useState<ArticleState>({
        fontFamily: window.settings.getFont(),
        fontSize: window.settings.getFontSize(),
        loadWebpage: props.source.openTarget === SourceOpenTarget.Webpage,
        loadFull: props.source.openTarget === SourceOpenTarget.FullContent,
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
        if (props.source.openTarget === SourceOpenTarget.FullContent) {
            loadFull();
        }
    }, []);

    // 项目改变时加载
    useEffect(() => {
        if (prevItemRef.current._id !== props.item._id) {
            setState(prevState => ({
                ...prevState,
                loadWebpage: props.source.openTarget === SourceOpenTarget.Webpage,
                loadFull: props.source.openTarget === SourceOpenTarget.FullContent
            }));
            if (props.source.openTarget === SourceOpenTarget.FullContent) {
                loadFull();
            }
        }
        prevItemRef.current = props.item;
    }, [props.item]);

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
                    `#refocus div[data-iid="${props.item._id}"]`
                ) as HTMLElement
                // @ts-ignore
                if (card) card.scrollIntoViewIfNeeded()
            }
        }
        // 卸载
        return () => {
            let refocus = document.querySelector(
                `#refocus div[data-iid="${props.item._id}"]`
            ) as HTMLElement
            if (refocus) refocus.focus()
        };
    }, [props.item._id, state.loadWebpage, state.loadFull]);

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
            loadFull()
        }
    }

    const setFontSize = (size: number) => {
        window.settings.setFontSize(size)
        setState(prevState => ({ ...prevState, fontSize: size }));
    }
    const setFont = (font: string) => {
        window.settings.setFont(font)
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
        props.updateSourceTextDirection(props.source, direction)
    }

    const directionMenuProps = (): IContextualMenuProps => ({
        items: [
            {
                key: "LTR",
                text: intl.get("article.LTR"),
                iconProps: { iconName: "Forward" },
                canCheck: true,
                checked: props.source.textDir === SourceTextDirection.LTR,
                onClick: () =>
                    updateTextDirection(SourceTextDirection.LTR),
            },
            {
                key: "RTL",
                text: intl.get("article.RTL"),
                iconProps: { iconName: "Back" },
                canCheck: true,
                checked: props.source.textDir === SourceTextDirection.RTL,
                onClick: () =>
                    updateTextDirection(SourceTextDirection.RTL),
            },
            {
                key: "Vertical",
                text: intl.get("article.Vertical"),
                iconProps: { iconName: "Down" },
                canCheck: true,
                checked:
                    props.source.textDir === SourceTextDirection.Vertical,
                onClick: () =>
                    updateTextDirection(SourceTextDirection.Vertical),
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
                        props.item.link,
                        platformCtrl(e)
                    )
                },
            },
            {
                key: "copyURL",
                text: intl.get("context.copyURL"),
                iconProps: { iconName: "Link" },
                onClick: () => {
                    window.utils.writeClipboard(props.item.link)
                },
            },
            {
                key: "toggleHidden",
                text: props.item.hidden
                    ? intl.get("article.unhide")
                    : intl.get("article.hide"),
                iconProps: {
                    iconName: props.item.hidden ? "View" : "Hide3",
                },
                onClick: () => {
                    props.toggleHidden(props.item)
                },
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
            ...shareSubmenu(props.item),
        ],
    })

    const contextMenuHandler = (pos: [number, number], text: string, url: string) => {
        if (pos) {
            if (text || url) props.textMenu(pos, text, url)
            else props.imageMenu(pos)
        } else {
            props.dismissContextMenu()
        }
    }

    const keyDownHandler = (input: Electron.Input) => {
        if (input.type === "keyDown") {
            switch (input.key) {
                case "Escape":
                    props.dismiss()
                    break
                case "ArrowLeft":
                case "ArrowRight":
                    props.offsetItem(input.key === "ArrowLeft" ? -1 : 1)
                    break
                case "l":
                case "L":
                    toggleWebpage()
                    break
                case "w":
                case "W":
                    toggleFull()
                    break
                case "H":
                case "h":
                    if (!input.meta) props.toggleHidden(props.item)
                    break
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
                    })
                    props.shortcuts(props.item, keyboardEvent)
                    document.dispatchEvent(keyboardEvent)
                    break
            }
        }
    }

    const toggleWebpage = () => {
        if (state.loadWebpage) {
            setState(prevState => ({ ...prevState, loadWebpage: false }));
        } else if (
            props.item.link.startsWith("https://") ||
            props.item.link.startsWith("http://")
        ) {
            setState(prevState => ({ ...prevState, loadWebpage: true, loadFull: false }));
        }
    }

    const toggleFull = () => {
        if (state.loadFull) {
            setState(prevState => ({ ...prevState, loadFull: false }));
        } else if (
            props.item.link.startsWith("https://") ||
            props.item.link.startsWith("http://")
        ) {
            setState(prevState => ({ ...prevState, loadFull: true, loadWebpage: false }));
            loadFull()
        }
    }
    const loadFull = async () => {
        setState(prevState => ({ ...prevState, fullContent: "", loaded: false, error: false }));
        const link = props.item.link;
        try {
            const result = await fetch(link);
            if (!result || !result.ok) {
                throw new Error();
            }
            const html = await decodeFetchResponse(result, true);
            if (link === props.item.link) {
                setState(prevState => ({ ...prevState, fullContent: html }));
            }
        } catch {
            if (link === props.item.link) {
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
                : props.item.content
        )
        const h = encodeURIComponent(
            renderToString(
                <>
                    <p className="title">{props.item.title}</p>
                    <p className="date">
                        {props.item.date.toLocaleString(
                            props.locale,
                            { hour12: !props.locale.startsWith("zh") }
                        )}
                    </p>
                    <article></article>
                </>
            )
        )
        return `article/article.html?a=${a}&h=${h}&f=${encodeURIComponent(
            state.fontFamily
        )}&s=${state.fontSize}&d=${props.source.textDir}&u=${
            props.item.link
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
                                props.source.iconurl && (
                                    <img
                                        className="favicon"
                                        src={props.source.iconurl}
                                    />
                                )
                            ) : (
                                <Spinner size={1} />
                            )}
                            {props.source.name}
                            {props.item.creator && (
                                <span className="creator">
                                    {props.item.creator}
                                </span>
                            )}
                        </span>
                    </Stack.Item>
                    <CommandBarButton
                        title={
                            props.item.hasRead
                                ? intl.get("article.markUnread")
                                : intl.get("article.markRead")
                        }
                        iconProps={
                            props.item.hasRead
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
                            props.toggleHasRead(props.item)
                        }
                    />
                    <CommandBarButton
                        title={
                            props.item.starred
                                ? intl.get("article.unstar")
                                : intl.get("article.star")
                        }
                        iconProps={{
                            iconName: props.item.starred
                                ? "FavoriteStarFill"
                                : "FavoriteStar",
                        }}
                        onClick={() =>
                            props.toggleStarred(props.item)
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
                        onClick={props.dismiss}
                    />
                </Stack>
            </Stack>
            {(!state.loadFull || state.fullContent) && (
                <webview
                    id="article"
                    className={state.error ? "error" : ""}
                    key={
                        props.item._id +
                        (state.loadWebpage ? "_" : "") +
                        (state.loadFull ? "__" : "")
                    }
                    src={
                        state.loadWebpage
                            ? props.item.link
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

export default Article
