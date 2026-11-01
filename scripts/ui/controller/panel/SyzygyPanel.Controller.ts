import type {PanelSide} from "../../../common/projects/SyzygyContract";
import {settingsStore} from "../settings/SyzygySettings.Controller";
import {motionScale} from "../theme/SyzygyTheme.Controller";

/**
 * The slide-in panel. The main process shows the (transparent) window and tells us to "open" or
 * "close"; the movement itself is plain CSS, driven by data attributes on <html>, so it runs on the
 * GPU and stays smooth. See "Panel mode" in the CSS modules.
 *
 *   data-mode="panel"   the window is a slide-in panel
 *   data-side="right"   which screen edge it docks to
 *   data-closed         the panel is currently slid away
 */
const root = document.documentElement;

/**
 * Bumped by every open and close. An animation step only goes ahead if nothing newer has started
 * since, so pressing the shortcut repeatedly can never leave the panel half-open or stuck.
 */
let token = 0;

export const isPanelMode = () => settingsStore.get().windowStyle === "panel";

/** Numbers the visible rows 0, 1, 2... so the list can slide in (and out) one after another. */
function assignStagger(): void {
    let index = 0;
    for (const row of Array.from(document.querySelectorAll<HTMLElement>("[data-row]:not([hidden])"))) {
        row.style.setProperty("--i", String(Math.min(index++, 12)));
    }
}

function open(onOpened: () => void): void {
    const mine = ++token;
    assignStagger();

    // The window has just appeared in its closed state. Wait two frames so that is painted first,
    // otherwise the browser would skip straight to the open state without animating.
    requestAnimationFrame(() => requestAnimationFrame(() => {
        if (mine !== token) return; // closed again in the meantime
        delete root.dataset.closed;
        onOpened();
    }));
}

/** Slides the panel out and resolves once it has left the screen. */
function slideOut(): Promise<void> {
    root.dataset.closed = "";
    if (motionScale() === 0) return Promise.resolve();

    const panel = document.querySelector<HTMLElement>("[data-panel]");
    return new Promise((resolve) => {
        const done = () => {
            panel?.removeEventListener("transitionend", onEnd);
            window.clearTimeout(fallback);
            resolve();
        };
        const onEnd = (event: TransitionEvent) => {
            if (event.target === panel && event.propertyName === "transform") done();
        };
        panel?.addEventListener("transitionend", onEnd);
        const fallback = window.setTimeout(done, 900 * motionScale() + 100); // in case no transition end arrives
    });
}

function close(): void {
    const mine = ++token;
    assignStagger();
    // Tell the main process once the panel has left, so it can hide the window.
    void slideOut().then(() => {
        if (mine === token) void window.api.panelClosed();
    });
}

/** Starts listening to the shortcut. Returns a function that stops. `onOpened` runs each time the panel arrives. */
export function initializePanel(onOpened: () => void): () => void {
    if (!isPanelMode()) return () => undefined;

    // Start off-screen. The first "open" from the main process slides it in.
    root.dataset.mode = "panel";
    root.dataset.side = settingsStore.get().panelSide;
    root.dataset.closed = "";
    return window.api.onPanelEvent((event) => (event === "open" ? open(onOpened) : close()));
}

/** Moves the panel to the other screen edge: it slides away on the old side and arrives on the new one. */
export async function changePanelSide(side: PanelSide): Promise<void> {
    if (side === settingsStore.get().panelSide) return;

    assignStagger();
    await slideOut();
    await window.api.setPanelSide(side); // the window moves while the panel is out of sight
    settingsStore.set((settings) => ({...settings, panelSide: side}));
    root.dataset.side = side;
    open(() => undefined);
}

export function hidePanel(): void {
    if (isPanelMode()) void window.api.hidePanel();
}

/** Called after a project has been opened. */
export function hideAfterOpening(): void {
    if (settingsStore.get().hideAfterOpen) hidePanel();
}

/** Clicking the transparent area beside the panel dismisses it. */
export function handleStagePointerDown(event: { target: EventTarget | null; currentTarget: EventTarget }): void {
    if (event.target === event.currentTarget) hidePanel();
}
