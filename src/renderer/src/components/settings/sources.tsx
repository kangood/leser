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
import { SourceState, RSSSource, SourceOpenTarget } from '../../scripts/models/source';
import { urlTest } from '../../scripts/utils';
import DangerButton from '../utils/danger-button';

type SourcesTabProps = {
    sources: SourceState;
    serviceOn: boolean;
    sids: number[];
    acknowledgeSIDs: () => void;
    addSource: (url: string) => void;
    updateSourceName: (source: RSSSource, name: string) => void;
    updateSourceIcon: (source: RSSSource, iconUrl: string) => Promise<void>;
    updateSourceOpenTarget: (source: RSSSource, target: SourceOpenTarget) => void;
    updateFetchFrequency: (source: RSSSource, frequency: number) => void;
    deleteSource: (source: RSSSource) => void;
    deleteSources: (sources: RSSSource[]) => void;
    importOPML: () => void;
    exportOPML: () => void;
    toggleSourceHidden: (source: RSSSource) => void;
};

const enum EditDropdownKeys {
    Name = 'n',
    Icon = 'i',
    Url = 'u',
}

const SourcesTab: React.FC<SourcesTabProps> = (props) => {
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
        if (props.sids.length > 0) {
            for (let sid of props.sids) {
                selection.setKeySelected(String(sid), true, false);
            }
            props.acknowledgeSIDs();
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
        props.updateFetchFrequency(selectedSource, frequency);
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
        props.updateSourceName(selectedSource, newName);
        setSelectedSource(state => ({
            ...state,
            name: newName
        }));
    }

    const updateSourceIcon = () => {
        let newIcon = newSourceIcon.trim();
        props.updateSourceIcon(selectedSource, newIcon);
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

    const addSource = (event: React.FormEvent) => {
        event.preventDefault();
        let trimmed = newUrl.trim();
        if (urlTest(trimmed)) {
            props.addSource(trimmed);
        }
    }

    const onOpenTargetChange = (_, option: IChoiceGroupOption) => {
        let newTarget = parseInt(option.key) as SourceOpenTarget;
        props.updateSourceOpenTarget(selectedSource, newTarget);
        setSelectedSource(state => ({
            ...state,
            openTarget: newTarget
        }));
    }

    const onToggleHidden = () => {
        props.toggleSourceHidden(selectedSource);
        setSelectedSource(state => ({
            ...state,
            hidden: !selectedSource.hidden
        }));
    }

    return (
        <div className="tab-body">
            {props.serviceOn && (
                <MessageBar messageBarType={MessageBarType.info}>
                    {intl.get("sources.serviceWarning")}
                </MessageBar>
            )}
            <Label>{intl.get("sources.opmlFile")}</Label>
            <Stack horizontal>
                <Stack.Item>
                    <PrimaryButton
                        onClick={props.importOPML}
                        text={intl.get("sources.import")}
                    />
                </Stack.Item>
                <Stack.Item>
                    <DefaultButton
                        onClick={props.exportOPML}
                        text={intl.get("sources.export")}
                    />
                </Stack.Item>
            </Stack>

            <form onSubmit={addSource}>
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
                compact={Object.keys(props.sources).length >= 10}
                items={Object.values(props.sources)}
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
                                        onClick={updateSourceIcon}
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
                                        props.deleteSource(
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
                (selectedSources.filter(s => s.serviceRef).length ===
                0 ? (
                    <>
                        <Label>{intl.get("sources.selectedMulti")}</Label>
                        <Stack horizontal>
                            <Stack.Item>
                                <DangerButton
                                    onClick={() =>
                                        props.deleteSources(
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
