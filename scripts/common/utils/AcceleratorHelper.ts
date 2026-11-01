const IS_MAC = navigator.userAgent.includes("Mac");

/** KeyboardEvent.code values that need a different name in an accelerator. */
const NAMED_KEYS: Record<string, string> = {
    Space: "Space", Enter: "Return", Tab: "Tab", Backspace: "Backspace", Delete: "Delete", Insert: "Insert",
    Home: "Home", End: "End", PageUp: "PageUp", PageDown: "PageDown",
    ArrowUp: "Up", ArrowDown: "Down", ArrowLeft: "Left", ArrowRight: "Right",
    Minus: "-", Equal: "=", Comma: ",", Period: ".", Slash: "/", Semicolon: ";", Quote: "'",
    BracketLeft: "[", BracketRight: "]", Backslash: "\\", Backquote: "`"
};

const isFunctionKey = (key: string) => /^F\d{1,2}$/.test(key);

function toKeyName(code: string): string | undefined {
    if (code.startsWith("Key")) return code.slice(3);   // KeyA -> A
    if (code.startsWith("Digit")) return code.slice(5); // Digit1 -> 1
    if (isFunctionKey(code)) return code;
    return NAMED_KEYS[code];
}

/**
 * Turns a key press into Electron's shortcut format, e.g. "Control+Alt+Space".
 * Null while only modifiers are held, or for a key that can't be used. A shortcut needs a modifier
 * (except function keys), otherwise it would swallow ordinary typing in every app.
 */
export function toAccelerator(event: KeyboardEvent): string | null {
    const key = toKeyName(event.code);
    if (!key) return null;

    const modifiers: string[] = [];
    if (event.ctrlKey) modifiers.push("Control");
    if (event.metaKey) modifiers.push(IS_MAC ? "Command" : "Super");
    if (event.altKey) modifiers.push("Alt");
    if (event.shiftKey) modifiers.push("Shift");

    if (modifiers.length === 0 && !isFunctionKey(key)) return null;
    return [...modifiers, key].join("+");
}

const DISPLAY_NAMES: Record<string, string> = IS_MAC
    ? {Control: "⌃", Command: "⌘", Alt: "⌥", Shift: "⇧", CommandOrControl: "⌘", Super: "⌘"}
    : {Control: "Ctrl", Command: "Cmd", CommandOrControl: "Ctrl", Super: "Win"};

/** "Control+Alt+Space" -> "Ctrl + Alt + Space" */
export function describeAccelerator(accelerator: string): string {
    return accelerator.split("+").map((part) => DISPLAY_NAMES[part] ?? part).join(IS_MAC ? " " : " + ");
}
