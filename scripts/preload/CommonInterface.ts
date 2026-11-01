import type {GitProvider, IdeId, OpenTarget, PanelEvent, PanelOption, PanelSide, ProjectKind, ThemeColor, WindowStyle} from "./projects/SyzygyContract";

// === The API the page can call (see scripts/preload/preloadindex.ts) === //
export interface ElectronApi {
    // Projects
    listProjects: () => Promise<Project[]>;
    addProject: () => Promise<Project | null>;                  // asks for a folder
    removeProject: (id: string) => Promise<void>;
    setIde: (id: string, ide: IdeId | null) => Promise<void>;
    setEngine: (id: string, engine: IdeId | null) => Promise<void>;
    setProjectGroup: (projectId: string, groupId: string | null) => Promise<void>;
    openProject: (id: string, target: OpenTarget) => Promise<OpenResult>;
    revealProject: (id: string) => Promise<void>;              // opens the folder in the file manager
    copyProjectPath: (id: string) => Promise<void>;
    openRemote: (id: string) => Promise<OpenResult>;           // opens the repository's web page
    refreshProject: (id: string) => Promise<Project | null>;   // re-reads git, languages and engine version

    // Groups
    listGroups: () => Promise<Group[]>;
    createGroup: (name: string) => Promise<Group>;
    renameGroup: (id: string, name: string) => Promise<void>;
    setGroupCollapsed: (id: string, collapsed: boolean) => Promise<void>;
    deleteGroup: (id: string) => Promise<void>;                // its projects become ungrouped

    // IDEs and engine editors
    listIdes: () => Promise<IdeOption[]>;
    addCustomIde: () => Promise<IdeOption | null>;             // asks for the program
    renameIde: (id: IdeId, label: string) => Promise<void>;
    removeCustomIde: (id: IdeId) => Promise<string[]>;         // ids of the projects that used it
    rescanEngines: () => Promise<RescanResult>;

    // Settings and themes
    getSettings: () => Promise<Settings>;
    listThemes: () => Promise<ThemeList>;
    setTheme: (id: string) => Promise<void>;
    openThemesFolder: () => Promise<void>;
    setShortcut: (accelerator: string) => Promise<ShortcutResult>;
    setWindowStyle: (style: WindowStyle) => Promise<void>;
    setPanelSide: (side: PanelSide) => Promise<void>;
    setPanelOption: (option: PanelOption, value: boolean) => Promise<void>;

    // The panel
    panelReady: () => Promise<void>;                           // the page has loaded: show it
    panelClosed: () => Promise<void>;                          // the close animation has finished: hide the window
    hidePanel: () => Promise<void>;                            // ask for the panel to slide out
    onPanelEvent: (callback: (event: PanelEvent) => void) => () => void; // returns "stop listening"
    quitApp: () => Promise<void>;
}

// === Projects === //
export interface GitInfo {
    provider: GitProvider;
    remoteUrl: string | null;
    branch: string | null;
}

export interface LanguageShare {
    name: string;
    percent: number; // 0-100
}

/** The engine editor that matches a project's required version, if one is installed. */
export interface AutoEditor {
    id: IdeId;
    label: string;
}

export interface Project {
    id: string;
    name: string;
    path: string;
    kind: ProjectKind;
    ide: IdeId | null;               // the chosen IDE (one the user added), null = none chosen
    engine: IdeId | null;            // the chosen engine editor, null = automatic
    groupId: string | null;          // null = not in a group
    requiredVersion: string | null;  // engine version the project was saved with, e.g. "2022.3.10f1"
    autoEditor: AutoEditor | null;
    git: GitInfo | null;             // null = not a git repository
    languages: LanguageShare[];      // most used first
    exists: boolean;                 // false if the folder was moved or deleted
}

export interface Group {
    id: string;
    name: string;
    collapsed: boolean;
}

// === IDEs and engine editors === //
export interface IdeOption {
    id: IdeId;
    label: string;
    custom: boolean;      // true = added by the user (can be renamed and removed), false = detected engine editor
    detail: string;       // the program's full path
    engine?: ProjectKind; // set for detected engine editors
}

export interface OpenResult {
    ok: boolean;
    busy?: boolean;  // ignored: the same action was started a moment ago
    label?: string;  // what the project was opened with
    error?: string;
}

export interface RescanResult {
    ides: IdeOption[];
    autoEditors: Record<string, AutoEditor | null>; // by project id
}

// === Themes === //
export type ThemeColors = Record<ThemeColor, string>;

export interface Theme {
    id: string;
    name: string;
    author: string;
    mode: "dark" | "light";            // styles native controls such as dropdowns
    accentMode: "project" | "fixed";   // "project" tints the UI with each project's engine colour
    radius: number;                    // px
    motion: number;                    // animation duration multiplier, 0 = no animation
    colors: ThemeColors;
}

export interface ThemeList {
    themes: Theme[];
    problems: string[]; // human-readable problems found in theme files
    folder: string;
}

// === Settings === //
export interface Settings {
    themeId: string;
    windowStyle: WindowStyle;
    panelSide: PanelSide;
    shortcut: string;       // an Electron accelerator, e.g. "Control+Alt+Space"
    hideOnBlur: boolean;    // hide the panel when focus moves elsewhere
    hideAfterOpen: boolean; // hide the panel after opening a project
}

export interface ShortcutResult {
    ok: boolean;
    shortcut: string; // the shortcut that is active afterwards
    error?: string;
}

// === What the models save on this computer === //
export interface StoredProject {
    id: string;
    path: string;
    ide: IdeId | null;
    engine: IdeId | null;
    groupId: string | null;
}

export interface CustomIde {
    id: IdeId;
    label: string;
    path: string;
}

export interface StoredSettings extends Settings {
    customIdes: CustomIde[];
    groups: Group[];
}

// === Used inside the main process === //
export interface ScanResult {
    kind: ProjectKind;
    git: GitInfo | null;
    languages: LanguageShare[];
    exists: boolean;
}

/** An installed game-engine editor found on this computer. */
export interface EngineEditor {
    id: string;       // "engine:<engine>:<version>"
    label: string;    // "Unity 2022.3.10f1"
    engine: ProjectKind;
    version: string;
    executable: string;
}

/** Enough of a stored project to open it. */
export interface OpenRequest {
    path: string;
    ide: IdeId | null;
    engine: IdeId | null;
}

export interface LaunchPlan {
    label: string;
    command: string;
    args: string[];
}
