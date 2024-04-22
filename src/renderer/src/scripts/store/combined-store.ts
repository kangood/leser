import { create } from 'zustand'
import { AppState } from '../models/app';
import { PageState } from '../models/page';
import { SourceState } from '../models/source';
import { ItemState } from '../models/item';
import { FeedState } from '../models/feed';
import { ServiceConfigs, SourceGroup } from '@renderer/schema-types';

type CombinedState = {
    sources: SourceState;
    items: ItemState;
    feeds: FeedState;
    groups: SourceGroup[];
    page: PageState;
    service?: ServiceConfigs;
    app: AppState;
}

export const useCombinedState = create<CombinedState>(() => ({
    sources: {},
    items: {},
    feeds: {},
    groups: [],
    page: new PageState(),
    app: new AppState(),
}))
