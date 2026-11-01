// === Plain types and constants shared by the main process, the preload script and the page === //

/** "custom-<uuid>" for an IDE the user added, or "engine:<engine>:<version>" for a detected engine editor. */
export type IdeId = string;

export type ProjectKind =
    | "unity" | "unreal" | "cocos" | "godot" | "node" | "dotnet"
    | "rust" | "go" | "python" | "java" | "unknown";

/** "local" = a git repository with no remote configured. */
export type GitProvider = "github" | "gitlab" | "bitbucket" | "other" | "local";

/** The two ways to open a project: its game-engine editor, or a code editor / IDE. */
export type OpenTarget = "engine" | "ide";

/** "panel" slides in from a screen edge on a shortcut; "window" is a regular window. */
export type WindowStyle = "panel" | "window";

/** Which edge of the screen the panel docks to. */
export type PanelSide = "left" | "right";

/** The on/off settings of the panel. */
export type PanelOption = "hideOnBlur" | "hideAfterOpen";

/** Sent from the main process to the page when the shortcut shows or hides the panel. */
export type PanelEvent = "open" | "close";

// === Engines === //
export const ENGINE_KINDS = ["unity", "unreal", "cocos"] as const;
export type EngineKind = (typeof ENGINE_KINDS)[number];
export const isEngineKind = (kind: ProjectKind): kind is EngineKind => (ENGINE_KINDS as readonly string[]).includes(kind);

export const ENGINE_NAMES: Record<EngineKind, string> = {
    unity: "Unity",
    unreal: "Unreal Engine",
    cocos: "Cocos Creator"
};

// === Themes === //
export const THEME_COLORS = ["background", "panel", "panelRaised", "text", "muted", "accent", "onAccent", "danger"] as const;
export type ThemeColor = (typeof THEME_COLORS)[number];
