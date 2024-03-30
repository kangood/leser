import React from 'react';
import { Icon } from '@fluentui/react';
import intl from 'react-intl-universal';
import { FilterType } from '@renderer/scripts/models/feed';

export const ContentFilter = ({ switchFilter }) => {
    return (
        <div className="content-filter">
            <a
                className="btn"
                onClick={ () => switchFilter(FilterType.StarredOnly)}
                title={intl.get("context.starredOnly")}>
                <Icon iconName="FavoriteStarFill" />
            </a>
            <a
                className="btn"
                onClick={ () => switchFilter(FilterType.UnreadOnly)}
                title={intl.get("context.unreadOnly")}>
                <Icon iconName="RadioBtnOn" />
            </a>
            <a
                className="btn"
                onClick={() => switchFilter(FilterType.Default)}
                title={intl.get("allArticles")}>
                <Icon iconName="ClearFilter" />
            </a>
        </div>
    );
};