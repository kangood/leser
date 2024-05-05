import React from "react"
import intl from "react-intl-universal"
import {
    Callout,
    ActivityItem,
    Icon,
    DirectionalHint,
    Link,
} from "@fluentui/react"
import { AppLog, AppLogType } from "../scripts/models/app"
import Time from "./utils/time"
import { useAppActions, useAppLogMenu } from "@renderer/scripts/store/app-store"
import { usePageActions } from "@renderer/scripts/store/page-store"

const LogMenu: React.FC = () => {

    const appLogMenu = useAppLogMenu();
    const { toggleLogMenu } = useAppActions();
    const { showItemFromId } = usePageActions();

    const getLogIcon = (log: AppLog) => {
        switch (log.type) {
            case AppLogType.Info:
                return "Info"
            case AppLogType.Article:
                return "KnowledgeArticle"
            default:
                return "Warning"
        }
    }

    const activityItems = () => {
        return appLogMenu.logs
            .map((l, i) => ({
                key: i,
                activityDescription: l.iid ? (
                    <b>
                        <Link onClick={() => handleArticleClick(l)}>
                            {l.title}
                        </Link>
                    </b>
                ) : (
                    <b>{l.title}</b>
                ),
                comments: l.details,
                activityIcon: <Icon iconName={getLogIcon(l)} />,
                timeStamp: <Time date={l.time} />,
            }))
            .reverse();
    }
    const handleArticleClick = (log: AppLog) => {
        toggleLogMenu();
        showItemFromId(log.iid);
    }

    return (
        appLogMenu.display && (
            <Callout
                target="#log-toggle"
                role="log-menu"
                directionalHint={DirectionalHint.bottomCenter}
                calloutWidth={320}
                calloutMaxHeight={240}
                onDismiss={toggleLogMenu}>
                {appLogMenu.logs.length == 0 ? (
                    <p style={{ textAlign: "center" }}>
                        {intl.get("log.empty")}
                    </p>
                ) : (
                    activityItems().map(item => (
                        <ActivityItem
                            {...item}
                            key={item.key}
                            style={{ margin: 12 }}
                        />
                    ))
                )}
            </Callout>
        )
    )
}

export default LogMenu
