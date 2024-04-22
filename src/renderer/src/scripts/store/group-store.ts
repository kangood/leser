import { create } from 'zustand'
import { useCombinedState } from './combined-store'
import { SourceGroup } from '@renderer/schema-types';
import { ADD_SOURCE_TO_GROUP, CREATE_SOURCE_GROUP, SourceGroupActionTypes } from '../models/group';

type GroupStore = {
    sourceGroupActionTypes?: SourceGroupActionTypes;
    createSourceGroupDone: (group: SourceGroup) => void;
    createSourceGroup: (name: string) => number;
    addSourceToGroupDone: (groupIndex: number, sid: number) => void;
    addSourceToGroup: (groupIndex: number, sid: number) => void;
}

export const useGroupStore = create<GroupStore>((set, get) => ({
    createSourceGroupDone: (group: SourceGroup) => {
        set({ sourceGroupActionTypes: { type: CREATE_SOURCE_GROUP, group: group } })
    },
    createSourceGroup: (name: string) => {
        let groups = useCombinedState.getState().groups;
        for (let i = 0; i < groups.length; i += 1) {
            const g = groups[i];
            if (g.isMultiple && g.name === name) {
                return i;
            }
        }
        let group = new SourceGroup([], name);
        get().createSourceGroupDone(group);
        groups = useCombinedState.getState().groups;
        window.settings.saveGroups(groups);
        return groups.length - 1;
    },
    addSourceToGroupDone: (groupIndex: number, sid: number) => {
        set({ sourceGroupActionTypes: { type: ADD_SOURCE_TO_GROUP, groupIndex: groupIndex, sid: sid } });
    },
    addSourceToGroup: (groupIndex: number, sid: number) => {
        get().addSourceToGroupDone(groupIndex, sid);
        window.settings.saveGroups(useCombinedState.getState().groups);
    }
}))
