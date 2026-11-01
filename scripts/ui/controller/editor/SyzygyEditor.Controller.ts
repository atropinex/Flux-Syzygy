import type {IdeOption} from "../../../common/CommonInterface";
import {exclusive} from "../../../common/utils/ExclusiveHelper";
import {applyAutoEditors, patchProject, projectStore} from "../project/SyzygyProject.Controller";
import {createStore, useStore} from "../store/SyzygyStore.Controller";
import {showToast} from "../toast/SyzygyToast.Controller";

interface EditorState {
    ides: IdeOption[]; // detected engine editors first, then the IDEs the user added
}

const editorStore = createStore<EditorState>({ides: []});
export const useEditors = () => useStore(editorStore);

export const getEditorOptions = () => editorStore.get().ides;

export const getIdeLabel = (id: string | null): string | undefined =>
    id ? editorStore.get().ides.find((ide) => ide.id === id)?.label : undefined;

export async function loadIdes(): Promise<void> {
    editorStore.set({ides: await window.api.listIdes()});
}

/** Asks for a program and adds it as an IDE. */
export const addIde = exclusive(async (): Promise<void> => {
    const added = await window.api.addCustomIde();
    if (!added) return;

    editorStore.set((state) => ({ides: state.ides.some((ide) => ide.id === added.id) ? state.ides : [...state.ides, added]}));
    showToast(`Added ${added.label}`);
});

export async function renameIde(ide: IdeOption, label: string): Promise<void> {
    editorStore.set((state) => ({ides: state.ides.map((item) => (item.id === ide.id ? {...item, label} : item))}));
    await window.api.renameIde(ide.id, label);
}

/** Projects that used it go back to having no IDE chosen. */
export const removeIde = exclusive(async (ide: IdeOption): Promise<void> => {
    const affected = await window.api.removeCustomIde(ide.id);
    editorStore.set((state) => ({ides: state.ides.filter((item) => item.id !== ide.id)}));
    projectStore.get().projects.filter((project) => affected.includes(project.id)).forEach((project) => patchProject(project.id, {ide: null}));
    showToast(`Removed ${ide.label}`);
});

/** Looks for installed engine editors again and re-matches every project to one. */
export const rescanEngines = exclusive(async (): Promise<void> => {
    const result = await window.api.rescanEngines();
    editorStore.set({ides: result.ides});
    applyAutoEditors(result.autoEditors);
    showToast(`Found ${result.ides.filter((ide) => !ide.custom).length} engine editors`);
});
