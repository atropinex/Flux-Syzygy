import { useEffect, useRef, useState } from "react";
import type { Group, Project } from "../../../../common/CommonInterface";
import { cx } from "../../../../common/utils/ClassHelper";
import { useContextMenu } from "../../../controller/contextmenu/SyzygyContextMenu.Controller";
import {
    deleteGroup, renameGroup, startRename, stopRename, toggleGroup, useGroupState
} from "../../../controller/group/SyzygyGroup.Controller";
import controls from "../../shared/SyzygyControls.module.css";
import styles from "./SyzygyGroupHeader.module.css";

interface Props {
    group: Group;
    projects: Project[]; // the projects in this group
}

/** The header row of a group: click it to minimize or expand the projects under it. */
export default function SyzygyGroupHeader({ group, projects }: Props) {
    const { renamingId } = useGroupState();
    const menu = useContextMenu();
    const [armed, setArmed] = useState(false); // "Delete" asks for a second click

    useEffect(() => {
        if (!armed) return;
        const timer = window.setTimeout(() => setArmed(false), 3000);
        return () => window.clearTimeout(timer);
    }, [armed]);

    const names = projects.slice(0, 3).map((project) => project.name).join(", ");
    const more = projects.length > 3 ? ` and ${projects.length - 3} more` : "";
    const isTarget = menu.target?.type === "group" && menu.target.id === group.id;

    return (
        <div
            className={cx(styles.groupHead, group.collapsed && styles.collapsed, isTarget && styles.context)}
            role="button"
            tabIndex={0}
            aria-expanded={!group.collapsed}
            onClick={() => toggleGroup(group.id)}
            onKeyDown={(event) => {
                if ((event.key === "Enter" || event.key === " ") && event.target === event.currentTarget) {
                    event.preventDefault();
                    toggleGroup(group.id);
                }
            }}
        >
            <span className={styles.chevron} />
            {renamingId === group.id ? <GroupNameInput group={group} /> : <span className={styles.groupName}>{group.name}</span>}
            <span className={styles.groupCount}>{projects.length}</span>
            <span className={styles.groupPeek}>{names ? names + more : "Empty"}</span>

            <div className={styles.groupActions} onClick={(event) => event.stopPropagation()}>
                <button className={cx(controls.btn, controls.btnQuiet, styles.groupAction)} onClick={() => startRename(group.id)}>Rename</button>
                <button
                    className={cx(controls.btn, controls.btnQuiet, controls.btnDanger, styles.groupAction)}
                    onClick={() => (armed ? void deleteGroup(group.id) : setArmed(true))}
                >
                    {armed ? "Click again" : "Delete"}
                </button>
            </div>
        </div>
    );
}

/** Enter or clicking away keeps the new name, Escape cancels. */
function GroupNameInput({ group }: { group: Group }) {
    const ref = useRef<HTMLInputElement>(null);
    const finished = useRef(false);

    useEffect(() => {
        ref.current?.focus();
        ref.current?.select();
    }, []);

    const finish = (keep: boolean) => {
        if (finished.current) return;
        finished.current = true;

        const name = ref.current?.value.trim() ?? "";
        if (keep && name && name !== group.name) void renameGroup(group.id, name);
        stopRename();
    };

    return (
        <input
            ref={ref}
            className={styles.groupInput}
            defaultValue={group.name}
            maxLength={40}
            aria-label="Group name"
            onClick={(event) => event.stopPropagation()}
            onBlur={() => finish(true)}
            onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") finish(true);
                if (event.key === "Escape") finish(false);
            }}
        />
    );
}
