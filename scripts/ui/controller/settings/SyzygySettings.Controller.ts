import type { Settings, ShortcutResult } from "../../../common/CommonInterface";
import type { PanelOption, WindowStyle } from "../../../common/projects/SyzygyContract";
import { exclusive } from "../../../common/utils/ExclusiveHelper";
import { createStore, useStore } from "../store/SyzygyStore.Controller";

export const settingsStore = createStore<Settings>({
    themeId: "midnight",
    windowStyle: "panel",
    panelSide: "right",
    shortcut: "",
    hideOnBlur: true,
    hideAfterOpen: true
});

/** Whether the settings drawer is open. */
const drawerStore = createStore<boolean>(false);

export const useSettings = () => useStore(settingsStore);
export const useSettingsOpen = () => useStore(drawerStore);

export async function loadSettings(): Promise<Settings> {
    const settings = await window.api.getSettings();
    settingsStore.set(settings);
    return settings;
}

export const openSettings = () => drawerStore.set(true);
export const closeSettings = () => drawerStore.set(false);
export const isSettingsOpen = () => drawerStore.get();

/** Asks the main process to use a new shortcut. It refuses one that is invalid or already taken. */
export async function changeShortcut(accelerator: string): Promise<ShortcutResult> {
    const result = await window.api.setShortcut(accelerator);
    settingsStore.set((settings) => ({ ...settings, shortcut: result.shortcut }));
    return result;
}

export async function changePanelOption(option: PanelOption, value: boolean): Promise<void> {
    settingsStore.set((settings) => ({ ...settings, [option]: value }));
    await window.api.setPanelOption(option, value);
}

/** The window is rebuilt, so the page that asked is replaced by a new one. */
export const changeWindowStyle = exclusive(async (style: WindowStyle): Promise<void> => {
    if (settingsStore.get().windowStyle === style) return;
    settingsStore.set((settings) => ({ ...settings, windowStyle: style }));
    await window.api.setWindowStyle(style);
});

export const quitApp = () => void window.api.quitApp();
