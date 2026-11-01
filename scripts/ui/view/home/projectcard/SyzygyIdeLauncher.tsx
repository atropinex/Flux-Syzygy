import { useState } from "react";
import type { Project } from "../../../../common/CommonInterface";
import { getIdeLabel, useEditors } from "../../../controller/editor/SyzygyEditor.Controller";
import { chooseIde, openProject } from "../../../controller/project/SyzygyProject.Controller";
import SyzygyLauncher from "./SyzygyLauncher";

/** Opens the project in an IDE the user added. Nothing is chosen until they pick one. */
export default function SyzygyIdeLauncher({ project }: { project: Project }) {
    const { ides } = useEditors();
    const [pending, setPending] = useState(false);

    const options = ides.filter((ide) => ide.custom);
    const picked = project.ide && options.some((ide) => ide.id === project.ide) ? project.ide : "";
    const ideName = picked ? getIdeLabel(picked) : undefined;

    const open = async () => {
        setPending(true);
        try {
            await openProject(project, "ide");
        } finally {
            setPending(false);
        }
    };

    return (
        <SyzygyLauncher
            title="IDE"
            firstOption="None chosen"
            options={options}
            value={picked}
            onChange={(id) => void chooseIde(project, id)}
            buttonLabel={ideName ? `Open in ${ideName}` : "Open in IDE"}
            buttonDisabled={pending || !project.exists || !ideName}
            outline
            hint={ideName ? "" : options.length > 0 ? "Choose an IDE above." : "Add an IDE in Settings to use this."}
            onOpen={() => void open()}
        />
    );
}
