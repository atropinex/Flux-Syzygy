import {useState} from "react";
import type {Project} from "../../../../common/CommonInterface";
import {KIND_STYLES} from "../../../../common/projects/SyzygyBadgeStyle";
import {getIdeLabel, useEditors} from "../../../controller/editor/SyzygyEditor.Controller";
import {chooseEngine, openProject} from "../../../controller/project/SyzygyProject.Controller";
import SyzygyLauncher from "./SyzygyLauncher";

/** Opens the project in its game engine's editor: the one picked here, or the exact version it needs. */
export default function SyzygyEngineLauncher({project}: { project: Project }) {
    const {ides} = useEditors();
    const [pending, setPending] = useState(false);

    const engineName = KIND_STYLES[project.kind].label;
    const options = ides.filter((ide) => ide.engine === project.kind);
    const picked = project.engine && options.some((ide) => ide.id === project.engine) ? project.engine : "";
    const editorLabel = (project.engine && getIdeLabel(project.engine)) || project.autoEditor?.label;

    let hint = "";
    if (!editorLabel) {
        hint = options.length === 0
            ? `No ${engineName} editor found. Install one, then rescan in Settings.`
            : project.requiredVersion
                ? `${engineName} ${project.requiredVersion} isn't installed. Choose another version above.`
                : "Choose an editor above.";
    }

    const open = async () => {
        setPending(true);
        try {
            await openProject(project, "engine");
        } finally {
            setPending(false);
        }
    };

    return (
        <SyzygyLauncher
            title={`${engineName} editor`}
            firstOption={project.autoEditor ? `Automatic (${project.autoEditor.label})` : "Automatic"}
            options={options}
            value={picked}
            onChange={(id) => void chooseEngine(project, id)}
            buttonLabel={editorLabel ? `Open in ${editorLabel}` : `Open in ${engineName}`}
            buttonDisabled={pending || !project.exists || !editorLabel}
            hint={hint}
            hintIsWarning
            onOpen={() => void open()}
        />
    );
}
