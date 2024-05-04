import React, { useState } from "react"
import intl from "react-intl-universal"
import { ServiceConfigs, SyncService } from "../../schema-types"
import { Stack, Icon, Link, Dropdown, IDropdownOption } from "@fluentui/react"
import FeverConfigsTab from "./services/fever"
import FeedbinConfigsTab from "./services/feedbin"
import GReaderConfigsTab from "./services/greader"
import InoreaderConfigsTab from "./services/inoreader"
import MinifluxConfigsTab from "./services/miniflux"
import NextcloudConfigsTab from "./services/nextcloud"
import { authenticate, reauthenticate, useService, useServiceActions } from "@renderer/scripts/store/service-store"
import { useAppActions } from "@renderer/scripts/store/app-store"

type ServiceTabProps = {
    configs: ServiceConfigs
    save: (configs: ServiceConfigs) => void
    sync: () => Promise<void>
    remove: () => Promise<void>
    blockActions: () => void
    authenticate: (configs: ServiceConfigs) => Promise<boolean>
    reauthenticate: (configs: ServiceConfigs) => Promise<ServiceConfigs>
}

export type ServiceConfigsTabProps = ServiceTabProps & {
    exit: () => void
}

type ServiceTabState = {
    type: SyncService
}

const ServiceTab: React.FC = () => {

    const service = useService();
    const { saveServiceConfigs, syncWithService, removeService } = useServiceActions();
    const { saveSettings } = useAppActions();

    const props = {
        configs: service,
        save: saveServiceConfigs,
        sync: syncWithService,
        remove: removeService,
        blockActions: saveSettings,
        authenticate: authenticate,
        reauthenticate: reauthenticate
    }

    const [state, setState] = useState<ServiceTabState>({ type: service.type });

    const serviceOptions = (): IDropdownOption[] => [
        { key: SyncService.Fever, text: "Fever API" },
        { key: SyncService.Feedbin, text: "Feedbin" },
        { key: SyncService.GReader, text: "Google Reader API (Beta)" },
        { key: SyncService.Inoreader, text: "Inoreader" },
        { key: SyncService.Miniflux, text: "Miniflux" },
        { key: SyncService.Nextcloud, text: "Nextcloud News API" },
        { key: -1, text: intl.get("service.suggest") },
    ];

    const onServiceOptionChange = (_, option: IDropdownOption) => {
        if (option.key === -1) {
            window.utils.openExternal(
                "https://github.com/yang991178/fluent-reader/issues/23"
            );
        } else {
            setState({ type: option.key as number })
        }
    }

    const exitConfigsTab = () => {
        setState({ type: SyncService.None })
    }

    const getConfigsTab = () => {
        switch (state.type) {
            case SyncService.Fever:
                return (
                    <FeverConfigsTab
                        {...props}
                        exit={exitConfigsTab}
                    />
                )
            case SyncService.Feedbin:
                return (
                    <FeedbinConfigsTab
                        {...props}
                        exit={exitConfigsTab}
                    />
                )
            case SyncService.GReader:
                return (
                    <GReaderConfigsTab
                        {...props}
                        exit={exitConfigsTab}
                    />
                )
            case SyncService.Inoreader:
                return (
                    <InoreaderConfigsTab
                        {...props}
                        exit={exitConfigsTab}
                    />
                )
            case SyncService.Miniflux:
                return (
                    <MinifluxConfigsTab
                        {...props}
                        exit={exitConfigsTab}
                    />
                )
            case SyncService.Nextcloud:
                return (
                    <NextcloudConfigsTab
                        {...props}
                        exit={exitConfigsTab}
                    />
                )
            default:
                return null
        }
    }

    return (
        <div className="tab-body">
            {state.type === SyncService.None ? (
                <Stack horizontalAlign="center" style={{ marginTop: 64 }}>
                    <Stack
                        className="settings-rules-icons"
                        horizontal
                        tokens={{ childrenGap: 12 }}>
                        <Icon iconName="ThisPC" />
                        <Icon iconName="Sync" />
                        <Icon iconName="Cloud" />
                    </Stack>
                    <span className="settings-hint">
                        {intl.get("service.intro")}
                        <Link
                            onClick={() =>
                                window.utils.openExternal(
                                    "https://github.com/yang991178/fluent-reader/wiki/Support#services"
                                )
                            }
                            style={{ marginLeft: 6 }}>
                            {intl.get("rules.help")}
                        </Link>
                    </span>
                    <Dropdown
                        placeHolder={intl.get("service.select")}
                        options={serviceOptions()}
                        selectedKey={null}
                        onChange={onServiceOptionChange}
                        style={{ marginTop: 32, width: 180 }}
                    />
                </Stack>
            ) : (
                getConfigsTab()
            )}
        </div>
    )
}

export default ServiceTab;
