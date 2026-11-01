import { spawn, type ChildProcess } from "child_process";
import { promises as fs } from "fs";
import { basename, join } from "path";
import type { EngineEditor, LaunchPlan, OpenRequest } from "../CommonInterface";
import { ENGINE_NAMES, isEngineKind, type OpenTarget } from "../projects/SyzygyContract";
import { EngineModel } from "./EngineModel";
import { IdeModel } from "./IdeModel";
import { ScannerModel } from "./ScannerModel";

/** Works out what to start for a project (its engine editor or an IDE) and starts it. */
export class LaunchModel {
    constructor(
        private readonly ides: IdeModel,
        private readonly engines: EngineModel,
        private readonly scanner: ScannerModel
    ) {}

    /** Opens the project and returns the name of what it was opened with. */
    async open(request: OpenRequest, target: OpenTarget): Promise<string> {
        const plan = target === "engine" ? await this.planEngine(request) : await this.planIde(request);
        await this.start(plan);
        return plan.label;
    }

    /** The game engine's own editor: the one the user picked, otherwise the exact version the project needs. */
    private async planEngine(request: OpenRequest): Promise<LaunchPlan> {
        const editors = await this.engines.editors();
        const kind = this.scanner.detectKind(await fs.readdir(request.path).catch(() => [] as string[]));

        let editor: EngineEditor | undefined = request.engine ? editors.find((item) => item.id === request.engine) : undefined;
        if (!editor) {
            if (!isEngineKind(kind)) throw new Error("This isn't a Unity, Unreal or Cocos project, so it has no engine editor.");

            const required = await this.engines.readRequiredVersion(request.path, kind);
            editor = this.engines.match(kind, required, editors) ?? undefined;
            if (!editor) {
                throw new Error(required
                    ? `${ENGINE_NAMES[kind]} ${required} isn't installed. Choose another editor, or rescan under Settings.`
                    : `No ${ENGINE_NAMES[kind]} editor chosen yet. Choose one for this project.`);
            }
        }
        return { label: editor.label, command: editor.executable, args: await this.engines.launchArgs(editor.engine, request.path) };
    }

    /** A code editor or IDE the user added. */
    private async planIde(request: OpenRequest): Promise<LaunchPlan> {
        if (!request.ide) throw new Error("No IDE chosen yet. Choose one for this project, or add one in Settings.");
        const ide = (await this.ides.list()).find((item) => item.id === request.ide);
        if (!ide) throw new Error("That IDE was removed. Choose another one.");

        // macOS applications are folders ending in .app and must be started through `open`.
        if (process.platform === "darwin" && ide.path.endsWith(".app")) {
            return { label: ide.label, command: "open", args: ["-a", ide.path, request.path] };
        }

        // Visual Studio opens a solution file rather than a folder.
        const entries = await fs.readdir(request.path).catch(() => [] as string[]);
        const solution = /devenv/i.test(basename(ide.path)) ? entries.find((entry) => entry.endsWith(".sln")) : undefined;
        return { label: ide.label, command: ide.path, args: [solution ? join(request.path, solution) : request.path] };
    }

    /**
     * Starts a program completely independent of this app and of any console window.
     *
     * Going through a shell made Windows open a console that stayed alive for as long as the program
     * ran, and closing it closed the program too. So programs are started directly. `windowsHide` is
     * deliberately not used for them: it also tells GUI programs such as Unity to start with their
     * window hidden, so the editor would run but never appear.
     */
    private spawnDetached(command: string, args: string[]): ChildProcess {
        const options = { detached: true, stdio: "ignore" } as const;

        // .cmd and .bat files can only run through cmd.exe. `start /B` hands the real program over to
        // Windows, so nothing is left waiting on a console. Only that console is hidden.
        if (process.platform === "win32" && /\.(cmd|bat)$/i.test(command)) {
            const line = ["start", '""', "/B", ...[command, ...args].map((part) => `"${part}"`)].join(" ");
            return spawn("cmd.exe", ["/d", "/s", "/c", `"${line}"`], { ...options, windowsHide: true, windowsVerbatimArguments: true });
        }
        return spawn(command, args, options);
    }

    private start({ label, command, args }: LaunchPlan): Promise<void> {
        return new Promise((resolve, reject) => {
            const child = this.spawnDetached(command, args);
            const failure = (detail: string) =>
                new Error(`Could not start ${label} (${detail}). Check that it is installed and the path is correct.`);

            child.once("error", (error) => reject(failure(error.message)));
            child.once("exit", (code) => code && reject(failure(`exit code ${code}`))); // e.g. cmd.exe reporting a missing program
            child.once("spawn", () => {
                // Wait briefly so an immediate failure can still be reported.
                setTimeout(() => { child.unref(); resolve(); }, 350);
            });
        });
    }
}
