import { create } from "zustand"
import { devtools } from "zustand/middleware"

type ToggleMenuStore = {
    display: boolean
    toggleMenu: (display?: boolean) => void
}

export const useToggleMenuStore = create<ToggleMenuStore>()(devtools(set => ({
    display: false,
    toggleMenu: value => set(state => ({ display: value !== undefined ? value : !state.display })),
}), { name: "menu" }))
