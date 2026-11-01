import { ipcMain, shell } from "electron";
import type { ShortcutResult } from "../../CommonInterface";
import { SettingsModel } from "../../models/SettingsModel";
import { ThemeModel } from "../../models/ThemeModel";
import { Cooldown } from "../../utils/CooldownHelper";
import { SHORT_COOLDOWN_MS, STYLE_SWITCH_COOLDOWN_MS } from "../SyzygyConfig";
import { SyzygyIPC } from "../SyzygyConnection";
import type { PanelOption, PanelSide, WindowStyle } from "../SyzygyContract";
import { SyzygyPanelController } from "./SyzygyPanelController";

/** Keeps only valid values: this data comes from the page. */
const isPanelOption = (value: unknown): value is PanelOption => value === "hideOnBlur" || value === "hideAfterOpen";
const isSide = (value: unknown): value is PanelSide => value === "left" || value === "right";
const isStyle = (value: unknown): value is WindowStyle => value === "panel" || value === "window";

/** Answers the page's requests about settings, themes and the panel itself. */
export class SyzygySettingsController {
    private readonly cooldown = new Cooldown();

    constructor(
        private readonly panel: SyzygyPanelController,
        private readonly settings: SettingsModel,
        private readonly themes: ThemeModel
    ) {}

    register(): void {
        ipcMain.handle(SyzygyIPC.getSettings, () => this.settings.toPublic());

        ipcMain.handle(SyzygyIPC.listThemes, () => this.themes.load());
        ipcMain.handle(SyzygyIPC.setTheme, (_event, themeId: string) => this.settings.patch({ themeId: String(themeId) }));
        ipcMain.handle(SyzygyIPC.openThemesFolder, async () => {
            if (this.cooldown.tooSoon("themes-folder", SHORT_COOLDOWN_MS)) return;
            await this.themes.load(); // makes sure the folder exists
            await shell.openPath(this.themes.folder);
        });

        // The page calls these as it loads, opens and closes.
        ipcMain.handle(SyzygyIPC.panelReady, () => this.panel.onRendererReady());
        ipcMain.handle(SyzygyIPC.panelClosed, () => this.panel.onRendererClosed());
        ipcMain.handle(SyzygyIPC.hidePanel, () => this.panel.requestHide());
        ipcMain.handle(SyzygyIPC.quitApp, () => this.panel.quit());

        ipcMain.handle(SyzygyIPC.setShortcut, (_event, accelerator: string) => this.setShortcut(String(accelerator)));
        ipcMain.handle(SyzygyIPC.setPanelOption, async (_event, option: PanelOption, value: boolean) => {
            if (!isPanelOption(option)) return;
            await this.settings.patch({ [option]: Boolean(value) });
            if (option === "hideOnBlur") this.panel.setOptions({ hideOnBlur: Boolean(value) });
        });
        ipcMain.handle(SyzygyIPC.setPanelSide, async (_event, side: PanelSide) => {
            if (!isSide(side)) return;
            await this.settings.patch({ panelSide: side });
            this.panel.setOptions({ side });
            this.panel.reposition();
        });

        // Switching style rebuilds the window, so the page that asked is replaced by a new one.
        ipcMain.handle(SyzygyIPC.setWindowStyle, async (_event, style: WindowStyle) => {
            if (!isStyle(style) || this.cooldown.tooSoon("window-style", STYLE_SWITCH_COOLDOWN_MS)) return;
            await this.settings.patch({ windowStyle: style });
            this.panel.setOptions({ style });
            this.panel.createWindow();
        });
    }

    private async setShortcut(accelerator: string): Promise<ShortcutResult> {
        const { shortcut: current } = await this.settings.read();
        if (accelerator === current) return { ok: true, shortcut: current };

        if (!this.panel.registerShortcut(accelerator)) {
            return { ok: false, shortcut: current, error: "That shortcut is already used by another app, or isn't valid." };
        }
        await this.settings.patch({ shortcut: accelerator });
        return { ok: true, shortcut: accelerator };
    }
}
