import { useEffect, useLayoutEffect, useMemo, type RefObject } from "react";
import type { Group, Project } from "../../../common/CommonInterface";
import { attachList, playFlip } from "../animation/SyzygyAnimation.Controller";
import { groupStore, useGroupState } from "../group/SyzygyGroup.Controller";
import { matchesQuery, projectStore, selectProject, useProjectState } from "../project/SyzygyProject.Controller";

/** One line of the list, top to bottom: a group's header, the "Ungrouped" label, or a project card. */
export type ListRow =
    | { type: "group"; key: string; group: Group; visible: boolean }
    | { type: "ungrouped"; key: string; visible: boolean }
    | { type: "project"; key: string; project: Project; visible: boolean };

/**
 * Works out which rows exist, in which order, and which are visible.
 * Each group header is followed by its projects, then the ungrouped projects. A minimized group hides
 * its projects, but while searching, matches inside minimized groups still show up.
 */
export function buildRows(projects: Project[], groups: Group[], query: string): ListRow[] {
    const searching = query.trim() !== "";
    const knownGroups = new Set(groups.map((group) => group.id));
    // A project whose group no longer exists counts as ungrouped.
    const groupOf = (project: Project) => (project.groupId && knownGroups.has(project.groupId) ? project.groupId : null);
    const matches = (project: Project) => matchesQuery(project, query);

    const projectRows = (groupId: string | null, hidden: boolean): ListRow[] =>
        projects
            .filter((project) => groupOf(project) === groupId)
            .map((project) => ({ type: "project", key: `project:${project.id}`, project, visible: matches(project) && !hidden }));

    const rows: ListRow[] = [];
    for (const group of groups) {
        const hasMatch = projects.some((project) => groupOf(project) === group.id && matches(project));
        rows.push({ type: "group", key: `group:${group.id}`, group, visible: !searching || hasMatch });
        rows.push(...projectRows(group.id, group.collapsed && !searching));
    }

    const ungroupedHasMatch = projects.some((project) => groupOf(project) === null && matches(project));
    rows.push({ type: "ungrouped", key: "ungrouped", visible: groups.length > 0 && ungroupedHasMatch });
    rows.push(...projectRows(null, false));
    return rows;
}

export function useListRows(): ListRow[] {
    const { projects, query } = useProjectState();
    const { groups } = useGroupState();
    return useMemo(() => buildRows(projects, groups, query), [projects, groups, query]);
}

/** Numbers for the header and the empty state. */
export function useSummary(): { projects: number; groups: number; matched: number } {
    const { projects, query } = useProjectState();
    const { groups } = useGroupState();
    const matched = useMemo(() => projects.filter((project) => matchesQuery(project, query)).length, [projects, query]);
    return { projects: projects.length, groups: groups.length, matched };
}

// === Keyboard === //

let lastMoveAt = -Infinity;

/** Arrow keys move the selection through the visible projects, at most ~11 times a second when held. */
export function moveSelection(step: 1 | -1): void {
    const now = performance.now();
    if (now - lastMoveAt < 90) return;
    lastMoveAt = now;

    const { projects, query, selectedId } = projectStore.get();
    const rows = buildRows(projects, groupStore.get().groups, query);
    const visible = rows.flatMap((row) => (row.type === "project" && row.visible ? [row.project] : []));
    if (visible.length === 0) return;

    const index = visible.findIndex((project) => project.id === selectedId);
    selectProject(visible[(index + step + visible.length) % visible.length].id);
}

// === Entrance animation === //

/** Off while the panel is first being built: opening the panel already slides the whole list in. */
let entranceEnabled = false;
export const isEntranceEnabled = () => entranceEnabled;
export const setEntranceEnabled = (enabled: boolean) => { entranceEnabled = enabled; };

// === Behaviour of the list element === //

/** Bends the list while scrolling, glides rows that changed places, and deselects a project that gets hidden. */
export function useListBehavior(listRef: RefObject<HTMLElement>, rows: ListRow[]): void {
    const { selectedId } = useProjectState();
    const order = rows.map((row) => row.key).join("|");

    useEffect(() => attachList(listRef.current!), [listRef]);
    useLayoutEffect(() => { playFlip(); }, [order]);

    useEffect(() => {
        const selected = rows.find((row) => row.type === "project" && row.project.id === selectedId);
        if (selected && !selected.visible) selectProject(null);
    }, [rows, selectedId]);

    // Rows that are added later (a new project or group) fade in, but not the first batch.
    useEffect(() => {
        const frame = requestAnimationFrame(() => setEntranceEnabled(true));
        return () => cancelAnimationFrame(frame);
    }, []);
}
