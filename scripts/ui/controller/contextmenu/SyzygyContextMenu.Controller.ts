import { useStore, createStore } from "../store/SyzygyStore.Controller";
import type { Group, Project } from "../../../common/CommonInterface";
import { isEngineKind } from "../../../common/projects/SyzygyContract";
import { GIT_STYLES } from "../../../common/projects/SyzygyBadgeStyle";
import { getEditorOptions } from "../editor/SyzygyEditor.Controller";
import {
    assignProjectToGroup, createGroup, deleteGroup, groupStore, setAllGroupsCollapsed, startRename, toggleGroup
} from "../group/SyzygyGroup.Controller";
import {
    addProject, copyProjectPath, getProject, openBoth, openProject, openRemote, removeProject, rescanProject, revealProject
} from "../project/SyzygyProject.Controller";

// === What a menu is made of === //
export interface MenuItem {
    label: string;
    onSelect?: () => void;
    items?: MenuEntry[];   // makes this item open a submenu
    checked?: boolean;
    disabled?: boolean;
    danger?: boolean;
    confirm?: boolean;     // the first click asks "Click again to confirm"
    hint?: string;         // small text on the right
}
export type MenuEntry = MenuItem | "separator";

interface MenuState {
    open: boolean;
    x: number;
    y: number;
    entries: MenuEntry[];
    target: { type: "project" | "group"; id: string } | null; // what was right-clicked, so it can be highlighted
}

const menuStore = createStore<MenuState>({ open: false, x: 0, y: 0, entries: [], target: null });
export const useContextMenu = () => useStore(menuStore);
export const isContextMenuOpen = () => menuStore.get().open;

export function openContextMenu(x: number, y: number, entries: MenuEntry[], target: MenuState["target"] = null): void {
    menuStore.set({ open: true, x, y, entries, target });
}

export function closeContextMenu(): void {
    if (menuStore.get().open) menuStore.set((state) => ({ ...state, open: false, target: null }));
}

// === The menus === //

const agent = navigator.userAgent;
const FILE_MANAGER = agent.includes("Mac") ? "Reveal in Finder" : agent.includes("Windows") ? "Show in File Explorer" : "Show in file manager";
const REMOTE_NAMES: Partial<Record<keyof typeof GIT_STYLES, string>> = { github: "GitHub", gitlab: "GitLab", bitbucket: "Bitbucket" };

function groupSubmenu(project: Project): MenuEntry[] {
    const { groups } = groupStore.get();
    const entries: MenuEntry[] = groups.map((group) => ({
        label: group.name,
        checked: group.id === project.groupId,
        onSelect: () => void assignProjectToGroup(project, group.id)
    }));

    if (entries.length > 0) entries.push("separator");
    entries.push({ label: "New group…", onSelect: () => void createGroup(project) });
    return entries;
}

export function buildProjectMenu(project: Project): MenuEntry[] {
    const ides = getEditorOptions();
    const labelOf = (id: string | null) => (id ? ides.find((ide) => ide.id === id)?.label : undefined);
    const engineName = labelOf(project.engine) || project.autoEditor?.label;
    const ideName = labelOf(project.ide);

    const entries: MenuEntry[] = [];
    if (isEngineKind(project.kind)) {
        entries.push({
            label: engineName ? `Open in ${engineName}` : "Open in engine editor",
            hint: engineName ? undefined : "not found",
            disabled: !engineName || !project.exists,
            onSelect: () => void openProject(project, "engine")
        });
    }
    entries.push({
        label: ideName ? `Open in ${ideName}` : "Open in IDE",
        hint: ideName ? undefined : "none chosen",
        disabled: !ideName || !project.exists,
        onSelect: () => void openProject(project, "ide")
    });

    if (isEngineKind(project.kind)) {
        entries.push({
            label: "Open in both",
            disabled: !engineName || !ideName || !project.exists,
            onSelect: () => void openBoth(project)
        });
    }

    entries.push("separator", { label: "Add to group", items: groupSubmenu(project) });
    if (project.groupId) entries.push({ label: "Remove from group", onSelect: () => void assignProjectToGroup(project, null) });
    entries.push("separator");

    entries.push({ label: FILE_MANAGER, disabled: !project.exists, onSelect: () => revealProject(project) });
    if (project.git?.remoteUrl) {
        const name = REMOTE_NAMES[project.git.provider];
        entries.push({ label: name ? `Open on ${name}` : "Open remote in browser", onSelect: () => void openRemote(project) });
    }
    entries.push(
        { label: "Copy path", onSelect: () => void copyProjectPath(project) },
        { label: "Rescan project", disabled: !project.exists, onSelect: () => void rescanProject(project) },
        "separator",
        { label: "Remove from list", danger: true, confirm: true, onSelect: () => void removeProject(project.id) }
    );
    return entries;
}

export function buildGroupMenu(group: Group): MenuEntry[] {
    const entries: MenuEntry[] = [
        { label: group.collapsed ? "Expand" : "Minimize", onSelect: () => toggleGroup(group.id) },
        { label: "Rename", onSelect: () => startRename(group.id) },
        "separator",
        { label: "New group", onSelect: () => void createGroup() }
    ];
    if (groupStore.get().groups.length > 1) {
        entries.push(
            { label: "Minimize all groups", onSelect: () => setAllGroupsCollapsed(true) },
            { label: "Expand all groups", onSelect: () => setAllGroupsCollapsed(false) }
        );
    }
    entries.push("separator", { label: "Delete group", hint: "keeps projects", danger: true, confirm: true, onSelect: () => void deleteGroup(group.id) });
    return entries;
}

export function buildBackgroundMenu(): MenuEntry[] {
    const entries: MenuEntry[] = [
        { label: "Add project…", onSelect: () => void addProject() },
        { label: "New group", onSelect: () => void createGroup() }
    ];
    if (groupStore.get().groups.length > 0) {
        entries.push(
            "separator",
            { label: "Minimize all groups", onSelect: () => setAllGroupsCollapsed(true) },
            { label: "Expand all groups", onSelect: () => setAllGroupsCollapsed(false) }
        );
    }
    return entries;
}

/** Right-click on the list: opens the menu for whatever is under the pointer. */
export function handleListContextMenu(event: {
    target: EventTarget | null; clientX: number; clientY: number; preventDefault: () => void;
}): void {
    const target = event.target as HTMLElement;
    if (target.closest("input, select, textarea")) return; // keep the native behaviour for form fields
    event.preventDefault();

    const row = target.closest<HTMLElement>("[data-row]");
    const id = row?.dataset.rowId ?? "";
    const project = row?.dataset.rowType === "project" ? getProject(id) : undefined;
    const group = row?.dataset.rowType === "group" ? groupStore.get().groups.find((item) => item.id === id) : undefined;

    if (project) openContextMenu(event.clientX, event.clientY, buildProjectMenu(project), { type: "project", id });
    else if (group) openContextMenu(event.clientX, event.clientY, buildGroupMenu(group), { type: "group", id });
    else openContextMenu(event.clientX, event.clientY, buildBackgroundMenu());
}
