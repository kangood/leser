import React, { useState } from 'react';
import intl from "react-intl-universal";
import { SourceGroup } from "../../schema-types";
import { SourceState, RSSSource } from "../../scripts/models/source";
import {
    IColumn,
    Selection,
    SelectionMode,
    DetailsList,
    Label,
    Stack,
    TextField,
    PrimaryButton,
    DefaultButton,
    Dropdown,
    IDropdownOption,
    CommandBarButton,
    MarqueeSelection,
    MessageBar,
    MessageBarType,
    MessageBarButton,
    IDragDropEvents,
} from "@fluentui/react";
import DangerButton from "../utils/danger-button";

type GroupsTabProps = {
    sources: SourceState;
    groups: SourceGroup[];
    serviceOn: boolean;
    createGroup: (name: string) => void;
    updateGroup: (group: SourceGroup) => void;
    addToGroup: (groupIndex: number, sid: number) => void;
    deleteGroup: (groupIndex: number) => void;
    removeFromGroup: (groupIndex: number, sids: number[]) => void;
    reorderGroups: (groups: SourceGroup[]) => void;
    importGroups: () => Promise<void>;
};

const GroupsTab: React.FC<GroupsTabProps> = (props) => {
    const [editGroupName, setEditGroupName] = useState<string>("");
    const [newGroupName, setNewGroupName] = useState<string>("");
    const [selectedGroup, setSelectedGroup] = useState<SourceGroup>(null);
    const [selectedSources, setSelectedSources] = useState<RSSSource[]>(null);
    const [dropdownIndex, setDropdownIndex] = useState<number>(null);
    const [manageGroup, setManageGroup] = useState<boolean>(false);

    const [groupDraggedItem, setGroupDraggedItem] = useState<SourceGroup>();
    const [groupDraggedIndex, setGroupDraggedIndex] = useState<number>(-1);
    const [sourcesDraggedItem, setSourcesDraggedItem] = useState<RSSSource>();
    const [sourcesDraggedIndex, setSourcesDraggedIndex] = useState<number>(-1);

    const groupSelection = new Selection({
        getKey: g => (g as SourceGroup).index,
        onSelectionChanged: () => {
            let g = groupSelection.getSelectedCount()
                ? (groupSelection.getSelection()[0] as SourceGroup)
                : null;
            setSelectedGroup(g);
            setEditGroupName(g?.isMultiple ? g.name : "");
        },
    })

    const sourcesSelection = new Selection({
        getKey: s => (s as RSSSource).sid,
        onSelectionChanged: () => {
            let sources = sourcesSelection.getSelectedCount()
                ? (sourcesSelection.getSelection() as RSSSource[])
                : null;
            setSelectedSources(sources);
        },
    })

    const groupColumns = (): IColumn[] => [
        {
            key: "type",
            name: intl.get("groups.type"),
            minWidth: 40,
            maxWidth: 40,
            data: "string",
            onRender: (g: SourceGroup) => (
                <>
                    {g.isMultiple
                        ? intl.get("groups.group")
                        : intl.get("groups.source")}
                </>
            ),
        },
        {
            key: "capacity",
            name: intl.get("groups.capacity"),
            minWidth: 40,
            maxWidth: 60,
            data: "string",
            onRender: (g: SourceGroup) => (
                <>{g.isMultiple ? g.sids.length : ""}</>
            ),
        },
        {
            key: "name",
            name: intl.get("name"),
            minWidth: 200,
            data: "string",
            isRowHeader: true,
            onRender: (g: SourceGroup) => (
                <>
                    {g.isMultiple ? g.name : props.sources[g.sids[0]].name}
                </>
            ),
        },
    ]

    const sourceColumns: IColumn[] = [
        {
            key: "favicon",
            name: intl.get("icon"),
            fieldName: "name",
            isIconOnly: true,
            iconName: "ImagePixel",
            minWidth: 16,
            maxWidth: 16,
            onRender: (s: RSSSource) =>
                s.iconurl && <img src={s.iconurl} className="favicon" />,
        },
        {
            key: "name",
            name: intl.get("name"),
            fieldName: "name",
            minWidth: 200,
            data: "string",
            isRowHeader: true,
        },
        {
            key: "url",
            name: "URL",
            fieldName: "url",
            minWidth: 280,
            data: "string",
        },
    ]

    const groupDragDropEvents = (): IDragDropEvents => ({
        canDrop: () => true,
        canDrag: () => true,
        onDrop: (item?: SourceGroup) => {
            if (groupDraggedItem) {
                reorderGroups(item);
            }
        },
        onDragStart: (item?: SourceGroup, itemIndex?: number) => {
            setGroupDraggedItem(item);
            setGroupDraggedIndex(itemIndex!);
        },
        onDragEnd: () => {
            setGroupDraggedItem(undefined);
            setGroupDraggedIndex(-1);
        },
    })

    const sourcesDragDropEvents = (): IDragDropEvents => ({
        canDrop: () => true,
        canDrag: () => true,
        onDrop: (item?: RSSSource) => {
            if (sourcesDraggedItem) {
                reorderSources(item);
            }
        },
        onDragStart: (item?: RSSSource, itemIndex?: number) => {
            setSourcesDraggedItem(item);
            setSourcesDraggedIndex(itemIndex!);
        },
        onDragEnd: () => {
            setSourcesDraggedItem(undefined);
            setSourcesDraggedIndex(-1);
        },
    })

    const reorderGroups = (item: SourceGroup) => {
        let draggedItem = groupSelection.isIndexSelected(groupDraggedIndex)
            ? (groupSelection.getSelection()[0] as SourceGroup)
            : groupDraggedItem!

        let insertIndex = item.index;
        let groups = props.groups.filter(g => g.index != draggedItem.index);

        groups.splice(insertIndex, 0, draggedItem);
        groupSelection.setAllSelected(false);
        props.reorderGroups(groups);
    }

    const reorderSources = (item: RSSSource) => {
        let draggedItems = sourcesSelection.isIndexSelected(sourcesDraggedIndex)
            ? (sourcesSelection.getSelection() as RSSSource[]).map(
                  s => s.sid
              )
            : [sourcesDraggedItem!.sid];

        let insertIndex = selectedGroup.sids.indexOf(item.sid);
        let items = selectedGroup.sids.filter(
            sid => !draggedItems.includes(sid)
        );

        items.splice(insertIndex, 0, ...draggedItems);

        let group = { ...selectedGroup, sids: items };
        props.updateGroup(group);
        setSelectedGroup(group);
    }

    const manageGroupHandle = (g: SourceGroup) => {
        if (g.isMultiple) {
            setSelectedGroup(g);
            setEditGroupName(g?.isMultiple ? g.name : "");
            setManageGroup(true);
        }
    }

    const dropdownOptions = () =>
        props.groups
            .filter(g => g.isMultiple)
            .map(g => ({
                key: g.index,
                text: g.name,
            }));

    const handleInputChange = event => {
        const name: string = event.target.name
        if (name === 'newGroupName') {
            setNewGroupName(event.target.value);
        }
        if (name === 'editGroupName') {
            setEditGroupName(event.target.value);
        }
    }

    const validateNewGroupName = (v: string) => {
        const name = v.trim();
        if (name.length == 0) {
            return intl.get("emptyName");
        }
        for (let group of props.groups) {
            if (group.isMultiple && group.name === name) {
                return intl.get("groups.exist");
            }
        }
        return "";
    }

    const createGroup = (event: React.FormEvent) => {
        event.preventDefault();
        let trimmed = newGroupName.trim();
        if (validateNewGroupName(trimmed) === "") {
            props.createGroup(trimmed);
        }
    }

    const addToGroup = () => {
        props.addToGroup(
            dropdownIndex,
            selectedGroup.sids[0]
        );
    }

    const removeFromGroup = () => {
        props.removeFromGroup(
            selectedGroup.index,
            selectedSources.map(s => s.sid)
        );
        setSelectedSources(null);
    }

    const deleteGroup = () => {
        props.deleteGroup(selectedGroup.index);
        groupSelection.setIndexSelected(
            selectedGroup.index,
            false,
            false
        );
        setSelectedGroup(null);
    }

    const updateGroupName = () => {
        let group = selectedGroup;
        group = { ...group, name: editGroupName.trim() };
        props.updateGroup(group);
    }

    const dropdownChange = (_, item: IDropdownOption) => {
        setDropdownIndex(item ? Number(item.key) : null);
    }

    return (
        <div className="tab-body">
            {manageGroup && selectedGroup && (
                <>
                    <Stack
                        horizontal
                        horizontalAlign="space-between"
                        style={{ height: 40 }}>
                        <CommandBarButton
                            text={intl.get("groups.exitGroup")}
                            iconProps={{ iconName: "BackToWindow" }}
                            onClick={() =>
                                setManageGroup(false)
                            }
                        />
                        {selectedSources != null && (
                            <CommandBarButton
                                text={intl.get("groups.deleteSource")}
                                onClick={removeFromGroup}
                                iconProps={{
                                    iconName: "RemoveFromShoppingList",
                                    style: { color: "#d13438" },
                                }}
                            />
                        )}
                    </Stack>

                    <MarqueeSelection
                        selection={sourcesSelection}
                        isDraggingConstrainedToRoot={true}>
                        <DetailsList
                            compact={true}
                            items={selectedGroup.sids.map(
                                sid => props.sources[sid]
                            )}
                            columns={sourceColumns}
                            dragDropEvents={sourcesDragDropEvents()}
                            setKey="multiple"
                            selection={sourcesSelection}
                            selectionMode={SelectionMode.multiple}
                        />
                    </MarqueeSelection>

                    <span className="settings-hint">
                        {intl.get("groups.sourceHint")}
                    </span>
                </>
            )}
            {!manageGroup || !selectedGroup ? (
                <>
                    {props.serviceOn && (
                        <MessageBar
                            messageBarType={MessageBarType.info}
                            isMultiline={false}
                            actions={
                                <MessageBarButton
                                    text={intl.get("service.importGroups")}
                                    onClick={props.importGroups}
                                />
                            }>
                            {intl.get("service.groupsWarning")}
                        </MessageBar>
                    )}
                    <form onSubmit={createGroup}>
                        <Label htmlFor="newGroupName">
                            {intl.get("groups.create")}
                        </Label>
                        <Stack horizontal>
                            <Stack.Item grow>
                                <TextField
                                    onGetErrorMessage={
                                        validateNewGroupName
                                    }
                                    validateOnLoad={false}
                                    placeholder={intl.get("groups.enterName")}
                                    value={newGroupName}
                                    id="newGroupName"
                                    name="newGroupName"
                                    onChange={handleInputChange}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <PrimaryButton
                                    disabled={
                                        validateNewGroupName(
                                            newGroupName
                                        ) !== ""
                                    }
                                    type="sumbit"
                                    text={intl.get("create")}
                                />
                            </Stack.Item>
                        </Stack>
                    </form>

                    <DetailsList
                        compact={true}
                        items={props.groups}
                        columns={groupColumns()}
                        setKey="selected"
                        onItemInvoked={manageGroupHandle}
                        dragDropEvents={groupDragDropEvents()}
                        selection={groupSelection}
                        selectionMode={SelectionMode.single}
                    />

                    {selectedGroup ? (
                        selectedGroup.isMultiple ? (
                            <>
                                <Label>
                                    {intl.get("groups.selectedGroup")}
                                </Label>
                                <Stack horizontal>
                                    <Stack.Item grow>
                                        <TextField
                                            onGetErrorMessage={v =>
                                                v.trim().length == 0
                                                    ? intl.get("emptyName")
                                                    : ""
                                            }
                                            validateOnLoad={false}
                                            placeholder={intl.get(
                                                "groups.enterName"
                                            )}
                                            value={editGroupName}
                                            name="editGroupName"
                                            onChange={handleInputChange}
                                        />
                                    </Stack.Item>
                                    <Stack.Item>
                                        <DefaultButton
                                            disabled={
                                                editGroupName.trim()
                                                    .length == 0
                                            }
                                            onClick={updateGroupName}
                                            text={intl.get("groups.editName")}
                                        />
                                    </Stack.Item>
                                    <Stack.Item>
                                        <DangerButton
                                            key={selectedGroup.index}
                                            onClick={deleteGroup}
                                            text={intl.get(
                                                "groups.deleteGroup"
                                            )}
                                        />
                                    </Stack.Item>
                                </Stack>
                            </>
                        ) : (
                            <>
                                <Label>
                                    {intl.get("groups.selectedSource")}
                                </Label>
                                <Stack horizontal>
                                    <Stack.Item grow>
                                        <Dropdown
                                            placeholder={intl.get(
                                                "groups.chooseGroup"
                                            )}
                                            selectedKey={
                                                dropdownIndex
                                            }
                                            options={dropdownOptions()}
                                            onChange={dropdownChange}
                                        />
                                    </Stack.Item>
                                    <Stack.Item>
                                        <DefaultButton
                                            disabled={
                                                dropdownIndex ===
                                                null
                                            }
                                            onClick={addToGroup}
                                            text={intl.get("groups.addToGroup")}
                                        />
                                    </Stack.Item>
                                </Stack>
                            </>
                        )
                    ) : (
                        <span className="settings-hint">
                            {intl.get("groups.groupHint")}
                        </span>
                    )}
                </>
            ) : null}
        </div>
    );
};

export default GroupsTab;
