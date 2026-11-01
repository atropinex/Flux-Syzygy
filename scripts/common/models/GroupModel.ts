import {randomUUID} from "crypto";
import type {Group} from "../CommonInterface";
import {SettingsModel} from "./SettingsModel";

/** Named, collapsible sets of projects. Saved together with the settings. */
export class GroupModel {
    constructor(private readonly settings: SettingsModel) {
    }

    async list(): Promise<Group[]> {
        return (await this.settings.read()).groups;
    }

    async create(name: string): Promise<Group> {
        const group: Group = {id: randomUUID(), name: name.trim() || "New group", collapsed: false};
        await this.change((groups) => [...groups, group]);
        return group;
    }

    rename(id: string, name: string): Promise<void> {
        return this.change((groups) => groups.map((group) => (group.id === id ? {
            ...group,
            name: name.trim() || group.name
        } : group)));
    }

    setCollapsed(id: string, collapsed: boolean): Promise<void> {
        return this.change((groups) => groups.map((group) => (group.id === id ? {...group, collapsed} : group)));
    }

    remove(id: string): Promise<void> {
        return this.change((groups) => groups.filter((group) => group.id !== id));
    }

    private change(change: (groups: Group[]) => Group[]): Promise<void> {
        return this.settings.update((settings) => ({...settings, groups: change(settings.groups)}));
    }
}
