import type { IdeOption } from "../../../common/CommonInterface";
import { cx } from "../../../common/utils/ClassHelper";
import { addIde, removeIde, renameIde, useEditors } from "../../controller/editor/SyzygyEditor.Controller";
import controls from "../shared/SyzygyControls.module.css";
import styles from "./SyzygySettingsPage.module.css";

/** The code editors and IDEs the user added. Nothing is added for them. */
export default function SyzygyIdeSection() {
    const mine = useEditors().ides.filter((ide) => ide.custom);

    return (
        <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Your IDEs</h3>
            <p className={controls.muted}>Add any code editor or IDE by choosing its program file. Nothing is added for you.</p>

            {mine.length > 0 ? (
                <ul className={styles.ideList}>
                    {mine.map((ide) => <IdeRow key={ide.id} ide={ide} />)}
                </ul>
            ) : (
                <p className={styles.emptyNote}>No IDEs added yet.</p>
            )}

            <div className={styles.row}>
                <button className={cx(controls.btn, controls.btnPrimary)} onClick={() => void addIde()}>Add IDE</button>
            </div>
        </section>
    );
}

/** An IDE that can be renamed (click its name) and removed. */
function IdeRow({ ide }: { ide: IdeOption }) {
    const commit = (value: string) => {
        const label = value.trim() || ide.label;
        if (label !== ide.label) void renameIde(ide, label);
    };

    return (
        <li className={styles.ideRow}>
            <div className={styles.ideMain}>
                <input
                    className={styles.ideInput}
                    defaultValue={ide.label}
                    aria-label={`Name for ${ide.label}`}
                    onBlur={(event) => {
                        commit(event.target.value);
                        event.target.value = event.target.value.trim() || ide.label;
                    }}
                    onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
                />
                <span className={cx(controls.muted, controls.small, styles.idePath)}>{ide.detail}</span>
            </div>
            <button className={cx(controls.btn, controls.btnQuiet, controls.btnDanger)} onClick={() => void removeIde(ide)}>Remove</button>
        </li>
    );
}
