import React from 'react';
import { Icon } from '@fluentui/react';
import intl from 'react-intl-universal';
import { FilterType } from '@renderer/scripts/models/feed';

export const ContentFilter = ({ filter, switchFilter }) => {
    // 判断当前是否被选中
    const checked = (filterType: FilterType) => {
        return (filter & ~FilterType.Toggles) == filterType;
    }

    return (
        <div className="content-filter">
            <span className="seperator"></span>
            <a
                className={`btn undragging ${checked(FilterType.StarredOnly) ? 'selected' : ''}`}
                onClick={() => switchFilter(FilterType.StarredOnly)}
                title={intl.get("context.starredOnly")}
            >
                <Icon iconName="FavoriteStarFill" />
                {checked(FilterType.StarredOnly) && <span>星标</span>}
            </a>
            <a
                className={`btn undragging ${checked(FilterType.UnreadOnly) ? 'selected' : ''}`}
                onClick={() => switchFilter(FilterType.UnreadOnly)}
                title={intl.get("context.unreadOnly")}
            >
                <Icon iconName="RadioBtnOn" />
                {checked(FilterType.UnreadOnly) && <span>未读</span>}
            </a>
            <a
                className={`btn undragging ${checked(FilterType.Default) ? 'selected' : ''}`}
                onClick={() => switchFilter(FilterType.Default)}
                title={intl.get("allArticles")}
            >
                <Icon iconName="ClearFilter" />
                {checked(FilterType.Default) && <span>全部</span>}
            </a>
        </div>
    );
};
