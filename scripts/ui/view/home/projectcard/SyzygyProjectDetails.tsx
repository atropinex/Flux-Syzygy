import type { Project } from "../../../../common/CommonInterface";
import { isEngineKind } from "../../../../common/projects/SyzygyContract";
import SyzygyGitInfo from "./SyzygyGitInfo";
import SyzygyIdeLauncher from "./SyzygyIdeLauncher";
import SyzygyEngineLauncher from "./SyzygyEngineLauncher";
import SyzygyLanguageStats from "./SyzygyLanguageStats";
import SyzygyOpenBoth from "./SyzygyOpenBoth";
import SyzygyProjectFooter from "./SyzygyProjectFooter";
import { cx } from "../../../../common/utils/ClassHelper";
import { cssVars } from "../../shared/SyzygyStyleHelper";
import styles from "./SyzygyProjectCard.module.css";

/** Each part fades up one after another when the card opens: `order` is its place in that sequence. */
const reveal = (order: number) => ({ className: styles.reveal, style: cssVars({ "--i": order }) });

export default function SyzygyProjectDetails({ project }: { project: Project }) {
    const hasEngine = isEngineKind(project.kind);

    return (
        <div className={styles.details}>
            <div className={styles.detailsInfo}>
                <div {...reveal(0)}><SyzygyLanguageStats languages={project.languages} /></div>
                <div {...reveal(1)}><SyzygyGitInfo git={project.git} /></div>
            </div>

            {/* The engine editor and the IDE sit side by side, each with its own selector and button. */}
            <div className={cx(styles.launchers, !hasEngine && styles.single)}>
                {hasEngine && <div {...reveal(2)}><SyzygyEngineLauncher project={project} /></div>}
                <div {...reveal(3)}><SyzygyIdeLauncher project={project} /></div>
            </div>

            {hasEngine && <div {...reveal(4)}><SyzygyOpenBoth project={project} /></div>}

            <div {...reveal(5)}><SyzygyProjectFooter project={project} /></div>
        </div>
    );
}
