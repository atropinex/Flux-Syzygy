import {useEffect, useRef} from "react";
import {closeSettings, useSettingsOpen} from "../../controller/settings/SyzygySettings.Controller";
import {cx} from "../../../common/utils/ClassHelper";
import controls from "../shared/SyzygyControls.module.css";
import SyzygyEngineSection from "./SyzygyEngineSection";
import SyzygyIdeSection from "./SyzygyIdeSection";
import SyzygyThemeSection from "./SyzygyThemeSection";
import SyzygyWindowSection from "./SyzygyWindowSection";
import styles from "./SyzygySettingsPage.module.css";

/** The settings drawer. It slides in from inside the panel's edge. */
export default function SyzygySettingsPage() {
    const open = useSettingsOpen();
    const drawerRef = useRef<HTMLElement>(null);
    const wasOpen = useRef(false);

    useEffect(() => {
        const drawer = drawerRef.current;
        if (!drawer) return;

        drawer.inert = !open; // closed controls must not be reachable with the Tab key
        if (open) {
            drawer.querySelector<HTMLElement>("button, input")?.focus();
        } else if (wasOpen.current) {
            document.querySelector<HTMLElement>("[data-settings-button]")?.focus();
        }
        wasOpen.current = open;
    }, [open]);

    return (
        <div className={styles.drawerHost}>
            <div className={cx(styles.scrim, open && styles.scrimOpen)} onClick={closeSettings}/>

            <aside ref={drawerRef} className={cx(styles.settings, open && styles.settingsOpen)} aria-label="Settings">
                <div className={styles.settingsHead}>
                    <h2 className={styles.settingsTitle}>Settings</h2>
                    <button className={controls.iconBtn} aria-label="Close settings" onClick={closeSettings}>✕</button>
                </div>

                <div className={styles.settingsBody}>
                    <SyzygyThemeSection/>
                    <SyzygyWindowSection/>
                    <SyzygyEngineSection/>
                    <SyzygyIdeSection/>
                </div>
            </aside>
        </div>
    );
}
