import type {
    ExtensionTone, GitProvider, IdeId, OpenTarget, PanelEvent, PanelOption, PanelSide, ProjectKind, ThemeColor, WindowStyle
} from "./projects/SyzygyContract";

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

    // Extensions
    listExtensions: () => Promise<ExtensionInfo[]>;
    setExtensionEnabled: (id: string, enabled: boolean) => Promise<ExtensionInfo[]>;
    reloadExtensions: () => Promise<ExtensionInfo[]>;
    openExtensionsFolder: () => Promise<void>;
    getExtensionContributions: () => Promise<ExtensionContributions>;
    runExtensionCommand: (extensionId: string, command: string, args?: unknown) => Promise<void>;
    onExtensionsChanged: (callback: (contributions: ExtensionContributions) => void) => () => void;
    onExtensionNotice: (callback: (notice: ExtensionNotice) => void) => () => void;

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
    disabledExtensions: string[]; // ids of extensions the user switched off
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

// === Extensions === //

/** What an extension's extension.json says about it. */
export interface ExtensionManifest {
    id: string;          // lowercase letters, digits and dashes
    name: string;
    version: string;
    description: string;
    author?: string;
    main: string;        // the script that runs in the main process, relative to the extension's folder
}

export interface ExtensionInfo {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    folder: string;
    enabled: boolean;
    status: "active" | "disabled" | "error";
    error: string | null;
}

/** A small pill an extension shows on a project's card. */
export interface ExtensionBadge {
    extensionId: string;
    id: string;
    text: string;
    tone: ExtensionTone;
    tooltip?: string;
    command?: string;    // run when the badge is clicked
    args?: unknown;
}

/** An extra item an extension adds to a project's right-click menu. */
export interface ExtensionMenuItem {
    extensionId: string;
    id: string;
    label: string;
    command: string;
    args?: unknown;
    hint?: string;
    danger?: boolean;
}

export interface ExtensionProjectContribution {
    badges: ExtensionBadge[];
    menu: ExtensionMenuItem[];
}

/** Everything extensions add to the app, by project id. */
export type ExtensionContributions = Record<string, ExtensionProjectContribution>;

/** A message from an extension for the toast. */
export interface ExtensionNotice {
    message: string;
    isError: boolean;
}

// === What an extension can use (see docs/EXTENSIONS.md) === //

export interface Disposable {
    dispose: () => void;
}

/** A project, as extensions see it. */
export interface ExtensionProjectInfo {
    id: string;
    name: string;
    path: string;
    kind: ProjectKind;
}

/** What an extension passes to projects.contribute(). Anything invalid is dropped. */
export interface ExtensionContribution {
    badges?: Array<Omit<ExtensionBadge, "extensionId">>;
    menu?: Array<Omit<ExtensionMenuItem, "extensionId">>;
}

export interface ExtensionWindowOptions {
    id?: string;        // opening the same id again focuses the existing window
    title: string;
    page: string;       // an .html file inside the extension's folder
    width?: number;
    height?: number;
    data?: unknown;     // handed to the page: window.extension.getInfo().data
}

export interface ExtensionContext {
    readonly id: string;
    readonly version: string;
    readonly folder: string;
    log: (...args: unknown[]) => void;
    notify: (message: string, isError?: boolean) => void;
    openExternal: (url: string) => Promise<void>; // https links only
    projects: {
        list: () => Promise<ExtensionProjectInfo[]>;
        onDidChange: (listener: () => void) => Disposable;
        contribute: (projectId: string, contribution: ExtensionContribution) => void;
        clear: (projectId: string) => void;
    };
    commands: {
        register: (name: string, handler: (args?: unknown) => unknown) => Disposable;
    };
    ipc: {
        handle: (channel: string, handler: (payload: unknown, from: { windowId: string }) => unknown) => Disposable;
    };
    windows: {
        open: (options: ExtensionWindowOptions) => string;
        send: (windowId: string, channel: string, payload?: unknown) => void;
        close: (windowId: string) => void;
        onDidClose: (listener: (windowId: string) => void) => Disposable;
    };
    storage: {
        get: <T = unknown>(key: string, fallback?: T) => Promise<T | undefined>;
        set: (key: string, value: unknown) => Promise<void>;
    };
}

/** What an extension's main script exports. */
export interface ExtensionModule {
    activate: (context: ExtensionContext) => unknown;
    deactivate?: () => unknown;
}

/** What an extension's window sees as `window.extension` (see scripts/preload/preloadextension.ts). */
export interface ExtensionWindowInfo {
    extensionId: string;
    windowId: string;
    data: unknown;
    theme: { mode: "dark" | "light"; colors: ThemeColors }; // the app's current theme, so windows can match it
}

export interface ExtensionWindowApi {
    getInfo: () => Promise<ExtensionWindowInfo | null>;
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    on: (channel: string, callback: (payload: unknown) => void) => () => void;
    close: () => Promise<void>;
}
