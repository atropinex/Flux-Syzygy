import type { ListRow } from "../../controller/list/SyzygyList.Controller";
import { finishRemoveGroup, useGroupState } from "../../controller/group/SyzygyGroup.Controller";
import { finishRemoveProject, useProjectState } from "../../controller/project/SyzygyProject.Controller";
import SyzygyGroupHeader from "./group/SyzygyGroupHeader";
import SyzygyUngroupedHeader from "./group/SyzygyUngroupedHeader";
import SyzygyProjectCard from "./projectcard/SyzygyProjectCard";
import SyzygyRow from "./row/SyzygyRow";

interface Props {
    row: ListRow;
    order: number; // the row's place in the list, used to stagger the entrance
}

/** Picks the right content for a row of the list. */
export default function SyzygyListRow({ row, order }: Props) {
    const projectState = useProjectState();
    const groupState = useGroupState();

    if (row.type === "project") {
        const { id } = row.project;
        return (
            <SyzygyRow rowType="project" rowId={id} rowKey={row.key} order={order} visible={row.visible}
                leaving={projectState.leaving.includes(id)} onLeft={() => finishRemoveProject(id)}>
                <SyzygyProjectCard project={row.project} />
            </SyzygyRow>
        );
    }

    if (row.type === "group") {
        const { id } = row.group;
        const projects = projectState.projects.filter((project) => project.groupId === id);
        return (
            <SyzygyRow rowType="group" rowId={id} rowKey={row.key} order={order} visible={row.visible} isGroup
                leaving={groupState.leaving.includes(id)} onLeft={() => finishRemoveGroup(id)}>
                <SyzygyGroupHeader group={row.group} projects={projects} />
            </SyzygyRow>
        );
    }

    return (
        <SyzygyRow rowType="ungrouped" rowId="ungrouped" rowKey={row.key} order={order} visible={row.visible} isGroup>
            <SyzygyUngroupedHeader />
        </SyzygyRow>
    );
}
