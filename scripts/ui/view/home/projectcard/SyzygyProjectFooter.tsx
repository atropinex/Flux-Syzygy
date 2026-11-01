import { useEffect, useState } from "react";
import type { Project } from "../../../../common/CommonInterface";
import { cx } from "../../../../common/utils/ClassHelper";
import { removeProject } from "../../../controller/project/SyzygyProject.Controller";
import controls from "../../shared/SyzygyControls.module.css";
import styles from "./SyzygyProjectCard.module.css";

/** Remove sits at the right. Groups are managed from the right-click menu ("Add to group"). */
export default function SyzygyProjectFooter({ project }: { project: Project }) {
    const [armed, setArmed] = useState(false); // "Remove" asks for a second click

    useEffect(() => {
        if (!armed) return;
        const timer = window.setTimeout(() => setArmed(false), 3000);
        return () => window.clearTimeout(timer);
    }, [armed]);

    return (
        <div className={styles.detailsFoot}>
            <button className={cx(controls.btn, controls.btnQuiet, controls.btnDanger)}
                onClick={() => (armed ? void removeProject(project.id) : setArmed(true))}>
                {armed ? "Click again to remove" : "Remove from list"}
            </button>
        </div>
    );
}
