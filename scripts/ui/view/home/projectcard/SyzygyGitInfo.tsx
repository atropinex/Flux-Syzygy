import type {GitInfo} from "../../../../common/CommonInterface";
import {GIT_STYLES} from "../../../../common/projects/SyzygyBadgeStyle";
import SyzygyChip from "../../shared/SyzygyChip";
import controls from "../../shared/SyzygyControls.module.css";
import styles from "./SyzygyProjectCard.module.css";

/** Whether the project is a git repository, and where its remote is. */
export default function SyzygyGitInfo({git}: { git: GitInfo | null }) {
    const style = git ? GIT_STYLES[git.provider] : null;

    return (
        <section>
            <h3 className={styles.sectionTitle}>Source control</h3>
            {!git || !style ? (
                <p className={controls.muted}>Not a git repository.</p>
            ) : (
                <>
                    <SyzygyChip symbol={style.symbol} color={style.color} label={style.label}/>
                    {git.remoteUrl && <p className={styles.gitLine}>{git.remoteUrl}</p>}
                    {git.branch && <p className={styles.gitLine}>Branch {git.branch}</p>}
                </>
            )}
        </section>
    );
}
