import {randomUUID} from "crypto";
import type {StoredProject} from "../CommonInterface";
import type {IdeId} from "../projects/SyzygyContract";
import {StoreModel} from "./StoreModel";

const isCustomId = (id: unknown): id is IdeId => typeof id === "string" && id.startsWith("custom-");
const isEngineId = (id: unknown): id is IdeId => typeof id === "string" && id.startsWith("engine:");

function parseProjects(raw: unknown): StoredProject[] {
    if (!Array.isArray(raw)) return [];

    // Older versions kept one "ide" field that could hold either kind, or a built-in id such as "vscode".
    return (raw as Partial<StoredProject>[]).map((p) => ({
        id: p.id!,
        path: p.path!,
        ide: isCustomId(p.ide) ? p.ide : null,
        engine: isEngineId(p.engine) ? p.engine : isEngineId(p.ide) ? p.ide : null,
        groupId: typeof p.groupId === "string" ? p.groupId : null
    }));
}

/** The projects the user added: where they are, and which editor and group each one uses. */
export class ProjectModel {
    private readonly store = new StoreModel<StoredProject[]>("projects.json", parseProjects);

    list(): Promise<StoredProject[]> {
        return this.store.read();
    }

    async find(id: string): Promise<StoredProject | undefined> {
        return (await this.list()).find((project) => project.id === id);
    }

    /** Adds a folder. Adding the same folder twice returns the existing entry. */
    async add(path: string): Promise<StoredProject> {
        const result: { project?: StoredProject } = {};

        await this.store.update((projects) => {
            const existing = projects.find((project) => project.path === path);
            if (existing) {
                result.project = existing;
                return projects;
            }
            result.project = {id: randomUUID(), path, ide: null, engine: null, groupId: null};
            return [...projects, result.project];
        });
        return result.project!;
    }

    remove(id: string): Promise<void> {
        return this.store.update((projects) => projects.filter((project) => project.id !== id));
    }

    patch(id: string, changes: Partial<Pick<StoredProject, "ide" | "engine" | "groupId">>): Promise<void> {
        return this.store.update((projects) => projects.map((project) => (project.id === id ? {...project, ...changes} : project)));
    }

    /** Projects that used this IDE go back to having none chosen. Returns their ids. */
    async clearIde(ide: IdeId): Promise<string[]> {
        const affected: string[] = [];
        await this.store.update((projects) => {
            affected.push(...projects.filter((project) => project.ide === ide).map((project) => project.id));
            return projects.map((project) => (project.ide === ide ? {...project, ide: null} : project));
        });
        return affected;
    }

    /** Projects in this group become ungrouped. */
    clearGroup(groupId: string): Promise<void> {
        return this.store.update((projects) =>
            projects.map((project) => (project.groupId === groupId ? {...project, groupId: null} : project)));
    }
}
