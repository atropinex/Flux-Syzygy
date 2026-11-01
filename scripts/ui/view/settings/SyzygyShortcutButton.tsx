import {useEffect, useState} from "react";
import {describeAccelerator, toAccelerator} from "../../../common/utils/AcceleratorHelper";
import {cx} from "../../../common/utils/ClassHelper";
import {changeShortcut, useSettings} from "../../controller/settings/SyzygySettings.Controller";
import {showToast} from "../../controller/toast/SyzygyToast.Controller";
import controls from "../shared/SyzygyControls.module.css";
import styles from "./SyzygySettingsPage.module.css";

/** Click, then press the new key combination. Escape or clicking away cancels. */
export default function SyzygyShortcutButton() {
    const {shortcut} = useSettings();
    const [recording, setRecording] = useState(false);

    useEffect(() => {
        if (!recording) return;

        const onKeyDown = async (event: KeyboardEvent) => {
            event.preventDefault();
            event.stopPropagation(); // so Escape cancels recording instead of closing the drawer
            if (event.key === "Escape") return setRecording(false);

            const accelerator = toAccelerator(event);
            if (!accelerator) return; // still only holding modifiers

            setRecording(false);
            const result = await changeShortcut(accelerator);
            if (result.ok) showToast(`Shortcut set to ${describeAccelerator(result.shortcut)}`);
            else showToast(result.error ?? "Could not use that shortcut.", true);
        };

        window.addEventListener("keydown", onKeyDown, true);
        return () => window.removeEventListener("keydown", onKeyDown, true);
    }, [recording]);

    return (
        <button
            className={cx(controls.btn, styles.shortcut, recording && styles.recording)}
            onClick={() => setRecording(true)}
            onBlur={() => setRecording(false)}
        >
            {recording ? "Press the new shortcut…" : describeAccelerator(shortcut)}
        </button>
    );
}
