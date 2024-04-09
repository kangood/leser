import * as React from "react"
import { CardProps, bindCardEventsToProps } from "./card"
import CardInfo from "./info"
import Highlights from "./highlights"
import { ViewConfigs } from "../../schema-types"
import { SourceTextDirection } from "../../scripts/models/source"

const className = (props: CardProps) => {
    let cn = ["card", "list-card"]
    if (props.item.hidden) cn.push("hidden")
    if (props.selected) cn.push("selected")
    if (props.viewConfigs & ViewConfigs.FadeRead && props.item.hasRead)
        cn.push("read")
    if (props.source.textDir === SourceTextDirection.RTL) cn.push("rtl")
    return cn.join(" ")
}

const ListCard: React.FunctionComponent<CardProps> = props => {
    // 解决 wechat2rss 的 bug, 网站地址返回不对的时候，封面图的 URL 某些情况下可能会多了个 `https//`
    let thumbUrl = props.item.thumb;
    if (thumbUrl.includes('https://https//')) {
        thumbUrl = thumbUrl.replace('https://https//', 'https://');
    }
    return (
        <div
            className={className(props)}
            {...bindCardEventsToProps(props)}
            data-iid={props.item._id}
            data-is-focusable
        >
            <div className="data">
                <CardInfo source={props.source} item={props.item} />
            </div>
            <div className="bottom">
                <div className="content" style={{width: (thumbUrl && props.viewConfigs & ViewConfigs.ShowCover) ? 'calc(100% - 90px)' : '100%'}}>
                    <h3 className="title">
                        <Highlights
                            text={props.item.title}
                            filter={props.filter}
                            title
                        />
                    </h3>
                    {Boolean(props.viewConfigs & ViewConfigs.ShowSnippet) && (
                        <p className="snippet">
                            <Highlights
                                text={props.item.snippet}
                                filter={props.filter}
                            />
                        </p>
                    )}
                </div>
                {thumbUrl && props.viewConfigs & ViewConfigs.ShowCover ? (
                    <div className="cover">
                        <img src={thumbUrl} />
                    </div>
                ) : null}
            </div>
        </div>
    )
}

export default ListCard
