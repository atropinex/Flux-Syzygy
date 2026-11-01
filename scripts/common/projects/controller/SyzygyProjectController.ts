import {clipboard, dialog, ipcMain, shell} from "electron";
import {basename} from "path";
import type {OpenResult, Project, StoredProject} from "../../CommonInterface";
import {EngineModel} from "../../models/EngineModel";
import {LaunchModel} from "../../models/LaunchModel";
import {ProjectModel} from "../../models/ProjectModel";
import {ScannerModel} from "../../models/ScannerModel";
import {Cooldown} from "../../utils/CooldownHelper";
import {remoteToWebUrl} from "../../utils/GitHelper";
import {OPEN_COOLDOWN_MS, SHORT_COOLDOWN_MS} from "../SyzygyConfig";
import {SyzygyIPC} from "../SyzygyConnection";
import type {IdeId, OpenTarget} from "../SyzygyContract";
import {SyzygyPanelController} from "./SyzygyPanelController";

/** Answers the page's requests about projects: listing, adding, opening and the right-click tools. */
export class SyzygyProjectController {
    private readonly cooldown = new Cooldown();

    constructor(
        private readonly panel: SyzygyPanelController,
        private readonly projects: ProjectModel,
        private readonly scanner: ScannerModel,
        private readonly engines: EngineModel,
        private readonly launcher: LaunchModel
    ) {
    }

    register(): void {
        ipcMain.handle(SyzygyIPC.listProjects, async () => Promise.all((await this.projects.list()).map((stored) => this.describe(stored))));
        ipcMain.handle(SyzygyIPC.addProject, () => this.addProject());
        ipcMain.handle(SyzygyIPC.removeProject, (_event, id: string) => this.projects.remove(id));
        ipcMain.handle(SyzygyIPC.setIde, (_event, id: string, ide: IdeId | null) => this.projects.patch(id, {ide}));
        ipcMain.handle(SyzygyIPC.setEngine, (_event, id: string, engine: IdeId | null) => this.projects.patch(id, {engine}));
        ipcMain.handle(SyzygyIPC.setProjectGroup, (_event, id: string, groupId: string | null) => this.projects.patch(id, {groupId}));
        ipcMain.handle(SyzygyIPC.openProject, (_event, id: string, target: OpenTarget) => this.openProject(id, target));
        ipcMain.handle(SyzygyIPC.revealProject, (_event, id: string) => this.revealProject(id));
        ipcMain.handle(SyzygyIPC.copyProjectPath, (_event, id: string) => this.copyPath(id));
        ipcMain.handle(SyzygyIPC.openRemote, (_event, id: string) => this.openRemote(id));
        ipcMain.handle(SyzygyIPC.refreshProject, async (_event, id: string) => {
            const stored = await this.projects.find(id);
            return stored ? this.describe(stored) : null;
        });
    }

    /** A stored project plus everything we can read from its folder. */
    private async describe(stored: StoredProject): Promise<Project> {
        const scan = await this.scanner.scan(stored.path);
        return {
            ...stored,
            name: basename(stored.path),
            ...scan,
            requiredVersion: await this.engines.readRequiredVersion(stored.path, scan.kind),
            autoEditor: await this.engines.findAuto(stored.path, scan.kind)
        };
    }

    private async addProject(): Promise<Project | null> {
        if (this.panel.dialogOpen) return null; // one folder picker at a time

        const {canceled, filePaths} = await this.panel.withDialog((parent) =>
            dialog.showOpenDialog(parent, {title: "Choose a project folder", properties: ["openDirectory"]}));
        if (canceled || filePaths.length === 0) return null;

        return this.describe(await this.projects.add(filePaths[0]));
    }

    private async openProject(id: string, target: OpenTarget): Promise<OpenResult> {
        const key = `open:${id}:${target}`;
        if (this.cooldown.tooSoon(key, OPEN_COOLDOWN_MS)) return {ok: false, busy: true};

        const project = await this.projects.find(id);
        if (!project) {
            this.cooldown.forget(key);
            return {ok: false, error: "Project not found."};
        }

        try {
            return {ok: true, label: await this.launcher.open(project, target)};
        } catch (error) {
            this.cooldown.forget(key); // it didn't start, so trying again straight away is fine
            return {ok: false, error: (error as Error).message};
        }
    }

    private async revealProject(id: string): Promise<void> {
        if (this.cooldown.tooSoon(`reveal:${id}`, SHORT_COOLDOWN_MS)) return;
        const project = await this.projects.find(id);
        if (project) await shell.openPath(project.path);
    }

    private async copyPath(id: string): Promise<void> {
        const project = await this.projects.find(id);
        if (project) clipboard.writeText(project.path);
    }

    private async openRemote(id: string): Promise<OpenResult> {
        const key = `remote:${id}`;
        if (this.cooldown.tooSoon(key, SHORT_COOLDOWN_MS)) return {ok: false, busy: true};

        const project = await this.projects.find(id);
        const remote = project ? (await this.scanner.detectGit(project.path))?.remoteUrl : null;
        const url = remote ? remoteToWebUrl(remote) : null;
        if (!url) {
            this.cooldown.forget(key);
            return {ok: false, error: "This project has no remote with a web address."};
        }

        // Only web links, never anything else.
        await shell.openExternal(url);
        return {ok: true, label: url};
    }
}
