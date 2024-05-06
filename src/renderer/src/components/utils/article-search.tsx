import React, { useRef, useState, useEffect } from "react";
import intl from "react-intl-universal";
import { SearchBox, ISearchBox, Async } from "@fluentui/react";
import { validateRegex } from "../../scripts/utils";
import { usePageActions, usePageFilter, usePageSearchOn } from "@renderer/scripts/store/page-store";

const ArticleSearch: React.FC = () => {
    // zustand store
    const initQuery = usePageFilter().search;
    const pageSearchOn = usePageSearchOn();
    const { performSearch, toggleSearch } = usePageActions();

    const [query, setQuery] = useState<string>(initQuery); // 使用状态来存储搜索查询
    const debouncedSearch = useRef(new Async().debounce((q: string) => {
        const regex = validateRegex(q);
        if (regex !== null) {
            performSearch(q);
        }
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
            toggleSearch();
        }
    }

    // 当搜索开关状态或初始搜索查询变化时执行的副作用
    useEffect(() => {
        if (pageSearchOn) {
            setQuery(initQuery);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    }, [pageSearchOn, initQuery]);

    // 渲染搜索框组件
    return pageSearchOn ? (
        <SearchBox
            componentRef={inputRef}
            className="article-search"
            placeholder={intl.get("search")} // 国际化搜索占位符
            value={query}
            onChange={onSearchChange}
            onBlur={onBlurHandle}
            onClear={() => toggleSearch}
        />
    ) : null;
};

export default ArticleSearch;
