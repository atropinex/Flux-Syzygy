import { app } from "electron";
import { promises as fs } from "fs";
import { delimiter, join } from "path";
import type { ExtensionManifest } from "../CommonInterface";
import { EXTENSION_ID_PATTERN, EXTENSION_MANIFEST } from "../projects/SyzygyConfig";

/** An extension folder that was found on disk, whether or not its manifest is valid. */
export interface DiscoveredExtension {
    id: string;                        // the manifest's id, or the folder's name when the manifest is broken
    folder: string;
    manifest: ExtensionManifest | null;
    problem: string | null;            // why the manifest could not be used
}

/**
 * Finds extensions. An extension is a folder with an extension.json next to its code. Nothing ships
 * with the app: extensions are installed by putting their folder in the user's extensions folder.
 *
 * While developing an extension, the SYZYGY_EXTENSIONS environment variable can name more folders
 * to search (several, separated like PATH). An extension found there replaces an installed one with
 * the same id, so it can be edited in its own repository without copying it.
 */
export class ExtensionModel {
    readonly userFolder = join(app.getPath("userData"), "extensions");

    async discover(): Promise<DiscoveredExtension[]> {
        await fs.mkdir(this.userFolder, { recursive: true });

        const found = new Map<string, DiscoveredExtension>();
        for (const root of [this.userFolder, ...this.developmentFolders()]) {
            for (const name of await this.folders(root)) {
                const extension = await this.read(join(root, name), name);
                found.set(extension.id, extension); // later folders win, so a development copy replaces an installed one
            }
        }
        return [...found.values()].sort((a, b) => a.id.localeCompare(b.id));
    }

    private developmentFolders(): string[] {
        return (process.env.SYZYGY_EXTENSIONS ?? "").split(delimiter).map((folder) => folder.trim()).filter(Boolean);
    }

    private async folders(root: string): Promise<string[]> {
        const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
        return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith(".")).map((entry) => entry.name);
    }

    private async read(folder: string, folderName: string): Promise<DiscoveredExtension> {
        const broken = (problem: string): DiscoveredExtension => ({ id: folderName, folder, manifest: null, problem });

        let raw: unknown;
        try {
            raw = JSON.parse(await fs.readFile(join(folder, EXTENSION_MANIFEST), "utf8"));
        } catch (error) {
            return broken(error instanceof SyntaxError ? `${EXTENSION_MANIFEST} is not valid JSON.` : `${EXTENSION_MANIFEST} is missing.`);
        }

        const data = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
        const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

        const id = text(data.id);
        if (!EXTENSION_ID_PATTERN.test(id)) return broken('"id" must be 2 to 49 characters: lowercase letters, digits and dashes.');
        if (!text(data.name)) return broken('"name" is missing.');
        if (!text(data.main)) return broken('"main" is missing: the script to run.');

        return {
            id, folder, problem: null,
            manifest: {
                id,
                name: text(data.name),
                version: text(data.version) || "0.0.0",
                description: text(data.description),
                author: text(data.author) || undefined,
                main: text(data.main)
            }
        };
    }
}
