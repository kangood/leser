import React, { useState } from "react"
import intl from "react-intl-universal"
import md5 from "js-md5"
import { ServiceConfigsTabProps } from "../service"
import { FeverConfigs } from "../../../scripts/models/services/fever"
import { SyncService } from "../../../schema-types"
import {
    Stack,
    Icon,
    Label,
    TextField,
    PrimaryButton,
    DefaultButton,
    Checkbox,
    MessageBar,
    MessageBarType,
    Dropdown,
    IDropdownOption,
} from "@fluentui/react"
import DangerButton from "../../utils/danger-button"
import { urlTest } from "../../../scripts/utils"
import LiteExporter from "./lite-exporter"

type FeverConfigsTabState = {
    existing: boolean
    endpoint: string
    username: string
    password: string
    fetchLimit: number
    importGroups: boolean
}

const FeverConfigsTab: React.FC<ServiceConfigsTabProps> = (props) => {
    const [state, setState] = useState<FeverConfigsTabState>({
        existing: (props.configs as FeverConfigs).type === SyncService.Fever,
        endpoint: (props.configs as FeverConfigs).endpoint || "",
        username: (props.configs as FeverConfigs).username || "",
        password: "",
        fetchLimit: (props.configs as FeverConfigs).fetchLimit || 250,
        importGroups: true,
    });

    const fetchLimitOptions = (): IDropdownOption[] => [
        { key: 250, text: intl.get("service.fetchLimitNum", { count: 250 }) },
        { key: 500, text: intl.get("service.fetchLimitNum", { count: 500 }) },
        { key: 750, text: intl.get("service.fetchLimitNum", { count: 750 }) },
        { key: 1000, text: intl.get("service.fetchLimitNum", { count: 1000 }) },
        { key: 1500, text: intl.get("service.fetchLimitNum", { count: 1500 }) },
        {
            key: Number.MAX_SAFE_INTEGER,
            text: intl.get("service.fetchUnlimited"),
        },
    ];

    const onFetchLimitOptionChange = (_, option: IDropdownOption) => {
        setState((prevState) => ({ ...prevState, fetchLimit: option.key as number }));
    }

    const handleInputChange = (event) => {
        const name: string = event.target.name;
        setState((prevState) => ({ ...prevState, [name]: event.target.value }));
    }

    const checkNotEmpty = (v: string) => {
        return !state.existing && v.length == 0
            ? intl.get("emptyField")
            : ""
    }

    const validateForm = () => {
        return (
            urlTest(state.endpoint.trim()) &&
            (state.existing ||
                (state.username && state.password))
        )
    }

    const save = async () => {
        let configs: FeverConfigs;
        if (state.existing) {
            configs = {
                ...props.configs,
                endpoint: state.endpoint,
                fetchLimit: state.fetchLimit,
            } as FeverConfigs;
            if (state.password) {
                configs.apiKey = md5(
                    `${configs.username}:${state.password}`
                );
            }
        } else {
            configs = {
                type: SyncService.Fever,
                endpoint: state.endpoint,
                username: state.username,
                fetchLimit: state.fetchLimit,
                apiKey: md5(`${state.username}:${state.password}`),
            };
            if (state.importGroups) {
                configs.importGroups = true;
            }
        }
        props.blockActions();
        const valid = await props.authenticate(configs);
        if (valid) {
            props.save(configs);
            setState(prevState => ({ ...prevState, existing: true }));
            props.sync();
        } else {
            props.blockActions();
            window.utils.showErrorBox(
                intl.get("service.failure"),
                intl.get("service.failureHint")
            );
        }
    }

    const remove = async () => {
        props.exit();
        await props.remove();
    }

    return (
        <>
            {!state.existing && (
                <MessageBar messageBarType={MessageBarType.warning}>
                    {intl.get("service.overwriteWarning")}
                </MessageBar>
            )}
            <Stack horizontalAlign="center" style={{ marginTop: 48 }}>
                <Icon
                    iconName="Calories"
                    style={{
                        color: "var(--black)",
                        fontSize: 32,
                        userSelect: "none",
                    }}
                />
                <Label style={{ margin: "8px 0 36px" }}>Fever API</Label>
                <Stack className="login-form" horizontal>
                    <Stack.Item>
                        <Label>{intl.get("service.endpoint")}</Label>
                    </Stack.Item>
                    <Stack.Item grow>
                        <TextField
                            onGetErrorMessage={v =>
                                urlTest(v.trim())
                                    ? ""
                                    : intl.get("sources.badUrl")
                            }
                            validateOnLoad={false}
                            name="endpoint"
                            value={state.endpoint}
                            onChange={handleInputChange}
                        />
                    </Stack.Item>
                </Stack>
                <Stack className="login-form" horizontal>
                    <Stack.Item>
                        <Label>{intl.get("service.username")}</Label>
                    </Stack.Item>
                    <Stack.Item grow>
                        <TextField
                            disabled={state.existing}
                            onGetErrorMessage={checkNotEmpty}
                            validateOnLoad={false}
                            name="username"
                            value={state.username}
                            onChange={handleInputChange}
                        />
                    </Stack.Item>
                </Stack>
                <Stack className="login-form" horizontal>
                    <Stack.Item>
                        <Label>{intl.get("service.password")}</Label>
                    </Stack.Item>
                    <Stack.Item grow>
                        <TextField
                            type="password"
                            placeholder={
                                state.existing
                                    ? intl.get("service.unchanged")
                                    : ""
                            }
                            onGetErrorMessage={checkNotEmpty}
                            validateOnLoad={false}
                            name="password"
                            value={state.password}
                            onChange={handleInputChange}
                        />
                    </Stack.Item>
                </Stack>
                <Stack className="login-form" horizontal>
                    <Stack.Item>
                        <Label>{intl.get("service.fetchLimit")}</Label>
                    </Stack.Item>
                    <Stack.Item grow>
                        <Dropdown
                            options={fetchLimitOptions()}
                            selectedKey={state.fetchLimit}
                            onChange={onFetchLimitOptionChange}
                        />
                    </Stack.Item>
                </Stack>
                {!state.existing && (
                    <Checkbox
                        label={intl.get("service.importGroups")}
                        checked={state.importGroups}
                        onChange={(_, c) =>
                            setState(prevState => ({ ...prevState, importGroups: c }))
                        }
                    />
                )}
                <Stack horizontal style={{ marginTop: 32 }}>
                    <Stack.Item>
                        <PrimaryButton
                            disabled={!validateForm()}
                            onClick={save}
                            text={
                                state.existing
                                    ? intl.get("edit")
                                    : intl.get("confirm")
                            }
                        />
                    </Stack.Item>
                    <Stack.Item>
                        {state.existing ? (
                            <DangerButton
                                onClick={remove}
                                text={intl.get("delete")}
                            />
                        ) : (
                            <DefaultButton
                                onClick={props.exit}
                                text={intl.get("cancel")}
                            />
                        )}
                    </Stack.Item>
                </Stack>
                {state.existing && (
                    <LiteExporter serviceConfigs={props.configs} />
                )}
            </Stack>
        </>
    )
}

export default FeverConfigsTab
