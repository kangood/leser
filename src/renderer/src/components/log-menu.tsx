import * as React from "react"
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

type LogMenuProps = {
    display: boolean
    logs: AppLog[]
    close: () => void
    showItem: (iid: number) => void
}

function getLogIcon(log: AppLog) {
    switch (log.type) {
        case AppLogType.Info:
            return "Info"
        case AppLogType.Article:
            return "KnowledgeArticle"
        default:
            return "Warning"
    }
}

const LogMenu: React.FC<LogMenuProps> = (props) => {

    const activityItems = () => {
        return props.logs
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
        props.close()
        props.showItem(log.iid)
    }

    return (
        props.display && (
            <Callout
                target="#log-toggle"
                role="log-menu"
                directionalHint={DirectionalHint.bottomCenter}
                calloutWidth={320}
                calloutMaxHeight={240}
                onDismiss={props.close}>
                {props.logs.length == 0 ? (
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
