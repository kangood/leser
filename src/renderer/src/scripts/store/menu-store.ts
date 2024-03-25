import { create } from "zustand"

type ToggleMenuStore = {
    display: boolean
    toggleMenu: (display?: boolean) => void
}

export const useToggleMenuStore = create<ToggleMenuStore>(set => ({
    display: false,
    toggleMenu: value => set(state => ({ display: value !== undefined ? value : !state.display })),
}))
