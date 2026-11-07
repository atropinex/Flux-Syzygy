import { randomUUID } from "crypto";
import { BrowserWindow, ipcMain, nativeImage, shell } from "electron";
import { promises as fs } from "fs";
import { basename, join } from "path";
import { pathToFileURL } from "url";
import type {
    ExtensionInfo, ExtensionNotice, ExtensionProjectInfo, ExtensionWindowInfo, ExtensionWindowOptions
} from "../../CommonInterface";
import { TRAY_ICON } from "../../icons/TrayIcon";
import { ExtensionHostModel, type HostServices } from "../../models/ExtensionHostModel";
import { ExtensionModel, type DiscoveredExtension } from "../../models/ExtensionModel";
import { ExtensionRegistryModel } from "../../models/ExtensionRegistryModel";
import { ProjectModel } from "../../models/ProjectModel";
import { ScannerModel } from "../../models/ScannerModel";
import { SettingsModel } from "../../models/SettingsModel";
import { StoreModel } from "../../models/StoreModel";
import { FALLBACK_COLORS, ThemeModel } from "../../models/ThemeModel";
import { EXTENSION_PUSH_DELAY_MS, WINDOW_BACKGROUND } from "../SyzygyConfig";
import { SyzygyIPC } from "../SyzygyConnection";
import { SyzygyExtensionIPC } from "../SyzygyExtensionConnection";
import { SyzygyPanelController } from "./SyzygyPanelController";

interface OpenWindow {
    extensionId: string;
    window: BrowserWindow;
    contentsId: number;  // identifies the page, so a message can be traced back to its window
    data: unknown;
}

const clamp = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;

const parseObject = (raw: unknown): Record<string, unknown> =>
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

/**
 * Starts the extensions and connects them to the rest of the app: their badges and menu items reach
 * the page, their windows are created here, and what those windows ask for is passed to the right extension.
 */
export class SyzygyExtensionController {
    private readonly hosts = new Map<string, ExtensionHostModel>();
    private readonly errors = new Map<string, string>();
    private readonly windows = new Map<string, OpenWindow>();           // by window id
    private readonly closeListeners = new Map<string, Set<(windowId: string) => void>>(); // by extension id
    private readonly storages = new Map<string, StoreModel<Record<string, unknown>>>();
    private discovered: DiscoveredExtension[] = [];
    private disabled = new Set<string>();
    private pushTimer: NodeJS.Timeout | undefined;

    constructor(
        private readonly panel: SyzygyPanelController,
        private readonly extensions: ExtensionModel,
        private readonly registry: ExtensionRegistryModel,
        private readonly projects: ProjectModel,
        private readonly scanner: ScannerModel,
        private readonly settings: SettingsModel,
        private readonly themes: ThemeModel
    ) {}

    register(): void {
        this.registry.onChange(() => this.schedulePush());

        ipcMain.handle(SyzygyIPC.listExtensions, () => this.describeAll());
        ipcMain.handle(SyzygyIPC.getExtensionContributions, () => this.registry.snapshot());
        ipcMain.handle(SyzygyIPC.openExtensionsFolder, async () => {
            await this.extensions.discover(); // makes sure the folder exists
            await shell.openPath(this.extensions.userFolder);
        });
        ipcMain.handle(SyzygyIPC.reloadExtensions, async () => {
            await this.stop();
            await this.start();
            return this.describeAll();
        });
        ipcMain.handle(SyzygyIPC.setExtensionEnabled, async (_event, id: string, enabled: boolean) => {
            await this.setEnabled(String(id), Boolean(enabled));
            return this.describeAll();
        });
        ipcMain.handle(SyzygyIPC.runExtensionCommand, (_event, extensionId: string, command: string, args?: unknown) =>
            this.runCommand(String(extensionId), String(command), args));

        // Calls from an extension's own windows. The extension is found from the window that sent the
        // call, never from anything the page says, so one extension's window cannot speak for another.
        ipcMain.handle(SyzygyExtensionIPC.windowInfo, async (event) => {
            const owner = this.ownerOf(event.sender.id);
            if (!owner) return null;
            const info: ExtensionWindowInfo = {
                extensionId: owner.extensionId, windowId: owner.windowId, data: owner.entry.data, theme: await this.currentTheme()
            };
            return info;
        });
        ipcMain.handle(SyzygyExtensionIPC.invoke, (event, channel: string, payload: unknown) => {
            const owner = this.ownerOf(event.sender.id);
            const host = owner && this.hosts.get(owner.extensionId);
            if (!owner || !host) throw new Error("This window does not belong to a running extension.");
            return host.invoke(String(channel), payload, { windowId: owner.windowId });
        });
        ipcMain.handle(SyzygyExtensionIPC.close, (event) => {
            this.ownerOf(event.sender.id)?.entry.window.close();
        });
    }

    // === Starting and stopping === //

    async start(): Promise<void> {
        this.discovered = await this.extensions.discover();
        this.disabled = new Set((await this.settings.read()).disabledExtensions);

        await Promise.all(this.discovered.filter((found) => found.manifest && !this.disabled.has(found.id)).map((found) => this.load(found)));
        this.schedulePush();
    }

    /** Deactivates every extension (also called when the app quits, so their processes are stopped). */
    async stop(): Promise<void> {
        await Promise.all([...this.hosts.keys()].map((id) => this.unload(id)));
    }

    private async load(found: DiscoveredExtension): Promise<void> {
        const host = new ExtensionHostModel(found.manifest!, found.folder, this.services);
        try {
            await host.activate();
            this.hosts.set(found.id, host);
            this.errors.delete(found.id);
        } catch (error) {
            this.errors.set(found.id, (error as Error).message);
            await host.deactivate();
            this.registry.clearExtension(found.id);
        }
    }

    private async unload(id: string): Promise<void> {
        const host = this.hosts.get(id);
        this.hosts.delete(id);
        for (const [windowId, entry] of this.windows) {
            if (entry.extensionId === id) this.windows.get(windowId)?.window.destroy();
        }
        await host?.deactivate();
        this.registry.clearExtension(id);
    }

    private async setEnabled(id: string, enabled: boolean): Promise<void> {
        await this.settings.update((settings) => ({
            ...settings,
            disabledExtensions: enabled ? settings.disabledExtensions.filter((item) => item !== id) : [...new Set([...settings.disabledExtensions, id])]
        }));

        if (enabled) {
            this.disabled.delete(id);
            const found = this.discovered.find((item) => item.id === id);
            if (found?.manifest) await this.load(found);
        } else {
            this.disabled.add(id);
            this.errors.delete(id);
            await this.unload(id);
        }
    }

    private async runCommand(extensionId: string, command: string, args: unknown): Promise<void> {
        const host = this.hosts.get(extensionId);
        if (!host) return;
        try {
            await host.runCommand(command, args);
        } catch (error) {
            this.notify(extensionId, (error as Error).message, true);
        }
    }

    // === What the page is told === //

    private describeAll(): ExtensionInfo[] {
        return this.discovered.map((found) => {
            const enabled = !this.disabled.has(found.id);
            const error = found.problem ?? this.errors.get(found.id) ?? null;
            return {
                id: found.id,
                name: found.manifest?.name ?? found.id,
                version: found.manifest?.version ?? "",
                description: found.manifest?.description ?? "",
                author: found.manifest?.author ?? "",
                folder: found.folder,
                enabled,
                status: error ? "error" : this.hosts.has(found.id) ? "active" : "disabled",
                error
            } satisfies ExtensionInfo;
        });
    }

    /** Badges change in bursts (a dozen projects finishing a check). The page is sent one update, not a dozen. */
    private schedulePush(): void {
        clearTimeout(this.pushTimer);
        this.pushTimer = setTimeout(() => {
            this.panel.window?.webContents.send(SyzygyIPC.extensionsChanged, this.registry.snapshot());
        }, EXTENSION_PUSH_DELAY_MS);
    }

    private notify(extensionId: string, message: string, isError: boolean): void {
        const name = this.hosts.get(extensionId)?.manifest.name ?? extensionId;
        const notice: ExtensionNotice = { message: `${name}: ${message}`, isError };
        this.panel.window?.webContents.send(SyzygyIPC.extensionNotice, notice);
    }

    // === Windows === //

    private ownerOf(contentsId: number): { windowId: string; extensionId: string; entry: OpenWindow } | null {
        for (const [windowId, entry] of this.windows) {
            if (entry.contentsId === contentsId) return { windowId, extensionId: entry.extensionId, entry };
        }
        return null;
    }

    /** Matches the app's theme, so an extension's window does not look foreign. */
    private async currentTheme(): Promise<ExtensionWindowInfo["theme"]> {
        const { themeId } = await this.settings.read();
        const { themes } = await this.themes.load();
        const theme = themes.find((item) => item.id === themeId) ?? themes[0];
        return theme ? { mode: theme.mode, colors: theme.colors } : { mode: "dark", colors: FALLBACK_COLORS };
    }

    private openWindow(host: ExtensionHostModel, options: ExtensionWindowOptions): string {
        const extensionId = host.manifest.id;
        const windowId = `${extensionId}:${options.id ? String(options.id) : randomUUID()}`;

        const existing = this.windows.get(windowId);
        if (existing && !existing.window.isDestroyed()) {
            existing.data = options.data;
            existing.window.show();
            existing.window.focus();
            existing.window.webContents.send(SyzygyExtensionIPC.message, "syzygy:data", options.data);
            return windowId;
        }

        const page = host.resolveInside(options.page);
        const window = new BrowserWindow({
            width: clamp(options.width, 480, 2400, 1000),
            height: clamp(options.height, 320, 1600, 700),
            minWidth: 520,
            minHeight: 360,
            show: false,
            autoHideMenuBar: true,
            backgroundColor: WINDOW_BACKGROUND,
            title: String(options.title ?? host.manifest.name).slice(0, 80),
            icon: nativeImage.createFromDataURL(TRAY_ICON),
            webPreferences: {
                preload: join(__dirname, "../preload/preloadextension.js"),
                contextIsolation: true,
                sandbox: true
            }
        });
        window.removeMenu();

        this.windows.set(windowId, { extensionId, window, contentsId: window.webContents.id, data: options.data });
        window.once("ready-to-show", () => window.show());
        window.on("closed", () => {
            this.windows.delete(windowId);
            for (const listener of this.closeListeners.get(extensionId) ?? []) {
                try { listener(windowId); } catch { /* one extension's listener must not break another */ }
            }
        });

        // The page may only show the extension's own files.
        const root = pathToFileURL(host.folder).href;
        window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
        window.webContents.on("will-navigate", (event, url) => {
            if (!url.startsWith(root)) event.preventDefault();
        });

        void window.loadFile(page);
        return windowId;
    }

    // === What extensions are offered === //

    private readonly services: HostServices = {
        listProjects: () => this.listProjects(),
        onProjectsChanged: (listener) => this.projects.onChange(listener),
        contribute: (extensionId, projectId, contribution) => this.registry.set(extensionId, projectId, contribution),
        clearContribution: (extensionId, projectId) => this.registry.clearProject(extensionId, projectId),
        notify: (extensionId, message, isError) => this.notify(extensionId, message, isError),

        openExternal: async (raw) => {
            const url = new URL(raw);
            if (url.protocol !== "https:") throw new Error("Only https links can be opened.");
            await shell.openExternal(url.href);
        },

        openWindow: (host, options) => this.openWindow(host, options),
        sendToWindow: (extensionId, windowId, channel, payload) => {
            const entry = this.windows.get(windowId);
            if (entry?.extensionId === extensionId && !entry.window.isDestroyed()) {
                entry.window.webContents.send(SyzygyExtensionIPC.message, channel, payload);
            }
        },
        closeWindow: (extensionId, windowId) => {
            const entry = this.windows.get(windowId);
            if (entry?.extensionId === extensionId) entry.window.close();
        },
        onWindowClosed: (extensionId, listener) => {
            const listeners = this.closeListeners.get(extensionId) ?? new Set();
            listeners.add(listener);
            this.closeListeners.set(extensionId, listeners);
            return () => { listeners.delete(listener); };
        },

        storageGet: async (extensionId, key, fallback) => (await this.storageFor(extensionId).read())[key] ?? fallback,
        storageSet: (extensionId, key, value) => this.storageFor(extensionId).update((data) => ({ ...data, [key]: value }))
    };

    private async listProjects(): Promise<ExtensionProjectInfo[]> {
        return Promise.all((await this.projects.list()).map(async (project) => ({
            id: project.id,
            name: basename(project.path),
            path: project.path,
            kind: this.scanner.detectKind(await fs.readdir(project.path).catch(() => [] as string[]))
        })));
    }

    /** Each extension has its own small file for the things it wants to remember. */
    private storageFor(extensionId: string): StoreModel<Record<string, unknown>> {
        let store = this.storages.get(extensionId);
        if (!store) {
            store = new StoreModel<Record<string, unknown>>(join("extension-data", `${extensionId}.json`), parseObject);
            this.storages.set(extensionId, store);
        }
        return store;
    }
}
