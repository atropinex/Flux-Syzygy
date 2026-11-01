import type {Settings, StoredSettings} from "../CommonInterface";
import {DEFAULT_SHORTCUT, DEFAULT_THEME_ID} from "../projects/SyzygyConfig";
import {StoreModel} from "./StoreModel";

const DEFAULTS: StoredSettings = {
    themeId: DEFAULT_THEME_ID,
    windowStyle: "panel",
    panelSide: "right",
    shortcut: DEFAULT_SHORTCUT,
    hideOnBlur: true,
    hideAfterOpen: true,
    customIdes: [],
    groups: []
};

const parseSettings = (raw: unknown): StoredSettings =>
    ({...DEFAULTS, ...(raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {})});

/** The app's settings, saved on this computer. Groups and the IDEs the user added are kept here too. */
export class SettingsModel {
    private readonly store = new StoreModel<StoredSettings>("settings.json", parseSettings);

    read(): Promise<StoredSettings> {
        return this.store.read();
    }

    update(change: (settings: StoredSettings) => StoredSettings): Promise<void> {
        return this.store.update(change);
    }

    patch(changes: Partial<StoredSettings>): Promise<void> {
        return this.update((settings) => ({...settings, ...changes}));
    }

    /** Only what the page is allowed to see. */
    async toPublic(): Promise<Settings> {
        const {themeId, windowStyle, panelSide, shortcut, hideOnBlur, hideAfterOpen} = await this.read();
        return {themeId, windowStyle, panelSide, shortcut, hideOnBlur, hideAfterOpen};
    }
}
