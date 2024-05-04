import React, { useState } from "react"
import intl from "react-intl-universal"
import { SourceState, RSSSource } from "../../scripts/models/source"
import {
    Stack,
    Label,
    Dropdown,
    IDropdownOption,
    TextField,
    PrimaryButton,
    Icon,
    DropdownMenuItemType,
    DefaultButton,
    DetailsList,
    IColumn,
    CommandBar,
    ICommandBarItemProps,
    Selection,
    SelectionMode,
    MarqueeSelection,
    IDragDropEvents,
    Link,
    IIconProps,
} from "@fluentui/react"
import { SourceRule, RuleActions } from "../../scripts/models/rule"
import { FilterType } from "../../scripts/models/feed"
import { MyParserItem, validateRegex } from "../../scripts/utils"
import { RSSItem } from "../../scripts/models/item"

const actionKeyMap = {
    "r-true": "article.markRead",
    "r-false": "article.markUnread",
    "s-true": "article.star",
    "s-false": "article.unstar",
    "h-true": "article.hide",
    "h-false": "article.unhide",
    "n-true": "article.notify",
    "n-false": "article.dontNotify",
}

type RulesTabProps = {
    sources: SourceState
    updateSourceRules: (source: RSSSource, rules: SourceRule[]) => void
}

type RulesTabState = {
    sid: string
    selectedRules: number[]
    editIndex: number
    regex: string
    searchType: number
    caseSensitive: boolean
    match: boolean
    actionKeys: string[]
    mockTitle: string
    mockCreator: string
    mockContent: string
    mockResult: string
}

const RulesTab: React.FC<RulesTabProps> = (props) => {
    const [rulesDraggedItem, setRulesDraggedItem] = useState<SourceRule>();
    const [rulesDraggedIndex, setRulesDraggedIndex] = useState<number>(-1);

    const [state, setState] = useState<RulesTabState>({
        sid: null,
        selectedRules: [],
        editIndex: -1,
        regex: "",
        searchType: 0,
        caseSensitive: false,
        match: true,
        actionKeys: [],
        mockTitle: "",
        mockCreator: "",
        mockContent: "",
        mockResult: "",
    });

    const rulesSelection = new Selection({
        getKey: (_, i) => i,
        onSelectionChanged: () => {
            setState(prevState => ({ ...prevState, selectedRules: rulesSelection.getSelectedIndices() }))
        },
    })

    const rulesDragDropEvents = (): IDragDropEvents => ({
        canDrop: () => true,
        canDrag: () => true,
        onDrop: (item?: SourceRule) => {
            if (rulesDraggedItem) {
                reorderRules(item)
            }
        },
        onDragStart: (item?: SourceRule, itemIndex?: number) => {
            setRulesDraggedItem(item);
            setRulesDraggedIndex(itemIndex!);
        },
        onDragEnd: () => {
            setRulesDraggedItem(undefined);
            setRulesDraggedIndex(-1);
        },
    })

    const reorderRules = (item: SourceRule) => {
        let rules = getSourceRules()
        let draggedItems = rulesSelection.isIndexSelected(
            rulesDraggedIndex
        )
            ? (rulesSelection.getSelection() as SourceRule[])
            : [rulesDraggedItem]

        let insertIndex = rules.indexOf(item)
        let items = rules.filter(r => !draggedItems.includes(r))

        items.splice(insertIndex, 0, ...draggedItems)
        rulesSelection.setAllSelected(false)
        let source = props.sources[parseInt(state.sid)]
        props.updateSourceRules(source, items)
    }

    const initRuleEdit = (rule: SourceRule = null) => {
        let searchType = 0
        if (rule) {
            if (rule.filter.type & FilterType.FullSearch) searchType = 1
            else if (rule.filter.type & FilterType.CreatorSearch) searchType = 2
        }
        setState(prevState => ({
            ...prevState,
            regex: rule ? rule.filter.search : "",
            searchType: searchType,
            caseSensitive: rule
                ? !(rule.filter.type & FilterType.CaseInsensitive)
                : false,
            match: rule ? rule.match : true,
            actionKeys: rule ? RuleActions.toKeys(rule.actions) : [],
        }))
    }

    const getSourceRules = () => props.sources[parseInt(state.sid)].rules;

    const ruleColumns = (): IColumn[] => [
        {
            isRowHeader: true,
            key: "regex",
            name: intl.get("rules.regex"),
            minWidth: 100,
            maxWidth: 200,
            onRender: (rule: SourceRule) => rule.filter.search,
        },
        {
            key: "actions",
            name: intl.get("rules.action"),
            minWidth: 100,
            onRender: (rule: SourceRule) =>
                RuleActions.toKeys(rule.actions)
                    .map(k => intl.get(actionKeyMap[k]))
                    .join(", "),
        },
    ]

    const handleInputChange = event => {
        const name = event.target.name as "regex"
        setState(prevState => ({ ...prevState, [name]: event.target.value }))
    }

    const sourceOptions = (): IDropdownOption[] =>
        Object.entries(props.sources).map(([sid, s]) => ({
            key: sid,
            text: s.name,
            data: { icon: s.iconurl },
        }))
    const onRenderSourceOption = (option: IDropdownOption) => (
        <div>
            {option.data && option.data.icon && (
                <img src={option.data.icon} className="favicon dropdown" />
            )}
            <span>{option.text}</span>
        </div>
    )
    const onRenderSourceTitle = (options: IDropdownOption[]) => {
        return onRenderSourceOption(options[0])
    }
    const onSourceOptionChange = (_, item: IDropdownOption) => {
        initRuleEdit()
        rulesSelection.setAllSelected(false)
        setState(prevState => ({
            ...prevState,
            sid: item.key as string,
            selectedRules: [],
            editIndex: -1,
            mockTitle: "",
            mockCreator: "",
            mockContent: "",
            mockResult: "",
        }))
    }

    const searchOptions = (): IDropdownOption[] => [
        { key: 0, text: intl.get("rules.title") },
        { key: 1, text: intl.get("rules.fullSearch") },
        { key: 2, text: intl.get("rules.creator") },
    ]
    const onSearchOptionChange = (_, item: IDropdownOption) => {
        setState(prevState => ({ ...prevState, searchType: item.key as number }))
    }

    const matchOptions = (): IDropdownOption[] => [
        { key: 1, text: intl.get("rules.match") },
        { key: 0, text: intl.get("rules.notMatch") },
    ]
    const onMatchOptionChange = (_, item: IDropdownOption) => {
        setState(prevState => ({ ...prevState, match: Boolean(item.key) }))
    }

    const actionOptions = (): IDropdownOption[] =>
        [
            ...Object.entries(actionKeyMap).map(([k, t], i) => {
                if (k.includes("-false")) {
                    return [
                        { key: k, text: intl.get(t) },
                        {
                            key: i,
                            text: "-",
                            itemType: DropdownMenuItemType.Divider,
                        },
                    ]
                } else {
                    return [{ key: k, text: intl.get(t) }]
                }
            }),
        ].flat(1)

    const onActionOptionChange = (_, item: IDropdownOption) => {
        if (item.selected) {
            setState(prevState => {
                let [a, f] = (item.key as string).split("-")
                let keys = prevState.actionKeys.filter(
                    k => !k.startsWith(`${a}-`)
                )
                keys.push(item.key as string)
                return { ...prevState, actionKeys: keys }
            })
        } else {
            setState(prevState => ({
                ...prevState,
                actionKeys: prevState.actionKeys.filter(k => k !== item.key),
            }))
        }
    }

    const validateRegexField = (value: string) => {
        if (value.length === 0) return intl.get("emptyField")
        else if (validateRegex(value) === null)
            return intl.get("rules.badRegex")
        else return ""
    }

    const saveRule = () => {
        let filterType = FilterType.Default | FilterType.ShowHidden
        if (!state.caseSensitive) filterType |= FilterType.CaseInsensitive
        if (state.searchType === 1) filterType |= FilterType.FullSearch
        else if (state.searchType === 2)
            filterType |= FilterType.CreatorSearch
        let rule = new SourceRule(
            state.regex,
            state.actionKeys,
            filterType,
            state.match
        )
        let source = props.sources[parseInt(state.sid)]
        let rules = source.rules ? [...source.rules] : []
        if (state.editIndex === -1) {
            rules.push(rule)
        } else {
            rules.splice(state.editIndex, 1, rule)
        }
        props.updateSourceRules(source, rules)
        setState(prevState => ({ ...prevState, editIndex: -1 }))
        initRuleEdit()
    }
    const newRule = () => {
        initRuleEdit()
        setState(prevState => ({ ...prevState, editIndex: getSourceRules().length }))
    }
    const editRule = (rule: SourceRule, index: number) => {
        initRuleEdit(rule)
        setState(prevState => ({ ...prevState, editIndex: index }))
    }
    const deleteRules = () => {
        let rules = getSourceRules()
        for (let i of state.selectedRules) rules[i] = null
        let source = props.sources[parseInt(state.sid)]
        props.updateSourceRules(
            source,
            rules.filter(r => r !== null)
        )
        initRuleEdit()
    }

    const commandBarItems = (): ICommandBarItemProps[] => [
        {
            key: "new",
            text: intl.get("rules.new"),
            iconProps: { iconName: "Add" },
            onClick: newRule,
        },
    ]
    const commandBarFarItems = (): ICommandBarItemProps[] => {
        let items = []
        if (state.selectedRules.length === 1) {
            let index = state.selectedRules[0]
            items.push({
                key: "edit",
                text: intl.get("edit"),
                iconProps: { iconName: "Edit" },
                onClick: () =>
                    editRule(getSourceRules()[index], index),
            })
        }
        if (state.selectedRules.length > 0) {
            items.push({
                key: "del",
                text: intl.get("delete"),
                iconProps: { iconName: "Delete", style: { color: "#d13438" } },
                onClick: deleteRules,
            })
        }
        return items
    }

    const testMockItem = () => {
        let parsed = { title: state.mockTitle }
        let source = props.sources[parseInt(state.sid)]
        let item = new RSSItem(parsed as MyParserItem, source)
        item.snippet = state.mockContent
        item.creator = state.mockCreator
        SourceRule.applyAll(getSourceRules(), item)
        let result = []
        result.push(
            intl.get(item.hasRead ? "article.markRead" : "article.markUnread")
        )
        if (item.starred) result.push(intl.get("article.star"))
        if (item.hidden) result.push(intl.get("article.hide"))
        if (item.notify) result.push(intl.get("article.notify"))
        setState(prevState => ({ ...prevState, mockResult: result.join(", ") }))
    }

    const toggleCaseSensitivity = () => {
        setState(prevState => ({ ...prevState, caseSensitive: !state.caseSensitive }))
    }
    const regexCaseIconProps = (): IIconProps => ({
        title: intl.get("context.caseSensitive"),
        children: "Aa",
        style: {
            fontSize: 12,
            fontStyle: "normal",
            cursor: "pointer",
            pointerEvents: "unset",
            color: state.caseSensitive
                ? "var(--black)"
                : "var(--neutralTertiary)",
            textDecoration: state.caseSensitive ? "underline" : "",
        },
        onClick: toggleCaseSensitivity,
    })

    return (
        <div className="tab-body">
            <Stack horizontal tokens={{ childrenGap: 16 }}>
                <Stack.Item>
                    <Label>{intl.get("rules.source")}</Label>
                </Stack.Item>
                <Stack.Item grow>
                    <Dropdown
                        placeholder={intl.get("rules.selectSource")}
                        options={sourceOptions()}
                        onRenderOption={onRenderSourceOption}
                        onRenderTitle={onRenderSourceTitle}
                        selectedKey={state.sid}
                        onChange={onSourceOptionChange}
                    />
                </Stack.Item>
            </Stack>

            {state.sid ? (
                state.editIndex > -1 ||
                !getSourceRules() ||
                getSourceRules().length === 0 ? (
                    <>
                        <Label>
                            {intl.get(
                                state.editIndex >= 0 &&
                                    state.editIndex <
                                        getSourceRules().length
                                    ? "edit"
                                    : "rules.new"
                            )}
                        </Label>
                        <Stack horizontal>
                            <Stack.Item>
                                <Label>{intl.get("rules.if")}</Label>
                            </Stack.Item>
                            <Stack.Item>
                                <Dropdown
                                    options={searchOptions()}
                                    selectedKey={state.searchType}
                                    onChange={onSearchOptionChange}
                                    style={{ width: 140 }}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <Dropdown
                                    options={matchOptions()}
                                    selectedKey={state.match ? 1 : 0}
                                    onChange={onMatchOptionChange}
                                    style={{ width: 130 }}
                                />
                            </Stack.Item>
                            <Stack.Item grow>
                                <TextField
                                    name="regex"
                                    placeholder={intl.get("rules.regex")}
                                    iconProps={regexCaseIconProps()}
                                    value={state.regex}
                                    onGetErrorMessage={validateRegexField}
                                    validateOnLoad={false}
                                    onChange={handleInputChange}
                                />
                            </Stack.Item>
                        </Stack>
                        <Stack horizontal>
                            <Stack.Item>
                                <Label>{intl.get("rules.then")}</Label>
                            </Stack.Item>
                            <Stack.Item grow>
                                <Dropdown
                                    multiSelect
                                    placeholder={intl.get("rules.selectAction")}
                                    options={actionOptions()}
                                    selectedKeys={state.actionKeys}
                                    onChange={onActionOptionChange}
                                    onRenderCaretDown={() => (
                                        <Icon iconName="CirclePlus" />
                                    )}
                                />
                            </Stack.Item>
                        </Stack>
                        <Stack horizontal>
                            <Stack.Item>
                                <PrimaryButton
                                    disabled={
                                        state.regex.length == 0 ||
                                        validateRegex(state.regex) ===
                                            null ||
                                        state.actionKeys.length == 0
                                    }
                                    text={intl.get("confirm")}
                                    onClick={saveRule}
                                />
                            </Stack.Item>
                            {state.editIndex > -1 && (
                                <Stack.Item>
                                    <DefaultButton
                                        text={intl.get("cancel")}
                                        onClick={() =>
                                            setState(prevState => ({ ...prevState, editIndex: -1 }))
                                        }
                                    />
                                </Stack.Item>
                            )}
                        </Stack>
                    </>
                ) : (
                    <>
                        <CommandBar
                            items={commandBarItems()}
                            farItems={commandBarFarItems()}
                        />
                        <MarqueeSelection
                            selection={rulesSelection}
                            isDraggingConstrainedToRoot>
                            <DetailsList
                                compact
                                columns={ruleColumns()}
                                items={getSourceRules()}
                                onItemInvoked={editRule}
                                dragDropEvents={rulesDragDropEvents()}
                                setKey="selected"
                                selection={rulesSelection}
                                selectionMode={SelectionMode.multiple}
                            />
                        </MarqueeSelection>
                        <span className="settings-hint up">
                            {intl.get("rules.hint")}
                        </span>

                        <Label>{intl.get("rules.test")}</Label>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <TextField
                                    name="mockTitle"
                                    placeholder={intl.get("rules.title")}
                                    value={state.mockTitle}
                                    onChange={handleInputChange}
                                />
                            </Stack.Item>
                            <Stack.Item grow>
                                <TextField
                                    name="mockCreator"
                                    placeholder={intl.get("rules.creator")}
                                    value={state.mockCreator}
                                    onChange={handleInputChange}
                                />
                            </Stack.Item>
                        </Stack>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <TextField
                                    name="mockContent"
                                    placeholder={intl.get("rules.content")}
                                    value={state.mockContent}
                                    onChange={handleInputChange}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <PrimaryButton
                                    text={intl.get("confirm")}
                                    onClick={testMockItem}
                                />
                            </Stack.Item>
                        </Stack>
                        <span className="settings-hint up">
                            {state.mockResult}
                        </span>
                    </>
                )
            ) : (
                <Stack horizontalAlign="center" style={{ marginTop: 64 }}>
                    <Stack
                        className="settings-rules-icons"
                        horizontal
                        tokens={{ childrenGap: 12 }}>
                        <Icon iconName="Filter" />
                        <Icon iconName="FavoriteStar" />
                        <Icon iconName="Ringer" />
                        <Icon iconName="More" />
                    </Stack>
                    <span className="settings-hint">
                        {intl.get("rules.intro")}
                        <Link
                            onClick={() =>
                                window.utils.openExternal(
                                    "https://github.com/yang991178/fluent-reader/wiki/Support#rules"
                                )
                            }
                            style={{ marginLeft: 6 }}>
                            {intl.get("rules.help")}
                        </Link>
                    </span>
                </Stack>
            )}
        </div>
    )
}

export default RulesTab
