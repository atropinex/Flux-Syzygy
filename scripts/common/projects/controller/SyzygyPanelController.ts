import { app, BrowserWindow, nativeImage, screen, type Display } from "electron";
import { join } from "path";
import { TRAY_ICON } from "../../icons/TrayIcon";
import type { PanelEvent, PanelSide, WindowStyle } from "../SyzygyContract";
import { PANEL_CLOSE_TIMEOUT_MS, PANEL_WINDOW_WIDTH, REGULAR_WINDOW, TOGGLE_COOLDOWN_MS, WINDOW_BACKGROUND } from "../SyzygyConfig";
import { SyzygyIPC } from "../SyzygyConnection";
import { SyzygyKeybindController } from "./SyzygyKeybindController";

export interface PanelOptions {
    style: WindowStyle;
    side: PanelSide;
    hideOnBlur: boolean;
}

/**
 * Owns the app window and everything that shows or hides it: the keybind and the focus rules. The
 * sliding itself is done by the page (CSS), because animating a window's bounds from here can't be
 * made smooth. In panel mode the window is transparent and stays put on a screen edge; the page
 * slides its panel in and out inside it.
 */
export class SyzygyPanelController {
    window: BrowserWindow | null = null;

    private readonly keybind = new SyzygyKeybindController(() => this.toggle());
    private isOpen = false;
    private quitting = false;
    private dialogDepth = 0; // >0 while a native dialog is up, which must not count as "clicked away"
    private hideTimer: NodeJS.Timeout | undefined;
    private lastToggle = 0;

    constructor(private options: PanelOptions) {}

    setOptions(changes: Partial<PanelOptions>): void {
        this.options = { ...this.options, ...changes };
    }

    // === Window === //

    /** (Re)creates the window. It stays hidden until the page reports that it is ready. */
    createWindow(): void {
        this.window?.destroy();
        this.isOpen = false;

        const isPanel = this.options.style === "panel";
        const window = new BrowserWindow({
            ...(isPanel
                ? {
                    width: PANEL_WINDOW_WIDTH, height: 800, frame: false, transparent: true, hasShadow: false,
                    resizable: false, minimizable: false, maximizable: false, fullscreenable: false,
                    skipTaskbar: true, alwaysOnTop: true, backgroundColor: "#00000000"
                }
                : { ...REGULAR_WINDOW, backgroundColor: WINDOW_BACKGROUND, autoHideMenuBar: true }),
            show: false,
            title: "Flux Syzygy",
            icon: nativeImage.createFromDataURL(TRAY_ICON),
            webPreferences: {
                preload: join(__dirname, "../preload/preloadindex.js"),
                contextIsolation: true,
                sandbox: true
            }
        });

        if (isPanel && process.platform === "darwin") {
            window.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        }

        window.on("blur", () => {
            if (this.options.style === "panel" && this.options.hideOnBlur && this.dialogDepth === 0) this.requestHide();
        });

        // Closing the window only hides it. The app keeps running so the keybind keeps working.
        window.on("close", (event) => {
            if (this.quitting) return;
            event.preventDefault();
            this.requestHide();
        });
        window.on("closed", () => {
            if (this.window === window) this.window = null;
        });

        this.window = window;
        this.loadPage(window);
    }

    /** While developing, electron-vite serves the page from a local dev server. */
    private loadPage(window: BrowserWindow): void {
        const devServerUrl = process.env["ELECTRON_RENDERER_URL"];
        if (!app.isPackaged && devServerUrl) {
            void window.loadURL(devServerUrl);
        } else {
            void window.loadFile(join(__dirname, "../renderer/index.html"));
        }
    }

    /** The page has loaded and drawn itself in its closed state: show it for the first time. */
    onRendererReady(): void {
        this.show();
    }

    // === Showing and hiding === //

    show(): void {
        const window = this.window;
        if (!window) return;
        if (this.isOpen && window.isVisible()) { // already up: nothing to animate, just take focus
            window.focus();
            return;
        }
        clearTimeout(this.hideTimer);

        if (this.options.style === "panel") {
            // Open on whichever screen the mouse is on.
            this.place(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()));
        } else if (window.isMinimized()) {
            window.restore();
        }

        this.isOpen = true;
        window.show();
        window.focus();
        this.send("open");
    }

    /** Starts hiding. In panel mode the page plays its closing animation first, then confirms. */
    requestHide(): void {
        const window = this.window;
        if (!window || !this.isOpen) return;
        this.isOpen = false;

        if (this.options.style === "panel") {
            this.send("close");
            this.hideTimer = setTimeout(() => this.finishHide(), PANEL_CLOSE_TIMEOUT_MS);
        } else {
            window.hide();
        }
    }

    /** The page finished its closing animation. */
    onRendererClosed(): void {
        this.finishHide();
    }

    toggle(): void {
        const now = Date.now();
        const sinceLast = now - this.lastToggle;
        this.lastToggle = now; // restarted by every press, so a held-down key never gets through
        if (sinceLast < TOGGLE_COOLDOWN_MS) return;

        if (this.isOpen) this.requestHide();
        else this.show();
    }

    /** Moves the window to the chosen edge after the side setting changed. */
    reposition(): void {
        if (this.window && this.options.style === "panel") this.place(screen.getDisplayMatching(this.window.getBounds()));
    }

    // === Keybind and dialogs === //

    /** Returns false (and keeps the previous shortcut) if the key combination is invalid or taken. */
    registerShortcut(accelerator: string): boolean {
        return this.keybind.register(accelerator);
    }

    unregisterShortcuts(): void {
        this.keybind.unregisterAll();
    }

    /** True while a native dialog is up. A second one must not open on top of it. */
    get dialogOpen(): boolean {
        return this.dialogDepth > 0;
    }

    /** Wrap native dialogs in this, so the focus change they cause doesn't hide the panel. */
    async withDialog<T>(run: (parent: BrowserWindow) => Promise<T>): Promise<T> {
        this.dialogDepth++;
        try {
            return await run(this.window!);
        } finally {
            this.dialogDepth--;
            this.window?.focus();
        }
    }

    // === Quitting === //

    /** Lets the window really close, e.g. because the app is quitting. */
    markQuitting(): void {
        this.quitting = true;
    }

    quit(): void {
        this.markQuitting();
        app.quit();
    }

    // === Internals === //

    /** Pins the window to the chosen edge of a display, spanning its usable height (above the taskbar). */
    private place(display: Display): void {
        const { x, y, width, height } = display.workArea;
        const left = this.options.side === "right" ? x + width - PANEL_WINDOW_WIDTH : x;
        this.window?.setBounds({ x: left, y, width: PANEL_WINDOW_WIDTH, height });
    }

    private finishHide(): void {
        clearTimeout(this.hideTimer);
        if (!this.isOpen) this.window?.hide(); // not if it was reopened in the meantime
    }

    private send(event: PanelEvent): void {
        this.window?.webContents.send(SyzygyIPC.panelEvent, event);
    }
}
