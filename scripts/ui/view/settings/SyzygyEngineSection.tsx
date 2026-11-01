import { rescanEngines, useEditors } from "../../controller/editor/SyzygyEditor.Controller";
import controls from "../shared/SyzygyControls.module.css";
import styles from "./SyzygySettingsPage.module.css";

/** The Unity, Unreal Engine and Cocos Creator editors that were found on this computer. */
export default function SyzygyEngineSection() {
    const engines = useEditors().ides.filter((ide) => !ide.custom);

    return (
        <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Engine editors</h3>
            <p className={controls.muted}>
                Unity, Unreal Engine and Cocos Creator installs are found automatically. Each project's engine button opens the exact version it was saved with.
            </p>

            {engines.length > 0 ? (
                <ul className={styles.ideList}>
                    {engines.map((engine) => (
                        <li key={engine.id} className={styles.ideRow}>
                            <div className={styles.ideMain}>
                                <span className={styles.ideName}>{engine.label}</span>
                                <span className={`${controls.muted} ${controls.small} ${styles.idePath}`}>{engine.detail}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className={styles.emptyNote}>
                    None found. Install them through Unity Hub, the Epic Games Launcher or Cocos Dashboard, then rescan. Other locations can be added below as an IDE.
                </p>
            )}

            <div className={styles.row}>
                <button className={controls.btn} onClick={() => void rescanEngines()}>Rescan</button>
            </div>
        </section>
    );
}
