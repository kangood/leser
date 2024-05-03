import React, { useState, useEffect } from 'react';
import intl from 'react-intl-universal';
import {
    Label,
    DefaultButton,
    TextField,
    Stack,
    PrimaryButton,
    DetailsList,
    IColumn,
    SelectionMode,
    Selection,
    IChoiceGroupOption,
    ChoiceGroup,
    IDropdownOption,
    Dropdown,
    MessageBar,
    MessageBarType,
    Toggle,
} from '@fluentui/react';
import { RSSSource, SourceOpenTarget } from '../../scripts/models/source';
import { urlTest } from '../../scripts/utils';
import DangerButton from '../utils/danger-button';
import { useAppActions, useAppSettingsSids } from '@renderer/scripts/store/app-store';
import { useSourceActions, useSources } from '@renderer/scripts/store/source-store';
import { useServiceOn } from '@renderer/scripts/store/service-store';
import { useGroupActions } from '@renderer/scripts/store/group-store';

const enum EditDropdownKeys {
    Name = 'n',
    Icon = 'i',
    Url = 'u',
}

const SourcesTab: React.FC = () => {
    // zustand store
    const sids = useAppSettingsSids();
    const { toggleSettings, updateSourceIcon } = useAppActions();
    const sources = useSources();
    const { updateSource, addSource, deleteSource, deleteSources, toggleSourceHidden } = useSourceActions();
    const serviceOn = useServiceOn();
    const { importOPML, exportOPML } = useGroupActions();

    const [newUrl, setNewUrl] = useState('');
    const [selectedSource, setSelectedSource] = useState<RSSSource | null>(null);
    const [selectedSources, setSelectedSources] = useState<RSSSource[] | null>(null);
    const [newSourceName, setNewSourceName] = useState('');
    const [newSourceIcon, setNewSourceIcon] = useState('');
    const [sourceEditOption, setSourceEditOption] = useState<string>(EditDropdownKeys.Name);

    const selection = new Selection({
        getKey: (s) => (s as RSSSource).sid,
        onSelectionChanged: () => {
            let count = selection.getSelectedCount();
            let sources = count ? (selection.getSelection() as RSSSource[]) : null;
            setSelectedSource(count === 1 ? sources[0] : null);
            setSelectedSources(count > 1 ? sources : null);
            setNewSourceName(count === 1 ? sources[0].name : '');
            setNewSourceIcon(count === 1 ? sources[0].iconurl || '' : '');
            setSourceEditOption(EditDropdownKeys.Name);
        },
    });

    useEffect(() => {
        if (sids.length > 0) {
            for (let sid of sids) {
                selection.setKeySelected(String(sid), true, false);
            }
            toggleSettings();
        }
    }, []);

    const columns = (): IColumn[] => [
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

    const sourceEditOptions = (): IDropdownOption[] => [
        { key: EditDropdownKeys.Name, text: intl.get("name") },
        { key: EditDropdownKeys.Icon, text: intl.get("icon") },
        { key: EditDropdownKeys.Url, text: "URL" },
    ]

    const onSourceEditOptionChange = (_, option: IDropdownOption) => {
        setSourceEditOption(option.key as string);
    }

    const fetchFrequencyOptions = (): IDropdownOption[] => [
        { key: "0", text: intl.get("sources.unlimited") },
        { key: "15", text: intl.get("time.minute", { m: 15 }) },
        { key: "30", text: intl.get("time.minute", { m: 30 }) },
        { key: "60", text: intl.get("time.hour", { h: 1 }) },
        { key: "120", text: intl.get("time.hour", { h: 2 }) },
        { key: "180", text: intl.get("time.hour", { h: 3 }) },
        { key: "360", text: intl.get("time.hour", { h: 6 }) },
        { key: "720", text: intl.get("time.hour", { h: 12 }) },
        { key: "1440", text: intl.get("time.day", { d: 1 }) },
    ]

    const onFetchFrequencyChange = (_, option: IDropdownOption) => {
        let frequency = parseInt(option.key as string);
        updateSource({ ...selectedSource, fetchFrequency: frequency });
        setSelectedSource(state => ({
            ...state,
            fetchFrequency: frequency,
        }));
    }

    const sourceOpenTargetChoices = (): IChoiceGroupOption[] => [
        {
            key: String(SourceOpenTarget.Local),
            text: intl.get("sources.rssText"),
        },
        {
            key: String(SourceOpenTarget.FullContent),
            text: intl.get("article.loadFull"),
        },
        {
            key: String(SourceOpenTarget.Webpage),
            text: intl.get("sources.loadWebpage"),
        },
        {
            key: String(SourceOpenTarget.External),
            text: intl.get("openExternal"),
        },
    ]

    const updateSourceName = () => {
        let newName = newSourceName.trim();
        updateSource({ ...selectedSource, name: newName });
        setSelectedSource(state => ({
            ...state,
            name: newName
        }));
    }

    const updateSourceIconHandle = () => {
        let newIcon = newSourceIcon.trim();
        updateSourceIcon(selectedSource, newIcon);
        setSelectedSource(state => ({
            ...state,
            iconurl: newIcon
        }));
    }

    const handleInputChange = event => {
        const name: string = event.target.name;
        if (name === 'newUrl') {
            setNewUrl(event.target.value);
        } else if (name === 'newSourceName') {
            setNewSourceName(event.target.value);
        } else if (name === 'newSourceIcon') {
            setNewSourceIcon(event.target.value);
        }
    }

    const addSourceHandle = (event: React.FormEvent) => {
        event.preventDefault();
        let trimmed = newUrl.trim();
        if (urlTest(trimmed)) {
            addSource(trimmed);
        }
    }

    const onOpenTargetChange = (_, option: IChoiceGroupOption) => {
        let newTarget = parseInt(option.key) as SourceOpenTarget;
        updateSource({ ...selectedSource, openTarget: newTarget });
        setSelectedSource(state => ({
            ...state,
            openTarget: newTarget
        }));
    }

    const onToggleHidden = () => {
        toggleSourceHidden(selectedSource);
        setSelectedSource(state => ({
            ...state,
            hidden: !selectedSource.hidden
        }));
    }

    return (
        <div className="tab-body">
            {serviceOn && (
                <MessageBar messageBarType={MessageBarType.info}>
                    {intl.get("sources.serviceWarning")}
                </MessageBar>
            )}
            <Label>{intl.get("sources.opmlFile")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <PrimaryButton
                        onClick={importOPML}
                        text={intl.get("sources.import")}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DefaultButton
                        onClick={exportOPML}
                        text={intl.get("sources.export")}
                    />
                </Stack.Item>
            </Stack>

            <form onSubmit={addSourceHandle}>
                <Label htmlFor="newUrl">{intl.get("sources.add")}</Label>
                <Stack horizontal>
                    <Stack.Item grow>
                        <TextField
                            onGetErrorMessage={v =>
                                urlTest(v.trim())
                                    ? ""
                                    : intl.get("sources.badUrl")
                            }
                            validateOnLoad={false}
                            placeholder={intl.get("sources.inputUrl")}
                            value={newUrl}
                            id="newUrl"
                            name="newUrl"
                            onChange={handleInputChange}
                        />
                    </Stack.Item>
                    <Stack.Item>
                        <PrimaryButton
                            disabled={!urlTest(newUrl.trim())}
                            type="submit"
                            text={intl.get("add")}
                        />
                    </Stack.Item>
                </Stack>
            </form>

            <DetailsList
                compact={Object.keys(sources).length >= 10}
                items={Object.values(sources)}
                columns={columns()}
                getKey={s => s.sid}
                setKey="selected"
                selection={selection}
                selectionMode={SelectionMode.multiple}
            />

            {selectedSource && (
                <>
                    {selectedSource.serviceRef && (
                        <MessageBar messageBarType={MessageBarType.info}>
                            {intl.get("sources.serviceManaged")}
                        </MessageBar>
                    )}
                    <Label>{intl.get("sources.selected")}</Label>
                    <Stack horizontal>
                        <Stack.Item>
                            <Dropdown
                                options={sourceEditOptions()}
                                selectedKey={sourceEditOption}
                                onChange={onSourceEditOptionChange}
                                style={{ width: 120 }}
                            />
                        </Stack.Item>
                        {sourceEditOption ===
                            EditDropdownKeys.Name && (
                            <>
                                <Stack.Item grow>
                                    <TextField
                                        onGetErrorMessage={v =>
                                            v.trim().length == 0
                                                ? intl.get("emptyName")
                                                : ""
                                        }
                                        validateOnLoad={false}
                                        placeholder={intl.get("sources.name")}
                                        value={newSourceName}
                                        name="newSourceName"
                                        onChange={handleInputChange}
                                    />
                                </Stack.Item>
                                <Stack.Item>
                                    <DefaultButton
                                        disabled={
                                            newSourceName.trim()
                                                .length == 0
                                        }
                                        onClick={updateSourceName}
                                        text={intl.get("sources.editName")}
                                    />
                                </Stack.Item>
                            </>
                        )}
                        {sourceEditOption ===
                            EditDropdownKeys.Icon && (
                            <>
                                <Stack.Item grow>
                                    <TextField
                                        onGetErrorMessage={v =>
                                            urlTest(v.trim())
                                                ? ""
                                                : intl.get("sources.badUrl")
                                        }
                                        validateOnLoad={false}
                                        placeholder={intl.get(
                                            "sources.inputUrl"
                                        )}
                                        value={newSourceIcon}
                                        name="newSourceIcon"
                                        onChange={handleInputChange}
                                    />
                                </Stack.Item>
                                <Stack.Item>
                                    <DefaultButton
                                        disabled={
                                            !urlTest(
                                                newSourceIcon.trim()
                                            )
                                        }
                                        onClick={updateSourceIconHandle}
                                        text={intl.get("edit")}
                                    />
                                </Stack.Item>
                            </>
                        )}
                        {sourceEditOption ===
                            EditDropdownKeys.Url && (
                            <>
                                <Stack.Item grow>
                                    <TextField
                                        disabled
                                        value={selectedSource.url}
                                    />
                                </Stack.Item>
                                <Stack.Item>
                                    <DefaultButton
                                        onClick={() =>
                                            window.utils.writeClipboard(
                                                selectedSource.url
                                            )
                                        }
                                        text={intl.get("context.copy")}
                                    />
                                </Stack.Item>
                            </>
                        )}
                    </Stack>
                    {!selectedSource.serviceRef && (
                        <>
                            <Label>{intl.get("sources.fetchFrequency")}</Label>
                            <Stack>
                                <Stack.Item>
                                    <Dropdown
                                        options={fetchFrequencyOptions()}
                                        selectedKey={
                                            selectedSource
                                                .fetchFrequency
                                                ? String(
                                                      selectedSource
                                                          .fetchFrequency
                                                  )
                                                : "0"
                                        }
                                        onChange={onFetchFrequencyChange}
                                        style={{ width: 200 }}
                                    />
                                </Stack.Item>
                            </Stack>
                        </>
                    )}
                    <ChoiceGroup
                        label={intl.get("sources.openTarget")}
                        options={sourceOpenTargetChoices()}
                        selectedKey={String(
                            selectedSource.openTarget
                        )}
                        onChange={onOpenTargetChange}
                    />
                    <Stack horizontal verticalAlign="baseline">
                        <Stack.Item grow>
                            <Label>{intl.get("sources.hidden")}</Label>
                        </Stack.Item>
                        <Stack.Item>
                            <Toggle
                                checked={selectedSource.hidden}
                                onChange={onToggleHidden}
                            />
                        </Stack.Item>
                    </Stack>
                    {!selectedSource.serviceRef && (
                        <Stack horizontal>
                            <Stack.Item>
                                <DangerButton
                                    onClick={() =>
                                        deleteSource(
                                            selectedSource
                                        )
                                    }
                                    key={selectedSource.sid}
                                    text={intl.get("sources.delete")}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <span className="settings-hint">
                                    {intl.get("sources.deleteWarning")}
                                </span>
                            </Stack.Item>
                        </Stack>
                    )}
                </>
            )}
            {selectedSources &&
                (selectedSources.filter(s => s.serviceRef).length === 0
                ? (
                    <>
                        <Label>{intl.get("sources.selectedMulti")}</Label>
                        <Stack horizontal>
                            <Stack.Item>
                                <DangerButton
                                    onClick={() =>
                                        deleteSources(
                                            selectedSources
                                        )
                                    }
                                    text={intl.get("sources.delete")}
                                />
                            </Stack.Item>
                            <Stack.Item>
                                <span className="settings-hint">
                                    {intl.get("sources.deleteWarning")}
                                </span>
                            </Stack.Item>
                        </Stack>
                    </>
                ) : (
                    <MessageBar messageBarType={MessageBarType.info}>
                        {intl.get("sources.serviceManaged")}
                    </MessageBar>
                ))}
        </div>
    );
};

export default SourcesTab;
