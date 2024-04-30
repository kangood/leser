import * as React from "react"
import { ViewType } from "../../schema-types"
import CardsFeed from "./cards-feed"
import ListFeed from "./list-feed"

export type FeedProps = {
    viewType: ViewType;
    feedId: string;
}

export class Feed extends React.Component<FeedProps> {
    render() {
        switch (this.props.viewType) {
            case ViewType.Cards:
                return <CardsFeed {...this.props} />
            case ViewType.Magazine:
            case ViewType.Compact:
            case ViewType.List:
                return <ListFeed {...this.props} />
        }
    }
}
