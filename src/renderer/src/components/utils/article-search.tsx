import React, { useRef, useState, useEffect } from "react";
import intl from "react-intl-universal";
import { connect } from "react-redux";
import { RootState } from "../../scripts/reducer";
import { SearchBox, ISearchBox, Async } from "@fluentui/react";
import { AppDispatch, validateRegex } from "../../scripts/utils";
import { performSearch, toggleSearch } from "../../scripts/models/page";

type SearchProps = {
    searchOn: boolean; // 搜索开关状态
    initQuery: string; // 初始搜索查询
    dispatch: AppDispatch; // Redux 分发函数
};

const ArticleSearch: React.FC<SearchProps> = ({ searchOn, initQuery, dispatch }) => {
    const [query, setQuery] = useState<string>(initQuery); // 使用状态来存储搜索查询
    const debouncedSearch = useRef(new Async().debounce((q: string) => {
        const regex = validateRegex(q);
        if (regex !== null) dispatch(performSearch(q));
    }, 200)); // 存储防抖函数以避免频繁触发搜索

    const inputRef = useRef<ISearchBox>(null); // 获取搜索框 DOM 元素

    // 当搜索查询变化时触发的回调函数
    const onSearchChange = (ev?: React.ChangeEvent<HTMLInputElement>, newValue?: string) => {
        if (newValue !== undefined) {
            debouncedSearch.current(newValue);
            setQuery(newValue);
        }
    };

    // 离开焦点之后没有内容的时候，就关闭搜索
    const onBlurHandle = () => {
        if (query?.trim() === '') {
            dispatch(toggleSearch());
        }
    }

    // 当搜索开关状态或初始搜索查询变化时执行的副作用
    useEffect(() => {
        if (searchOn) {
            setQuery(initQuery);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [searchOn, initQuery]);

    // 渲染搜索框组件
    return searchOn ? (
        <SearchBox
            componentRef={inputRef}
            className="article-search"
            placeholder={intl.get("search")} // 国际化搜索占位符
            value={query}
            onChange={onSearchChange}
            onBlur={onBlurHandle}
            onClear={() => dispatch(toggleSearch())}
        />
    ) : null;
};

// 从 Redux 状态中获取搜索开关状态和初始搜索查询
const getSearchProps = (state: RootState) => ({
    searchOn: state.page.searchOn,
    initQuery: state.page.filter.search,
});

// 将 Redux 状态和分发函数连接到组件上
export default connect(getSearchProps)(ArticleSearch);
