import React, { useEffect, useRef } from "react"
import intl from "react-intl-universal"
import { Icon } from "@fluentui/react/lib/Icon"
import { AnimationClassNames } from "@fluentui/react/lib/Styling"
import AboutTab from "./settings/about"
import { Pivot, PivotItem, Spinner, FocusTrapZone } from "@fluentui/react"
import { initTouchBarWithTexts } from "../scripts/utils"
import AppTab from "./settings/app"
import SourcesTab from "./settings/sources"
import GroupsTab from "./settings/groups"
import RulesTab from "./settings/rules"
import ServiceTab from "./settings/service"
import { useAppActions, useAppSettingsBlocked, useAppSettingsDisplay, useAppSettingsSaving } from "@renderer/scripts/store/app-store"

const Settings: React.FC = () => {

    const appSettingsDisplay = useAppSettingsDisplay();
    const appSettingsSaving = useAppSettingsSaving();
    const appSettingsBlocked = useAppSettingsBlocked();
    const { exitSettings } = useAppActions();

    const prevDisplay = useRef<boolean>(appSettingsDisplay);

    useEffect(() => {
        if (appSettingsDisplay !== prevDisplay.current) {
            if (appSettingsDisplay) {
                if (window.utils.platform === "darwin") {
                    window.utils.destroyTouchBar();
                }
                document.body.addEventListener("keydown", onKeyDown);
            } else {
                if (window.utils.platform === "darwin") {
                    initTouchBarWithTexts();
                }
                document.body.removeEventListener("keydown", onKeyDown);
            }
        }
        prevDisplay.current = appSettingsDisplay;
    }, [appSettingsDisplay]);

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && !appSettingsSaving) {
            exitSettings();
        }
    }

    return (
        appSettingsDisplay && (
            <div className="settings-container">
                <div
                    className="btn-group"
                    style={{
                        position: "absolute",
                        top: 70,
                        left: "calc(50% - 404px)",
                    }}>
                    <a
                        className={
                            "btn" + (appSettingsSaving ? " disabled" : "")
                        }
                        title={intl.get("settings.exit")}
                        onClick={exitSettings}>
                        <Icon iconName="Back" />
                    </a>
                </div>
                <div className={"settings " + AnimationClassNames.slideUpIn20}>
                    {appSettingsBlocked && (
                        <FocusTrapZone
                            isClickableOutsideFocusTrap={true}
                            className="loading">
                            <Spinner
                                label={intl.get("settings.fetching")}
                                tabIndex={0}
                            />
                        </FocusTrapZone>
                    )}
                    <Pivot style={{ height: '100%' }}>
                        <PivotItem
                            headerText={intl.get("settings.sources")}
                            itemIcon="Source">
                            <SourcesTab />
                        </PivotItem>
                        <PivotItem
                            headerText={intl.get("settings.grouping")}
                            itemIcon="GroupList">
                            <GroupsTab />
                        </PivotItem>
                        <PivotItem
                            headerText={intl.get("settings.rules")}
                            itemIcon="FilterSettings">
                            <RulesTab />
                        </PivotItem>
                        <PivotItem
                            headerText={intl.get("settings.service")}
                            itemIcon="CloudImportExport">
                            <ServiceTab />
                        </PivotItem>
                        <PivotItem
                            headerText={intl.get("settings.app")}
                            itemIcon="Settings">
                            <AppTab />
                        </PivotItem>
                        <PivotItem
                            headerText={intl.get("settings.about")}
                            itemIcon="Info">
                            <AboutTab />
                        </PivotItem>
                    </Pivot>
                </div>
            </div>
        )
    )
}

export default Settings;
