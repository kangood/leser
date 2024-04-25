import { create } from 'zustand'
import { SourceGroup } from '@renderer/schema-types';
import { SourceGroupActionTypes } from '../models/group';
import { SourceState } from '../models/source';

type GroupStore = {
    groups: SourceGroup[];
    sourceGroupActionTypes?: SourceGroupActionTypes;
    reorderSourceGroups: (groups: SourceGroup[]) => void;
    fixBrokenGroups: (sources: SourceState) => void;
    createSourceGroupDone: (group: SourceGroup) => void;
    createSourceGroup: (name: string) => number;
    addSourceToGroupDone: (groupIndex: number, sid: number) => void;
    addSourceToGroup: (groupIndex: number, sid: number) => void;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
    groups: [],
    reorderSourceGroups: (groups: SourceGroup[]) => {
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
            get().reorderSourceGroups(newGroups);
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
        get().createSourceGroupDone(group);
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
    },
    addSourceToGroup: (groupIndex: number, sid: number) => {
        get().addSourceToGroupDone(groupIndex, sid);
        window.settings.saveGroups(get().groups);
    }
}))
