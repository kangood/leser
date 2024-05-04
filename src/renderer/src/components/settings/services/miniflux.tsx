import React, { useState } from "react"
import intl from "react-intl-universal"
import { ServiceConfigsTabProps } from "../service"
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
import { MinifluxConfigs } from "../../../scripts/models/services/miniflux"

type MinifluxConfigsTabState = {
    existing: boolean
    endpoint: string
    apiKeyAuth: boolean
    username: string
    password: string
    apiKey: string
    fetchLimit: number
    importGroups: boolean
}

const MinifluxConfigsTab: React.FC<ServiceConfigsTabProps> = (props) => {

    const configs = props.configs as MinifluxConfigs;
    const [state, setState] = useState<MinifluxConfigsTabState>({
        existing: configs.type === SyncService.Miniflux,
        endpoint: configs.endpoint || "",
        apiKeyAuth: true,
        username: "",
        password: "",
        apiKey: "",
        fetchLimit: configs.fetchLimit || 250,
        importGroups: true,
    })

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
    ]
    const onFetchLimitOptionChange = (_, option: IDropdownOption) => {
        setState(prevState => ({ ...prevState, fetchLimit: option.key as number }));
    }

    const authenticationOptions = (): IDropdownOption[] => [
        { key: "apiKey", text: "API Key" /*intl.get("service.password")*/ },
        {
            key: "userPass",
            text:
                intl.get("service.username") +
                "/" +
                intl.get("service.password"),
        },
    ]
    const onAuthenticationOptionsChange = (_, option: IDropdownOption) => {
        setState(prevState => ({ ...prevState, apiKeyAuth: option.key == "apiKey" }));
    }

    const handleInputChange = event => {
        const name: string = event.target.name;
        setState(prevState => ({ ...prevState, [name]: event.target.value }));
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
                state.apiKey ||
                (state.username && state.password))
        )
    }

    const save = async () => {
        let configs: MinifluxConfigs;

        if (state.existing) {
            configs = {
                ...props.configs,
                endpoint: state.endpoint,
                fetchLimit: state.fetchLimit,
            } as MinifluxConfigs;

            if (state.apiKey || state.password) {
                configs.authKey = state.apiKeyAuth
                    ? state.apiKey
                    : Buffer.from(
                          state.username + ":" + state.password,
                          "binary"
                      ).toString("base64");
            }
        } else {
            configs = {
                type: SyncService.Miniflux,
                endpoint: state.endpoint,
                apiKeyAuth: state.apiKeyAuth,
                authKey: state.apiKeyAuth
                    ? state.apiKey
                    : Buffer.from(
                          state.username + ":" + state.password,
                          "binary"
                      ).toString("base64"),
                fetchLimit: state.fetchLimit,
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
                    iconName="MarkDownLanguage"
                    style={{
                        color: "var(--black)",
                        fontSize: 32,
                        userSelect: "none",
                    }}
                />
                <Label style={{ margin: "8px 0 36px" }}>Miniflux</Label>
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
                        <Label>{intl.get("groups.type")}</Label>
                    </Stack.Item>
                    <Stack.Item grow>
                        <Dropdown
                            options={authenticationOptions()}
                            selectedKey={
                                state.apiKeyAuth
                                    ? "apiKey"
                                    : "userPass"
                            }
                            onChange={onAuthenticationOptionsChange}
                        />
                    </Stack.Item>
                </Stack>
                {state.apiKeyAuth && (
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
                                name="apiKey"
                                value={state.apiKey}
                                onChange={handleInputChange}
                            />
                        </Stack.Item>
                    </Stack>
                )}
                {!state.apiKeyAuth && (
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
                )}
                {!state.apiKeyAuth && (
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
                )}
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
            </Stack>
        </>
    )
}

export default MinifluxConfigsTab
