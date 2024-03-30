import React from 'react';
import { Icon } from '@fluentui/react';
import intl from 'react-intl-universal';

export const SideTopRight = ({
  markAllRead,
  logs,
  viewsWrapper,
  settings,
  minimize,
  maximize,
  maximized,
  close,
  state,
}) => {
    return (
        <div className="side-top-right dragging">
            <div className="btn-group undragging">
                <a
                    className="btn"
                    id="mark-all-toggle"
                    onClick={markAllRead}
                    title={intl.get("nav.markAllRead")}
                    onMouseDown={e => {
                        if (
                            state.contextMenu.event ===
                            "#mark-all-toggle"
                        )
                            e.stopPropagation()
                    }}>
                    <Icon iconName="InboxCheck" />
                </a>
                <a
                    className="btn"
                    id="log-toggle"
                    title={intl.get("nav.notifications")}
                    onClick={logs}>
                    {state.logMenu.notify ? (
                        <Icon iconName="RingerSolid" />
                    ) : (
                        <Icon iconName="Ringer" />
                    )}
                </a>
                <a
                    className="btn"
                    id="view-toggle"
                    title={intl.get("nav.view")}
                    onClick={viewsWrapper}
                    onMouseDown={e => {
                        if (
                            state.contextMenu.event ===
                            "#view-toggle"
                        )
                            e.stopPropagation()
                    }}>
                    <Icon iconName="View" />
                </a>
                <a
                    className="btn"
                    title={intl.get("nav.settings")}
                    onClick={settings}>
                    <Icon iconName="Settings" />
                </a>
                <span className="seperator"></span>
                <a
                    className="btn system"
                    title={intl.get("nav.minimize")}
                    onClick={minimize}
                    style={{ fontSize: 12 }}>
                    <Icon iconName="Remove" />
                </a>
                <a
                    className="btn system"
                    title={intl.get("nav.maximize")}
                    onClick={maximize}>
                    {maximized ? (
                        <Icon
                            iconName="ChromeRestore"
                            style={{ fontSize: 11 }}
                        />
                    ) : (
                        <Icon
                            iconName="Checkbox"
                            style={{ fontSize: 10 }}
                        />
                    )}
                </a>
                <a
                    className="btn system close"
                    title={intl.get("close")}
                    onClick={close}>
                    <Icon iconName="Cancel" />
                </a>
            </div>
        </div>
    );
};