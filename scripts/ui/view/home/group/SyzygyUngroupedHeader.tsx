import { useProjectState } from "../../../controller/project/SyzygyProject.Controller";
import { useGroupState } from "../../../controller/group/SyzygyGroup.Controller";
import { cx } from "../../../../common/utils/ClassHelper";
import styles from "./SyzygyGroupHeader.module.css";

/** A plain label above the projects that are not in any group. */
export default function SyzygyUngroupedHeader() {
    const { projects } = useProjectState();
    const { groups } = useGroupState();
    const known = new Set(groups.map((group) => group.id));
    const count = projects.filter((project) => !project.groupId || !known.has(project.groupId)).length;

    return (
        <div className={cx(styles.groupHead, styles.static)}>
            <span className={styles.groupName}>Ungrouped</span>
            <span className={styles.groupCount}>{count}</span>
        </div>
    );
}
