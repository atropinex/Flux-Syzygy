import type {ProjectKind} from "./SyzygyContract";

// === Window === //
/** Window width in panel mode: the panel (540px) plus gutters for its shadow (12px at the screen edge, 28px on the other side). */
export const PANEL_WINDOW_WIDTH = 580;
export const REGULAR_WINDOW = {width: 1100, height: 760, minWidth: 760, minHeight: 520} as const;
export const WINDOW_BACKGROUND = "#0d0b14";

// === Guards against repeated actions === //
/** Shortcut presses closer together than this are ignored. Every press restarts the wait, so holding the key can't flicker the panel. */
export const TOGGLE_COOLDOWN_MS = 300;
/** Launching an editor takes seconds, so a repeat click in that time would start a second copy. */
export const OPEN_COOLDOWN_MS = 4000;
export const SHORT_COOLDOWN_MS = 1500;
export const STYLE_SWITCH_COOLDOWN_MS = 2000;
/** Fallback so the window is never left stuck if the page doesn't confirm that it finished closing. */
export const PANEL_CLOSE_TIMEOUT_MS = 1500;

// === Defaults === //
/** Cmd+Shift+Space on a Mac (Cmd+Option+Space opens Finder search there), Ctrl+Alt+Space elsewhere. */
export const DEFAULT_SHORTCUT = process.platform === "darwin" ? "Command+Shift+Space" : "Control+Alt+Space";
export const DEFAULT_THEME_ID = "midnight";

// === Project scanning === //
export const MAX_FILES_SCANNED = 4000; // keeps huge projects from freezing the scan

/** Folders full of generated or third-party files that would skew the language statistics. */
export const IGNORED_DIRS: ReadonlySet<string> = new Set([
    ".git", "node_modules", "dist", "build", "out", "target", "bin", "obj",
    "Library", "Temp", "Logs", "Intermediate", "Binaries", "Saved", "DerivedDataCache",
    ".venv", "venv", "__pycache__", ".idea", ".vs"
]);

export const EXTENSION_TO_LANGUAGE: Readonly<Record<string, string>> = {
    ".ts": "TypeScript", ".tsx": "TypeScript",
    ".js": "JavaScript", ".jsx": "JavaScript", ".mjs": "JavaScript", ".cjs": "JavaScript",
    ".cs": "C#",
    ".c": "C", ".h": "C",
    ".cpp": "C++", ".cc": "C++", ".hpp": "C++",
    ".py": "Python",
    ".java": "Java",
    ".kt": "Kotlin",
    ".rs": "Rust",
    ".go": "Go",
    ".gd": "GDScript",
    ".lua": "Lua",
    ".swift": "Swift",
    ".html": "HTML",
    ".css": "CSS", ".scss": "CSS",
    ".shader": "Shader", ".hlsl": "Shader", ".glsl": "Shader", ".cginc": "Shader"
};

/** Which marker files make a folder a project of this kind. Engines come first: they often contain package.json or .sln too. */
export const KIND_MARKERS: ReadonlyArray<{
    kind: ProjectKind;
    names?: string[];
    all?: string[];
    endsWith?: string[]
}> = [
    {kind: "unity", all: ["ProjectSettings", "Assets"]},
    {kind: "unreal", endsWith: [".uproject"]},
    {kind: "cocos", names: [".creator"]},                       // Cocos Creator 3.x
    {kind: "cocos", all: ["project.json", "assets", "settings"]}, // Cocos Creator 2.x
    {kind: "godot", names: ["project.godot"]},
    {kind: "dotnet", endsWith: [".sln", ".csproj"]},
    {kind: "rust", names: ["Cargo.toml"]},
    {kind: "go", names: ["go.mod"]},
    {kind: "java", names: ["pom.xml", "build.gradle", "build.gradle.kts"]},
    {kind: "python", names: ["pyproject.toml", "requirements.txt", "setup.py"]},
    {kind: "node", names: ["package.json"]}
];
