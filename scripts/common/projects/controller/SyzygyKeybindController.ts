import { globalShortcut } from "electron";

/** The global shortcut that shows and hides the panel, from any app. */
export class SyzygyKeybindController {
    private current = "";

    constructor(private readonly onTrigger: () => void) {}

    /** Registers the shortcut, replacing the previous one. Returns false (and keeps the old one) if it can't be used. */
    register(accelerator: string): boolean {
        const previous = this.current;
        if (previous) globalShortcut.unregister(previous);

        let isRegistered = false;
        try {
            isRegistered = globalShortcut.register(accelerator, this.onTrigger);
        } catch {
            // An invalid accelerator ends up here.
        }

        if (isRegistered) {
            this.current = accelerator;
            return true;
        }

        if (previous) {
            try {
                globalShortcut.register(previous, this.onTrigger);
            } catch {
                // Keep going: the old one simply stays unregistered.
            }
        }
        return false;
    }

    unregisterAll(): void {
        globalShortcut.unregisterAll();
    }
}
