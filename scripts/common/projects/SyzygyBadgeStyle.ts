import type {GitProvider, ProjectKind} from "./SyzygyContract";

// === Colours and symbols used to draw languages, engines and git hosts === //

export const LANGUAGE_STYLES: Record<string, { color: string; symbol: string }> = {
    TypeScript: {color: "#3f8fd8", symbol: "TS"},
    JavaScript: {color: "#f2d64b", symbol: "JS"},
    "C#": {color: "#9b6fd6", symbol: "C#"},
    C: {color: "#7f8da3", symbol: "C"},
    "C++": {color: "#e0689a", symbol: "C++"},
    Python: {color: "#4f9bd6", symbol: "Py"},
    Java: {color: "#e98b4a", symbol: "Jv"},
    Kotlin: {color: "#b06cf0", symbol: "Kt"},
    Rust: {color: "#e0865f", symbol: "Rs"},
    Go: {color: "#4fd0e0", symbol: "Go"},
    GDScript: {color: "#5f9fe8", symbol: "GD"},
    Lua: {color: "#5a6fe0", symbol: "Lu"},
    Swift: {color: "#f4784f", symbol: "Sw"},
    HTML: {color: "#ec7a4e", symbol: "<>"},
    CSS: {color: "#6d8cf0", symbol: "#"},
    Shader: {color: "#5fd3a0", symbol: "Sh"},
};
const FALLBACK_LANGUAGE = {color: "#aaa5bd", symbol: "?"};

export const KIND_STYLES: Record<ProjectKind, { label: string; color: string }> = {
    unity: {label: "Unity", color: "#8ab4ff"},
    unreal: {label: "Unreal Engine", color: "#6fa8dc"},
    cocos: {label: "Cocos", color: "#6fe08a"},
    godot: {label: "Godot", color: "#6aa8e8"},
    node: {label: "Node.js", color: "#8fd16a"},
    dotnet: {label: ".NET", color: "#a97cf0"},
    rust: {label: "Rust", color: "#f0905f"},
    go: {label: "Go", color: "#4fd0e0"},
    python: {label: "Python", color: "#f2d64b"},
    java: {label: "Java", color: "#f0a050"},
    unknown: {label: "Project", color: "#ff66aa"},
};

export const GIT_STYLES: Record<GitProvider, { label: string; color: string; symbol: string }> = {
    github: {label: "GitHub", color: "#e8e4f2", symbol: "GH"},
    gitlab: {label: "GitLab", color: "#fc8d5e", symbol: "GL"},
    bitbucket: {label: "Bitbucket", color: "#5d9cf5", symbol: "BB"},
    other: {label: "Git remote", color: "#c9a8f5", symbol: "git"},
    local: {label: "Local git only", color: "#8d86a6", symbol: "git"},
};

export const languageStyle = (name: string) => LANGUAGE_STYLES[name] ?? FALLBACK_LANGUAGE;
