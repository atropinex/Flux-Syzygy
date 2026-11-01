/** The names of the messages between the page and the main process. */
export const SyzygyIPC = {
    // Projects
    listProjects: "projects:list",
    addProject: "projects:add",
    removeProject: "projects:remove",
    setIde: "projects:set-ide",
    setEngine: "projects:set-engine",
    setProjectGroup: "projects:set-group",
    openProject: "projects:open",
    revealProject: "projects:reveal",
    copyProjectPath: "projects:copy-path",
    openRemote: "projects:open-remote",
    refreshProject: "projects:refresh",
    // Groups
    listGroups: "groups:list",
    createGroup: "groups:create",
    renameGroup: "groups:rename",
    setGroupCollapsed: "groups:set-collapsed",
    deleteGroup: "groups:delete",
    // IDEs and engine editors
    listIdes: "ides:list",
    addCustomIde: "ides:add-custom",
    renameIde: "ides:rename",
    removeCustomIde: "ides:remove-custom",
    rescanEngines: "engines:rescan",
    // Settings and themes
    getSettings: "settings:get",
    listThemes: "themes:list",
    setTheme: "themes:set",
    openThemesFolder: "themes:open-folder",
    setShortcut: "panel:set-shortcut",
    setWindowStyle: "panel:set-style",
    setPanelSide: "panel:set-side",
    setPanelOption: "panel:set-option",
    // The panel
    panelReady: "panel:ready",
    panelClosed: "panel:closed",
    hidePanel: "panel:hide",
    panelEvent: "panel:event", // sent from main to the page when the shortcut shows or hides the panel
    quitApp: "app:quit"
} as const;
