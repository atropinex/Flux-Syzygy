import {isMotionEnabled, motionScale} from "../theme/SyzygyTheme.Controller";

const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const COLLAPSE_MS = 320;
const FLIP_MS = 420;

// === Showing, hiding and removing rows === //

const running = new WeakMap<HTMLElement, Animation>();

/**
 * Shows or hides a list row. When animating, the row grows or shrinks in height while fading, so the
 * rows around it glide into place instead of jumping. The clip is vertical only, so a card's sideways
 * offset is never cut off.
 */
export async function setShown(element: HTMLElement, shown: boolean, animate: boolean): Promise<void> {
    if (element.dataset.shown === String(shown)) return;
    element.dataset.shown = String(shown);
    running.get(element)?.cancel();

    const scale = motionScale();
    if (!animate || scale === 0) {
        element.hidden = !shown;
        return;
    }

    element.hidden = false;
    const height = element.offsetHeight;
    const {marginTop, marginBottom} = getComputedStyle(element);
    const open = {height: `${height}px`, opacity: 1, marginTop, marginBottom};
    const closed = {height: "0px", opacity: 0, marginTop: "0px", marginBottom: "0px"};

    element.style.clipPath = "inset(0 -80px)";
    const animation = element.animate(shown ? [closed, open] : [open, closed], {
        duration: COLLAPSE_MS * scale, easing: EASING, fill: "forwards"
    });
    running.set(element, animation);

    try {
        await animation.finished;
    } catch {
        return; // interrupted by a newer change, which now owns the element
    }

    if (running.get(element) !== animation) return;
    if (!shown) element.hidden = true;
    animation.cancel();
    element.style.clipPath = "";
}

/** Collapses a row's height and fades it out. Resolves when it is gone, so it can then be removed. */
export async function animateRemoval(element: HTMLElement): Promise<void> {
    const height = element.offsetHeight;
    element.style.clipPath = "inset(0 -80px)";

    const animation = element.animate(
        [{height: `${height}px`, opacity: 1}, {height: "0px", opacity: 0, marginTop: "0px", marginBottom: "0px"}],
        {duration: COLLAPSE_MS * motionScale(), easing: EASING, fill: "forwards"}
    );
    await animation.finished.catch(() => undefined);
}

// === Rows that change places (FLIP: measure, move, animate from the old spot) === //

let listElement: HTMLElement | null = null;
let pendingTops: Map<string, number> | null = null;

const visibleRows = () => Array.from(listElement?.querySelectorAll<HTMLElement>("[data-row]:not([hidden])") ?? []);

/** Call this just before a change that reorders rows (e.g. moving a project to a group). */
export function prepareFlip(): void {
    pendingTops = new Map(visibleRows().map((row) => [row.dataset.rowKey ?? "", row.getBoundingClientRect().top]));
}

/** Call this after the rows were reordered: each one glides from where it was to where it is now. */
export function playFlip(): void {
    const before = pendingTops;
    pendingTops = null;
    if (!before || !isMotionEnabled()) return;

    for (const row of visibleRows()) {
        const oldTop = before.get(row.dataset.rowKey ?? "");
        if (oldTop === undefined) continue; // a new row
        const shift = oldTop - row.getBoundingClientRect().top;
        if (Math.abs(shift) > 1) {
            row.animate([{translate: `0 ${shift}px`}, {translate: "0 0"}], {
                duration: FLIP_MS * motionScale(),
                easing: EASING
            });
        }
    }
}

// === The drum-like bend of the list === //

/**
 * Cards near the vertical centre stick out toward the middle of the screen, and cards toward the top
 * and bottom recede toward the screen edge the panel is docked to. On the right edge that draws a "(",
 * on the left edge a ")". Only `transform` is written, so it stays on the GPU.
 */
const MAX_DRIFT_PX = 38;
let frame = 0;
let runUntil = 0;

function updateCurve(): void {
    const rows = visibleRows();
    if (!listElement || !isMotionEnabled()) {
        rows.forEach((row) => (row.style.transform = ""));
        return;
    }

    const direction = document.documentElement.dataset.side === "left" ? -1 : 1; // +1 = toward the right edge
    const bounds = listElement.getBoundingClientRect();
    const centre = bounds.top + bounds.height / 2;
    const half = bounds.height / 2;

    // Read every position first, then write, so the browser lays out once.
    const offsets = rows.map((row) => {
        const rect = row.getBoundingClientRect();
        const distance = Math.min(1.6, Math.abs(rect.top + rect.height / 2 - centre) / half);
        return distance * distance * MAX_DRIFT_PX * direction;
    });
    rows.forEach((row, index) => (row.style.transform = `translate3d(${offsets[index].toFixed(1)}px,0,0)`));
}

function requestCurve(): void {
    if (frame) return;
    frame = requestAnimationFrame(() => {
        frame = 0;
        updateCurve();
        if (performance.now() < runUntil) requestCurve();
    });
}

/** Keep updating for `ms` milliseconds, e.g. while a card expands and the layout moves. */
export function keepCurveUpdating(ms: number): void {
    runUntil = Math.max(runUntil, performance.now() + ms);
    requestCurve();
}

/** Starts bending the list. Returns a function that stops. */
export function attachList(list: HTMLElement): () => void {
    listElement = list;
    const onChange = () => requestCurve();
    list.addEventListener("scroll", onChange, {passive: true});
    window.addEventListener("resize", onChange);
    keepCurveUpdating(600);

    return () => {
        list.removeEventListener("scroll", onChange);
        window.removeEventListener("resize", onChange);
        if (listElement === list) listElement = null;
    };
}
