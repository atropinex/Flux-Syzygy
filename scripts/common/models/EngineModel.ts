import {promises as fs} from "fs";
import {homedir} from "os";
import {join} from "path";
import type {AutoEditor, EngineEditor} from "../CommonInterface";
import {ENGINE_NAMES, isEngineKind, type EngineKind, type ProjectKind} from "../projects/SyzygyContract";

const PLATFORM = process.platform;
const HOME = homedir();

const exists = (file: string) => fs.access(file).then(() => true, () => false);

async function subfolders(dir: string): Promise<string[]> {
    const entries = await fs.readdir(dir, {withFileTypes: true}).catch(() => []);
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function readJson(file: string): Promise<unknown> {
    try {
        return JSON.parse(await fs.readFile(file, "utf8"));
    } catch {
        return null;
    }
}

function makeEditor(engine: EngineKind, version: string, executable: string): EngineEditor {
    return {
        id: `engine:${engine}:${version}`,
        label: `${ENGINE_NAMES[engine]} ${version}`,
        engine,
        version,
        executable
    };
}

/** Looks for `<root>/<version>/<executable path>` in each root and keeps the ones that exist. */
async function collect(
    engine: EngineKind, roots: string[], executableIn: (root: string, version: string) => string
): Promise<EngineEditor[]> {
    const found: EngineEditor[] = [];
    for (const root of roots) {
        for (const version of await subfolders(root)) {
            const executable = executableIn(root, version);
            if (await exists(executable)) found.push(makeEditor(engine, version, executable));
        }
    }
    return found;
}

const majorMinor = (version: string) => version.split(".").slice(0, 2).join(".");

/** Finds the installed Unity, Unreal Engine and Cocos Creator editors, and picks the right one for a project. */
export class EngineModel {
    private cache: Promise<EngineEditor[]> | null = null;

    /** Detected once and reused until `refresh` is true. Newest version first within each engine. */
    editors(refresh = false): Promise<EngineEditor[]> {
        if (refresh || !this.cache) this.cache = this.detectAll();
        return this.cache;
    }

    /** The engine version a project was last saved with, or null if unknown or not an engine project. */
    async readRequiredVersion(root: string, kind: ProjectKind): Promise<string | null> {
        if (kind === "unity") {
            const text = await fs.readFile(join(root, "ProjectSettings", "ProjectVersion.txt"), "utf8").catch(() => "");
            return text.match(/m_EditorVersion:\s*(\S+)/)?.[1] ?? null;
        }

        if (kind === "unreal") {
            const file = (await fs.readdir(root).catch(() => [] as string[])).find((name) => name.endsWith(".uproject"));
            const data = file ? ((await readJson(join(root, file))) as { EngineAssociation?: string } | null) : null;
            // A GUID means a custom engine build; only plain "5.3" style versions can be matched.
            return data?.EngineAssociation?.match(/^\d+\.\d+/)?.[0] ?? null;
        }

        if (kind === "cocos") {
            const pkg = (await readJson(join(root, "package.json"))) as { creator?: { version?: string } } | null;   // Creator 3.x
            const legacy = (await readJson(join(root, "project.json"))) as { version?: string } | null;             // Creator 2.x
            return pkg?.creator?.version ?? legacy?.version ?? null;
        }
        return null;
    }

    /**
     * Only an exact version counts. Opening a Unity project in another editor version can trigger an
     * irreversible upgrade, so a "close enough" one is never picked automatically.
     */
    match(kind: ProjectKind, required: string | null, editors: EngineEditor[]): EngineEditor | null {
        if (!required) return null;
        return editors.find((editor) =>
            editor.engine === kind && (kind === "unreal" ? majorMinor(editor.version) === majorMinor(required) : editor.version === required)) ?? null;
    }

    /** The installed editor with exactly the version this project needs. */
    async findAuto(projectPath: string, kind: ProjectKind): Promise<AutoEditor | null> {
        const required = await this.readRequiredVersion(projectPath, kind);
        const match = this.match(kind, required, await this.editors());
        return match ? {id: match.id, label: match.label} : null;
    }

    /** How to tell each editor which project to open. */
    async launchArgs(engine: ProjectKind, projectPath: string): Promise<string[]> {
        if (engine === "unity") return ["-projectPath", projectPath];
        if (engine === "cocos") return ["--project", projectPath];

        const file = (await fs.readdir(projectPath).catch(() => [] as string[])).find((name) => name.endsWith(".uproject"));
        if (!file) throw new Error("This folder has no .uproject file for Unreal to open.");
        return [join(projectPath, file)];
    }

    /** The engine's display name, e.g. "Unity". Empty for projects without an engine. */
    engineName(kind: ProjectKind): string {
        return isEngineKind(kind) ? ENGINE_NAMES[kind] : "";
    }

    // === Detection === //

    private async detectAll(): Promise<EngineEditor[]> {
        const all = (await Promise.all([this.detectUnity(), this.detectUnreal(), this.detectCocos()])).flat();
        return all.sort((a, b) => a.engine.localeCompare(b.engine) || b.version.localeCompare(a.version, undefined, {numeric: true}));
    }

    /** Editors the Unity Hub knows about, including ones added by hand from any folder ("Locate editor"). */
    private async unityHubEditors(hubDir: string): Promise<EngineEditor[]> {
        const list = (await readJson(join(hubDir, "editors-v2.json"))) as
            { data?: { version?: string; location?: string[] }[] } | null;

        const found: EngineEditor[] = [];
        for (const entry of list?.data ?? []) {
            let executable = entry.location?.[0];
            if (!entry.version || !executable) continue;
            if (executable.endsWith(".app")) executable = join(executable, "Contents", "MacOS", "Unity");
            if (await exists(executable)) found.push(makeEditor("unity", entry.version, executable));
        }
        return found;
    }

    private async detectUnity(): Promise<EngineEditor[]> {
        let root: string;
        let hubDir: string;
        if (PLATFORM === "win32") {
            root = "C:\\Program Files\\Unity\\Hub\\Editor";
            hubDir = join(process.env.APPDATA ?? "", "UnityHub");
        } else if (PLATFORM === "darwin") {
            root = "/Applications/Unity/Hub/Editor";
            hubDir = join(HOME, "Library/Application Support/UnityHub");
        } else {
            root = join(HOME, "Unity/Hub/Editor");
            hubDir = join(HOME, ".config/UnityHub");
        }

        // Unity Hub lets people choose another install folder; it remembers it in this file.
        const roots = [root];
        const secondary = await readJson(join(hubDir, "secondaryInstallPath.json"));
        if (typeof secondary === "string" && secondary) roots.push(secondary);

        const scanned = await collect("unity", roots, (folder, version) => {
            if (PLATFORM === "win32") return join(folder, version, "Editor", "Unity.exe");
            if (PLATFORM === "darwin") return join(folder, version, "Unity.app", "Contents", "MacOS", "Unity");
            return join(folder, version, "Editor", "Unity");
        });

        // Merge, keeping one editor per version.
        const byId = new Map<string, EngineEditor>();
        for (const editor of [...scanned, ...(await this.unityHubEditors(hubDir))]) {
            if (!byId.has(editor.id)) byId.set(editor.id, editor);
        }
        return [...byId.values()];
    }

    private detectCocos(): Promise<EngineEditor[]> {
        const roots =
            PLATFORM === "win32"
                ? ["C:\\CocosDashboard\\resources\\.editors\\Creator", join(process.env.ProgramData ?? "C:\\ProgramData", "cocos", "editors", "Creator")]
                : PLATFORM === "darwin" ? ["/Applications/Cocos/Creator"] : [];

        return collect("cocos", roots, (root, version) =>
            PLATFORM === "win32"
                ? join(root, version, "CocosCreator.exe")
                : join(root, version, "CocosCreator.app", "Contents", "MacOS", "CocosCreator"));
    }

    private async unrealInstalls(): Promise<Array<{ version: string; location: string }>> {
        const installs: Array<{ version: string; location: string }> = [];
        const folderPattern = /^UE_(\d+\.\d+)/;

        if (PLATFORM === "win32") {
            // The Epic Games Launcher keeps a list of everything it installed, wherever it was installed to.
            const manifest = join(process.env.ProgramData ?? "C:\\ProgramData", "Epic", "UnrealEngineLauncher", "LauncherInstalled.dat");
            const data = (await readJson(manifest)) as {
                InstallationList?: { InstallLocation?: string; AppName?: string }[]
            } | null;
            for (const item of data?.InstallationList ?? []) {
                const version = item.AppName?.match(folderPattern)?.[1];
                if (version && item.InstallLocation) installs.push({version, location: item.InstallLocation});
            }
        }

        const defaultRoot = PLATFORM === "win32" ? "C:\\Program Files\\Epic Games" : PLATFORM === "darwin" ? "/Users/Shared/Epic Games" : "";
        if (defaultRoot) {
            for (const folder of await subfolders(defaultRoot)) {
                const version = folder.match(folderPattern)?.[1];
                if (version) installs.push({version, location: join(defaultRoot, folder)});
            }
        }
        return installs;
    }

    private async detectUnreal(): Promise<EngineEditor[]> {
        const editors = new Map<string, EngineEditor>();

        for (const {version, location} of await this.unrealInstalls()) {
            // Unreal 4 shipped as UE4Editor, Unreal 5 as UnrealEditor.
            const names = version.startsWith("4.") ? ["UE4Editor", "UnrealEditor"] : ["UnrealEditor", "UE4Editor"];
            const candidates = names.map((name) =>
                PLATFORM === "win32"
                    ? join(location, "Engine", "Binaries", "Win64", `${name}.exe`)
                    : join(location, "Engine", "Binaries", "Mac", `${name}.app`, "Contents", "MacOS", name));

            for (const executable of candidates) {
                if (!editors.has(version) && (await exists(executable))) editors.set(version, makeEditor("unreal", version, executable));
            }
        }
        return [...editors.values()];
    }
}
