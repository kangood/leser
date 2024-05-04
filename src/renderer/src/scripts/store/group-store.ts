import { create } from 'zustand'
import { SourceGroup } from '@renderer/schema-types';
import { SourceGroupActionTypes } from '../models/group';
import { RSSSource, SourceState } from '../models/source';
import { devtools } from 'zustand/middleware';
import intl from 'react-intl-universal';
import { useAppActions } from './app-store';
import { domParser } from '../utils';
import { useSourceActions, useSources } from './source-store';
import { useItemActions } from './item-store';

type GroupStore = {
    groups: SourceGroup[];
    sourceGroupActionTypes?: SourceGroupActionTypes;
    actions: {
        reorderSourceGroups: (groups: SourceGroup[]) => void;
        fixBrokenGroups: (sources: SourceState) => void;
        createSourceGroupDone: (group: SourceGroup) => void;
        createSourceGroup: (name: string) => number;
        addSourceToGroupDone: (groupIndex: number, sid: number) => void;
        addSourceToGroup: (groupIndex: number, sid: number) => void;
        importOPML: () => void;
        exportOPML: () => void;
        updateSourceGroupDone: (group: SourceGroup) => void;
        updateSourceGroup: (group: SourceGroup) => void;
        removeSourceFromGroupDone: (groupIndex: number, sids: number[]) => void;
        removeSourceFromGroup: (groupIndex: number, sids: number[]) => void;
        deleteSourceGroupDone: (groupIndex: number) => void;
        deleteSourceGroup: (groupIndex: number) => void;
    }
}

const useGroupStore = create<GroupStore>()(devtools((set, get) => ({
    groups: [],
    actions: {
        reorderSourceGroups: (groups: SourceGroup[]) => {
            set({ groups: groups });
            // [appReducer]
            useAppActions().deleteSourceGroup();
            
            window.settings.saveGroups(groups);
        },
        fixBrokenGroups: (sources: SourceState) => {
            const { groups } = get();
            const sids = new Set(Object.values(sources).map(s => s.sid));
            let isBroken = false;
            const newGroups: SourceGroup[] = 
                groups
                    .map(group => {
                        const newGroup: SourceGroup = {
                            ...group,
                            sids: group.sids.filter(sid => sids.delete(sid)),
                        }
                        if (newGroup.sids.length !== group.sids.length) {
                            isBroken = true;
                        }
                        return newGroup;
                    })
                    .filter(group => group.isMultiple || group.sids.length > 0);
            if (isBroken || sids.size > 0) {
                for (let sid of sids) {
                    newGroups.push(new SourceGroup([sid]));
                }
                get().actions.reorderSourceGroups(newGroups);
            }
        },
        createSourceGroupDone: (group: SourceGroup) => {
            set({ groups: [ ...get().groups, group ] })
        },
        createSourceGroup: (name: string) => {
            // 检查是否存在 name 相等的组，如果找到这样的组，函数直接返回该组的索引 i
            let groups = get().groups;
            for (let i = 0; i < groups.length; i += 1) {
                const g = groups[i];
                if (g.isMultiple && g.name === name) {
                    return i;
                }
            }
            // 判断组名之后，可直接新建传入 name 的组
            let group = new SourceGroup([], name);
            get().actions.createSourceGroupDone(group);
            groups = get().groups;
            // 在 window.settings 保存组数据，然后返回新创建组的索引位置（尾部）
            window.settings.saveGroups(groups);
            return groups.length - 1;
        },
        addSourceToGroupDone: (groupIndex: number, sid: number) => {
            set({
                groups: get().groups
                    .map((g, i) => ({
                        ...g,
                        sids:
                            i == groupIndex
                                ? [
                                    ...g.sids.filter(sid => sid !== sid),
                                    sid,
                                ]
                                : g.sids.filter(sid => sid !== sid)
                    }))
                    .filter(g => g.isMultiple || g.sids.length > 0)
            });
            // [appReducer]
            useAppActions().deleteSourceGroup();
        },
        addSourceToGroup: (groupIndex: number, sid: number) => {
            get().actions.addSourceToGroupDone(groupIndex, sid);
            window.settings.saveGroups(get().groups);
        },
        importOPML: () => {
            const filters = [ { name: intl.get("sources.opmlFile"), extensions: ["xml", "opml"] } ];
            window.utils.showOpenDialog(filters).then(data => {
                if (data) {
                    useAppActions().saveSettings();
                    let doc = domParser
                        .parseFromString(data, "text/xml")
                        .getElementsByTagName("body");
                    if (doc.length == 0) {
                        return useAppActions().saveSettings();
                    }
                    let parseError = doc[0].getElementsByTagName("parsererror");
                    if (parseError.length > 0) {
                        useAppActions().saveSettings();
                        return window.utils.showErrorBox(
                            intl.get("sources.errorParse"),
                            intl.get("sources.errorParseHint")
                        );
                    }
                    const addSource = useSourceActions().addSource;
                    let sources: [ReturnType<typeof addSource>, number, string][] = [];
                    let errors: [string, any][] = [];
                    for (let el of doc[0].children) {
                        if (el.getAttribute("type") === "rss") {
                            let source = outlineToSource(el);
                            if (source) {
                                sources.push([source[0], -1, source[1]]);
                            }
                        } else if (
                            el.hasAttribute("text") ||
                            el.hasAttribute("title")
                        ) {
                            let groupName = el.getAttribute("text") || el.getAttribute("title");
                            let gid = get().actions.createSourceGroup(groupName);
                            for (let child of el.children) {
                                let source = outlineToSource(child);
                                if (source) {
                                    sources.push([source[0], gid, source[1]]);
                                }
                            }
                        }
                    }
                    useItemActions().fetchItemsRequest(sources.length);
                    let promises = sources.map(async ([s, gid, url]) => {
                        return (s)
                            .then(sid => {
                                if (sid !== null && gid > -1) {
                                    get().actions.addSourceToGroup(gid, sid);
                                }
                            })
                            .catch(err => {
                                errors.push([url, err]);
                            })
                            .finally(() => {
                                useItemActions().fetchItemsIntermediate();
                            })
                    })
                    Promise.allSettled(promises).then(() => {
                        useItemActions().fetchItemsSuccess([], {});
                        useAppActions().saveSettings();
                        if (errors.length > 0) {
                            window.utils.showErrorBox(
                                intl.get("sources.errorImport", {
                                    count: errors.length,
                                }),
                                errors
                                    .map(e => {
                                        return e[0] + "\n" + String(e[1]);
                                    })
                                    .join("\n"),
                                intl.get("context.copy")
                            )
                        }
                    });
                }
            });
        },
        exportOPML: () => {
            const filters = [ { name: intl.get("sources.opmlFile"), extensions: ["opml"] } ];
            window.utils
                .showSaveDialog(filters, "*/Fluent_Reader_Export.opml")
                .then(write => {
                    if (write) {
                        let state = { groups: get().groups, sources: useSources() };
                        let xml = domParser.parseFromString(
                            '<?xml version="1.0" encoding="UTF-8"?><opml version="1.0"><head><title>Fluent Reader Export</title></head><body></body></opml>',
                            "text/xml"
                        );
                        let body = xml.getElementsByTagName("body")[0];
                        for (let group of state.groups) {
                            if (group.isMultiple) {
                                let outline = xml.createElement("outline");
                                outline.setAttribute("text", group.name);
                                outline.setAttribute("title", group.name);
                                for (let sid of group.sids) {
                                    outline.appendChild(
                                        sourceToOutline(state.sources[sid], xml)
                                    );
                                }
                                body.appendChild(outline);
                            } else {
                                body.appendChild(
                                    sourceToOutline(
                                        state.sources[group.sids[0]],
                                        xml
                                    )
                                );
                            }
                        }
                        let serializer = new XMLSerializer();
                        write(
                            serializer.serializeToString(xml),
                            intl.get("settings.writeError")
                        );
                    }
                });
        },
        updateSourceGroupDone: (group: SourceGroup) => {
            set(state => ({
                groups: [
                    ...state.groups.slice(0, group.index),
                    group,
                    ...state.groups.slice(group.index + 1),
                ]
            }))
            // [appReducer]
            useAppActions().deleteSourceGroup();
        },
        updateSourceGroup: (group: SourceGroup) => {
            get().actions.updateSourceGroupDone(group);
            window.settings.saveGroups(get().groups);
        },
        removeSourceFromGroupDone: (groupIndex: number, sids: number[]) => {
            set(state => ({
                groups: [
                    ...state.groups.slice(0, groupIndex),
                    {
                        ...state.groups[groupIndex],
                        sids: state.groups[groupIndex].sids.filter(
                            sid => !sids.includes(sid)
                        ),
                    },
                    ...sids.map(sid => new SourceGroup([sid])),
                    ...state.groups.slice(groupIndex + 1),
                ]
            }))
            // [appReducer]
            useAppActions().deleteSourceGroup();
        },
        removeSourceFromGroup: (groupIndex: number, sids: number[]) => {
            get().actions.removeSourceFromGroupDone(groupIndex, sids);
            window.settings.saveGroups(get().groups);
        },
        deleteSourceGroupDone: (groupIndex: number) => {
            set(state => ({
                groups: [
                    ...state.groups.slice(0, groupIndex),
                    ...state.groups[groupIndex].sids.map(
                        sid => new SourceGroup([sid])
                    ),
                    ...state.groups.slice(groupIndex + 1),
                ]
            }))
            // [appReducer]
            useAppActions().deleteSourceGroup();
        },
        deleteSourceGroup: (groupIndex: number) => {
            get().actions.deleteSourceGroupDone(groupIndex);
            window.settings.saveGroups(get().groups);
        },
    }
}), { name: "group" }))

export const useGroups = () => useGroupStore(state => state.groups);

export const useGroupActions = () => useGroupStore(state => state.actions);

const addSource = useSourceActions().addSource;

const outlineToSource = (outline: Element): [ReturnType<typeof addSource>, string] => {
    let url = outline.getAttribute("xmlUrl");
    let name = outline.getAttribute("text") || outline.getAttribute("title");
    if (url) {
        return [addSource(url.trim(), name, true), url];
    } else {
        return null;
    }
}

const sourceToOutline = (source: RSSSource, xml: Document) => {
    let outline = xml.createElement("outline");
    outline.setAttribute("text", source.name);
    outline.setAttribute("title", source.name);
    outline.setAttribute("type", "rss");
    outline.setAttribute("xmlUrl", source.url);
    return outline;
}