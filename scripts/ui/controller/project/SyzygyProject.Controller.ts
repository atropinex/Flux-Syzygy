import type {AutoEditor, Project} from "../../../common/CommonInterface";
import type {IdeId, OpenTarget} from "../../../common/projects/SyzygyContract";
import {exclusive} from "../../../common/utils/ExclusiveHelper";
import {keepCurveUpdating, prepareFlip} from "../animation/SyzygyAnimation.Controller";
import {hideAfterOpening} from "../panel/SyzygyPanel.Controller";
import {createStore, useStore} from "../store/SyzygyStore.Controller";
import {showToast} from "../toast/SyzygyToast.Controller";

interface ProjectState {
    projects: Project[];
    selectedId: string | null;
    query: string;       // what the search box contains
    leaving: string[];   // projects that are sliding out before they are removed
}

export const projectStore = createStore<ProjectState>({projects: [], selectedId: null, query: "", leaving: []});
export const useProjectState = () => useStore(projectStore);

export const getProject = (id: string) => projectStore.get().projects.find((project) => project.id === id);

export function matchesQuery(project: Project, query: string): boolean {
    const text = query.trim().toLowerCase();
    return project.name.toLowerCase().includes(text) || project.path.toLowerCase().includes(text);
}

// === Loading and editing the list === //

export async function loadProjects(): Promise<void> {
    const projects = await window.api.listProjects();
    projectStore.set((state) => ({...state, projects}));
}

export function selectProject(id: string | null): void {
    if (projectStore.get().selectedId === id) return;
    projectStore.set((state) => ({...state, selectedId: id}));
    keepCurveUpdating(900);
}

export function setQuery(query: string): void {
    projectStore.set((state) => ({...state, query}));
    keepCurveUpdating(500);
}

export function patchProject(id: string, changes: Partial<Project>): void {
    projectStore.set((state) => ({
        ...state,
        projects: state.projects.map((project) => (project.id === id ? {...project, ...changes} : project))
    }));
}

/** After engine editors were rescanned: each project's matching editor may have changed. */
export function applyAutoEditors(autoEditors: Record<string, AutoEditor | null>): void {
    projectStore.set((state) => ({
        ...state,
        projects: state.projects.map((project) => ({...project, autoEditor: autoEditors[project.id] ?? null}))
    }));
}

/** Asks for a folder and adds it. A repeat click while the dialog is open is ignored. */
export const addProject = exclusive(async (): Promise<void> => {
    const added = await window.api.addProject();
    if (!added) return;

    if (!getProject(added.id)) {
        prepareFlip();
        projectStore.set((state) => ({...state, projects: [...state.projects, added]}));
    }
    selectProject(added.id);
});

/** The row slides out first (see SyzygyRow); finishRemoveProject then drops it from the list. */
export const removeProject = exclusive(async (id: string): Promise<void> => {
    await window.api.removeProject(id);
    projectStore.set((state) => ({
        ...state,
        selectedId: state.selectedId === id ? null : state.selectedId,
        leaving: [...state.leaving, id]
    }));
}, (id) => id);

export function finishRemoveProject(id: string): void {
    projectStore.set((state) => ({
        ...state,
        projects: state.projects.filter((project) => project.id !== id),
        leaving: state.leaving.filter((leavingId) => leavingId !== id)
    }));
}

// === Opening and the right-click tools === //

/** Opens the project in its engine editor or its IDE. Repeats are ignored by the main process. */
export async function openProject(project: Project, target: OpenTarget): Promise<void> {
    const result = await window.api.openProject(project.id, target);
    if (result.busy) return; // it was started a moment ago: ignore the repeat

    if (result.ok) {
        showToast(`Opened ${project.name} in ${result.label}`);
        hideAfterOpening();
    } else {
        showToast(result.error ?? "Could not open the project.", true);
    }
}

/**
 * Opens the engine editor and the IDE together. Each part is reported separately: if only one of
 * them starts, the toast says which one did, and the panel stays open so the error can be read.
 */
export async function openBoth(project: Project): Promise<void> {
    const results = await Promise.all([
        window.api.openProject(project.id, "engine"),
        window.api.openProject(project.id, "ide")
    ]);

    const counted = results.filter((result) => !result.busy); // repeats started a moment ago are ignored
    if (counted.length === 0) return;

    const opened = counted.filter((result) => result.ok).map((result) => result.label);
    const failure = counted.find((result) => !result.ok);

    if (failure) {
        const partial = opened.length > 0 ? ` ${opened.join(" and ")} did open.` : "";
        showToast(`${failure.error ?? "Could not open the project."}${partial}`, true);
        return;
    }

    showToast(`Opened ${project.name} in ${opened.join(" and ")}`);
    hideAfterOpening();
}

export async function chooseIde(project: Project, ide: IdeId | null): Promise<void> {
    patchProject(project.id, {ide});
    await window.api.setIde(project.id, ide);
}

export async function chooseEngine(project: Project, engine: IdeId | null): Promise<void> {
    patchProject(project.id, {engine});
    await window.api.setEngine(project.id, engine);
}

/** Re-reads git, languages and engine version. */
export const rescanProject = exclusive(async (project: Project): Promise<void> => {
    const fresh = await window.api.refreshProject(project.id);
    if (!fresh) return;
    patchProject(project.id, fresh);
    showToast(`Rescanned ${project.name}`);
}, (project) => project.id);

export const revealProject = (project: Project) => void window.api.revealProject(project.id);

export async function copyProjectPath(project: Project): Promise<void> {
    await window.api.copyProjectPath(project.id);
    showToast("Path copied");
}

export async function openRemote(project: Project): Promise<void> {
    const result = await window.api.openRemote(project.id);
    if (!result.ok && !result.busy) showToast(result.error ?? "Could not open the remote.", true);
}
