import React, { useEffect } from "react"
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

type SettingsProps = {
    display: boolean
    blocked: boolean
    exitting: boolean
    close: () => void
}

const Settings: React.FC<SettingsProps> = (props) => {

    const prevProps = React.useRef<SettingsProps>(props);

    useEffect(() => {
        if (props.display !== prevProps.current.display) {
            if (props.display) {
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
    }, [props.display]);

    const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && !props.exitting) {
            props.close();
        }
    }

    return (
        props.display && (
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
                            "btn" + (props.exitting ? " disabled" : "")
                        }
                        title={intl.get("settings.exit")}
                        onClick={props.close}>
                        <Icon iconName="Back" />
                    </a>
                </div>
                <div className={"settings " + AnimationClassNames.slideUpIn20}>
                    {props.blocked && (
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
