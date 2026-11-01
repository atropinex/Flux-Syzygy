import { dialog, ipcMain } from "electron";
import type { IdeOption, RescanResult } from "../../CommonInterface";
import { EngineModel } from "../../models/EngineModel";
import { IdeModel } from "../../models/IdeModel";
import { ProjectModel } from "../../models/ProjectModel";
import { ScannerModel } from "../../models/ScannerModel";
import { SyzygyIPC } from "../SyzygyConnection";
import type { IdeId } from "../SyzygyContract";
import { SyzygyPanelController } from "./SyzygyPanelController";

/** Answers the page's requests about engine editors and the IDEs the user added. */
export class SyzygyEditorController {
    constructor(
        private readonly panel: SyzygyPanelController,
        private readonly ides: IdeModel,
        private readonly projects: ProjectModel,
        private readonly engines: EngineModel,
        private readonly scanner: ScannerModel
    ) {}

    register(): void {
        ipcMain.handle(SyzygyIPC.listIdes, () => this.options());
        ipcMain.handle(SyzygyIPC.addCustomIde, () => this.addCustomIde());
        ipcMain.handle(SyzygyIPC.renameIde, (_event, id: IdeId, label: string) => this.ides.rename(id, String(label)));
        ipcMain.handle(SyzygyIPC.removeCustomIde, async (_event, id: IdeId): Promise<string[]> => {
            await this.ides.remove(id);
            return this.projects.clearIde(id); // projects that used it go back to having none chosen
        });
        ipcMain.handle(SyzygyIPC.rescanEngines, () => this.rescan());
    }

    private async options(): Promise<IdeOption[]> {
        return this.ides.toOptions(await this.engines.editors());
    }

    private async addCustomIde(): Promise<IdeOption | null> {
        if (this.panel.dialogOpen) return null; // one file picker at a time

        const { canceled, filePaths } = await this.panel.withDialog((parent) =>
            dialog.showOpenDialog(parent, {
                title: "Choose the IDE's program",
                // On macOS an application is a folder (.app), so folders must be selectable too.
                properties: process.platform === "darwin" ? ["openFile", "openDirectory"] : ["openFile"],
                filters: process.platform === "win32" ? [{ name: "Programs", extensions: ["exe", "cmd", "bat"] }] : []
            }));
        if (canceled || filePaths.length === 0) return null;

        return this.ides.toOption(await this.ides.add(filePaths[0]));
    }

    /** Looks for installed engine editors again and re-matches every project to one. */
    private async rescan(): Promise<RescanResult> {
        await this.engines.editors(true);

        const autoEditors: RescanResult["autoEditors"] = {};
        for (const project of await this.projects.list()) {
            const { kind } = await this.scanner.scan(project.path);
            autoEditors[project.id] = await this.engines.findAuto(project.path, kind);
        }
        return { ides: await this.options(), autoEditors };
    }
}
