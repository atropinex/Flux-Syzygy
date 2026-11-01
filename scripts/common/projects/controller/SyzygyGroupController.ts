import {ipcMain} from "electron";
import {GroupModel} from "../../models/GroupModel";
import {ProjectModel} from "../../models/ProjectModel";
import {SyzygyIPC} from "../SyzygyConnection";

/** Answers the page's requests about groups. */
export class SyzygyGroupController {
    constructor(private readonly groups: GroupModel, private readonly projects: ProjectModel) {
    }

    register(): void {
        ipcMain.handle(SyzygyIPC.listGroups, () => this.groups.list());
        ipcMain.handle(SyzygyIPC.createGroup, (_event, name: string) => this.groups.create(String(name)));
        ipcMain.handle(SyzygyIPC.renameGroup, (_event, id: string, name: string) => this.groups.rename(id, String(name)));
        ipcMain.handle(SyzygyIPC.setGroupCollapsed, (_event, id: string, collapsed: boolean) => this.groups.setCollapsed(id, Boolean(collapsed)));
        ipcMain.handle(SyzygyIPC.deleteGroup, async (_event, id: string) => {
            await this.groups.remove(id);
            await this.projects.clearGroup(id); // the projects stay, they just leave the group
        });
    }
}
