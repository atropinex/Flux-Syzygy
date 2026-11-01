import type { Group, Project } from "../../../common/CommonInterface";
import { exclusive } from "../../../common/utils/ExclusiveHelper";
import { keepCurveUpdating, prepareFlip } from "../animation/SyzygyAnimation.Controller";
import { patchProject, projectStore } from "../project/SyzygyProject.Controller";
import { createStore, useStore } from "../store/SyzygyStore.Controller";

interface GroupState {
    groups: Group[];
    renamingId: string | null; // the group whose name is being edited
    leaving: string[];         // groups that are sliding out before they are removed
}

export const groupStore = createStore<GroupState>({ groups: [], renamingId: null, leaving: [] });
export const useGroupState = () => useStore(groupStore);

export async function loadGroups(): Promise<void> {
    const groups = await window.api.listGroups();
    groupStore.set((state) => ({ ...state, groups }));
}

function patchGroup(id: string, changes: Partial<Group>): void {
    groupStore.set((state) => ({
        ...state,
        groups: state.groups.map((group) => (group.id === id ? { ...group, ...changes } : group))
    }));
}

/** Makes a group, optionally with a project already in it, and opens its name for editing. */
export const createGroup = exclusive(async (project?: Project): Promise<void> => {
    const group = await window.api.createGroup("New group");

    prepareFlip();
    groupStore.set((state) => ({ ...state, groups: [...state.groups, group], renamingId: group.id }));

    if (project) {
        patchProject(project.id, { groupId: group.id });
        await window.api.setProjectGroup(project.id, group.id);
    }
});

export function startRename(id: string): void {
    groupStore.set((state) => ({ ...state, renamingId: id }));
}

export function stopRename(): void {
    groupStore.set((state) => ({ ...state, renamingId: null }));
}

export async function renameGroup(id: string, name: string): Promise<void> {
    patchGroup(id, { name });
    await window.api.renameGroup(id, name);
}

export async function setGroupCollapsed(id: string, collapsed: boolean): Promise<void> {
    patchGroup(id, { collapsed });
    keepCurveUpdating(600);
    await window.api.setGroupCollapsed(id, collapsed);
}

export function toggleGroup(id: string): void {
    const group = groupStore.get().groups.find((item) => item.id === id);
    if (group) void setGroupCollapsed(id, !group.collapsed);
}

export function setAllGroupsCollapsed(collapsed: boolean): void {
    groupStore.get().groups.forEach((group) => void setGroupCollapsed(group.id, collapsed));
}

/** Puts a project in a group (or, with null, takes it out). A minimized group opens so the project isn't hidden. */
export const assignProjectToGroup = exclusive(async (project: Project, groupId: string | null): Promise<void> => {
    prepareFlip();
    patchProject(project.id, { groupId });

    const group = groupStore.get().groups.find((item) => item.id === groupId);
    if (group?.collapsed) void setGroupCollapsed(group.id, false);

    await window.api.setProjectGroup(project.id, groupId);
}, (project) => project.id);

/** The projects stay, they just leave the group. The header then slides out (see SyzygyRow). */
export const deleteGroup = exclusive(async (id: string): Promise<void> => {
    await window.api.deleteGroup(id);

    prepareFlip();
    projectStore.set((state) => ({
        ...state,
        projects: state.projects.map((project) => (project.groupId === id ? { ...project, groupId: null } : project))
    }));
    groupStore.set((state) => ({ ...state, leaving: [...state.leaving, id] }));
}, (id) => id);

export function finishRemoveGroup(id: string): void {
    groupStore.set((state) => ({
        ...state,
        groups: state.groups.filter((group) => group.id !== id),
        leaving: state.leaving.filter((leavingId) => leavingId !== id)
    }));
}
