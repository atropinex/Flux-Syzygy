import { useState } from "react";
import type { Project } from "../../../../common/CommonInterface";
import { cx } from "../../../../common/utils/ClassHelper";
import { getIdeLabel } from "../../../controller/editor/SyzygyEditor.Controller";
import { openBoth } from "../../../controller/project/SyzygyProject.Controller";
import controls from "../../shared/SyzygyControls.module.css";

/** Opens the engine editor and the IDE at the same time. Only needs to exist for projects with an engine. */
export default function SyzygyOpenBoth({ project }: { project: Project }) {
    const [pending, setPending] = useState(false);

    const hasEngine = Boolean((project.engine && getIdeLabel(project.engine)) || project.autoEditor);
    const hasIde = Boolean(project.ide && getIdeLabel(project.ide));
    const ready = project.exists && hasEngine && hasIde;

    const open = async () => {
        setPending(true);
        try {
            await openBoth(project);
        } finally {
            setPending(false);
        }
    };

    return (
        <div>
            <button className={cx(controls.btn, controls.wide)} disabled={pending || !ready} onClick={() => void open()}>
                Open both
            </button>
            {project.exists && !ready && (
                <p className={controls.hint}>
                    {!hasEngine && !hasIde ? "Needs an engine editor and an IDE." : !hasEngine ? "Needs an engine editor." : "Needs an IDE."}
                </p>
            )}
        </div>
    );
}
