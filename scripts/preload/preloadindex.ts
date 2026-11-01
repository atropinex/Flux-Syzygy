import {contextBridge, ipcRenderer, type IpcRendererEvent} from "electron";
import type {ElectronApi} from "../common/CommonInterface";
import {SyzygyIPC} from "../common/projects/SyzygyConnection";
import type {PanelEvent} from "../common/projects/SyzygyContract";

/** The only door between the page and the main process. */
const api: ElectronApi = {
    listProjects: () => ipcRenderer.invoke(SyzygyIPC.listProjects),
    addProject: () => ipcRenderer.invoke(SyzygyIPC.addProject),
    removeProject: (id) => ipcRenderer.invoke(SyzygyIPC.removeProject, id),
    setIde: (id, ide) => ipcRenderer.invoke(SyzygyIPC.setIde, id, ide),
    setEngine: (id, engine) => ipcRenderer.invoke(SyzygyIPC.setEngine, id, engine),
    setProjectGroup: (projectId, groupId) => ipcRenderer.invoke(SyzygyIPC.setProjectGroup, projectId, groupId),
    openProject: (id, target) => ipcRenderer.invoke(SyzygyIPC.openProject, id, target),
    revealProject: (id) => ipcRenderer.invoke(SyzygyIPC.revealProject, id),
    copyProjectPath: (id) => ipcRenderer.invoke(SyzygyIPC.copyProjectPath, id),
    openRemote: (id) => ipcRenderer.invoke(SyzygyIPC.openRemote, id),
    refreshProject: (id) => ipcRenderer.invoke(SyzygyIPC.refreshProject, id),

    listGroups: () => ipcRenderer.invoke(SyzygyIPC.listGroups),
    createGroup: (name) => ipcRenderer.invoke(SyzygyIPC.createGroup, name),
    renameGroup: (id, name) => ipcRenderer.invoke(SyzygyIPC.renameGroup, id, name),
    setGroupCollapsed: (id, collapsed) => ipcRenderer.invoke(SyzygyIPC.setGroupCollapsed, id, collapsed),
    deleteGroup: (id) => ipcRenderer.invoke(SyzygyIPC.deleteGroup, id),

    listIdes: () => ipcRenderer.invoke(SyzygyIPC.listIdes),
    addCustomIde: () => ipcRenderer.invoke(SyzygyIPC.addCustomIde),
    renameIde: (id, label) => ipcRenderer.invoke(SyzygyIPC.renameIde, id, label),
    removeCustomIde: (id) => ipcRenderer.invoke(SyzygyIPC.removeCustomIde, id),
    rescanEngines: () => ipcRenderer.invoke(SyzygyIPC.rescanEngines),

    getSettings: () => ipcRenderer.invoke(SyzygyIPC.getSettings),
    listThemes: () => ipcRenderer.invoke(SyzygyIPC.listThemes),
    setTheme: (id) => ipcRenderer.invoke(SyzygyIPC.setTheme, id),
    openThemesFolder: () => ipcRenderer.invoke(SyzygyIPC.openThemesFolder),
    setShortcut: (accelerator) => ipcRenderer.invoke(SyzygyIPC.setShortcut, accelerator),
    setWindowStyle: (style) => ipcRenderer.invoke(SyzygyIPC.setWindowStyle, style),
    setPanelSide: (side) => ipcRenderer.invoke(SyzygyIPC.setPanelSide, side),
    setPanelOption: (option, value) => ipcRenderer.invoke(SyzygyIPC.setPanelOption, option, value),

    panelReady: () => ipcRenderer.invoke(SyzygyIPC.panelReady),
    panelClosed: () => ipcRenderer.invoke(SyzygyIPC.panelClosed),
    hidePanel: () => ipcRenderer.invoke(SyzygyIPC.hidePanel),
    onPanelEvent: (callback) => {
        const listener = (_event: IpcRendererEvent, panelEvent: PanelEvent) => callback(panelEvent);
        ipcRenderer.on(SyzygyIPC.panelEvent, listener);
        return () => ipcRenderer.removeListener(SyzygyIPC.panelEvent, listener);
    },
    quitApp: () => ipcRenderer.invoke(SyzygyIPC.quitApp)
};

contextBridge.exposeInMainWorld("api", api);
