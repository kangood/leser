import * as React from "react"
import intl from "react-intl-universal"
import { Stack, Link } from "@fluentui/react"

class AboutTab extends React.Component {
    render = () => (
        <div className="tab-body">
            <Stack className="settings-about" horizontalAlign="center">
                <img src="icons/logo.svg" style={{ width: 120, height: 120 }} />
                <h3 style={{ fontWeight: 600 }}>Leser</h3>
                <small>
                    {intl.get("settings.version")} {window.utils.getVersion()}
                </small>
                <p className="settings-hint">
                    Copyright © 2024 Kangod Yan. All rights reserved.
                </p>
                <Stack
                    horizontal
                    horizontalAlign="center"
                    tokens={{ childrenGap: 12 }}>
                    <small>
                        <Link
                            onClick={() =>
                                window.utils.openExternal(
                                    "https://github.com/KangodYan/leser/wiki/Support#keyboard-shortcuts"
                                )
                            }>
                            {intl.get("settings.shortcuts")}
                        </Link>
                    </small>
                    <small>
                        <Link
                            onClick={() =>
                                window.utils.openExternal(
                                    "https://github.com/KangodYan/leser"
                                )
                            }>
                            {intl.get("settings.openSource")}
                        </Link>
                    </small>
                    <small>
                        <Link
                            onClick={() =>
                                window.utils.openExternal(
                                    "https://github.com/KangodYan/leser/issues"
                                )
                            }>
                            {intl.get("settings.feedback")}
                        </Link>
                    </small>
                </Stack>
            </Stack>
        </div>
    )
}

export default AboutTab
