import type { ExtensionInfo } from "../../../common/CommonInterface";
import { cx } from "../../../common/utils/ClassHelper";
import {
    openExtensionsFolder, reloadExtensions, setExtensionEnabled, useExtensions
} from "../../controller/extension/SyzygyExtension.Controller";
import controls from "../shared/SyzygyControls.module.css";
import SyzygySwitch from "./SyzygySwitch";
import styles from "./SyzygySettingsPage.module.css";

/** The installed extensions: switch them on and off, reload them, and find their folder. */
export default function SyzygyExtensionSection() {
    const { extensions } = useExtensions();

    return (
        <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Extensions</h3>
            <p className={controls.muted}>
                Extensions add badges, menu items and windows. They run with full access to your computer, so only install ones you trust.
            </p>

            {extensions.length > 0 ? (
                <ul className={styles.ideList}>
                    {extensions.map((extension) => <ExtensionRow key={extension.id} extension={extension} />)}
                </ul>
            ) : (
                <p className={styles.emptyNote}>No extensions installed. Put an extension's folder in the extensions folder, then reload.</p>
            )}

            <div className={styles.row}>
                <button className={controls.btn} onClick={() => void reloadExtensions()}>Reload extensions</button>
                <button className={controls.btn} onClick={() => void openExtensionsFolder()}>Open extensions folder</button>
            </div>
        </section>
    );
}

function ExtensionRow({ extension }: { extension: ExtensionInfo }) {
    return (
        <li className={cx(styles.ideRow, styles.extRow)}>
            <div className={styles.ideMain}>
                <div className={styles.extMeta}>
                    <span className={styles.ideName}>{extension.name}</span>
                    {extension.version && <span className={cx(controls.muted, controls.small)}>{extension.version}</span>}
                </div>
                {extension.description && <span className={cx(controls.muted, controls.small)}>{extension.description}</span>}
                <span className={cx(controls.muted, controls.small, styles.idePath)} title={extension.folder}>{extension.folder}</span>
                {extension.error && <p className={styles.extError}>{extension.error}</p>}
            </div>

            {/* A broken extension has nothing to switch on. */}
            {!(extension.error && !extension.version) && (
                <SyzygySwitch label={`Enable ${extension.name}`} checked={extension.enabled} onChange={(value) => void setExtensionEnabled(extension.id, value)} />
            )}
        </li>
    );
}
