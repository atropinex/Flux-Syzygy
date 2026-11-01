import {randomUUID} from "crypto";
import {basename} from "path";
import type {CustomIde, EngineEditor, IdeOption} from "../CommonInterface";
import type {IdeId} from "../projects/SyzygyContract";
import {SettingsModel} from "./SettingsModel";

/** "C:\Tools\Fleet\fleet.exe" -> "fleet", "/Applications/Zed.app" -> "Zed" */
export function labelFromPath(filePath: string): string {
    const name = basename(filePath);
    return name.replace(/\.(exe|cmd|bat|app|sh)$/i, "") || name;
}

/** The code editors and IDEs the user added. Nothing is built in. */
export class IdeModel {
    constructor(private readonly settings: SettingsModel) {
    }

    async list(): Promise<CustomIde[]> {
        return (await this.settings.read()).customIdes;
    }

    /** Adding the same program twice returns the existing entry. */
    async add(path: string): Promise<CustomIde> {
        const result: { ide?: CustomIde } = {};

        await this.settings.update((settings) => {
            const existing = settings.customIdes.find((ide) => ide.path === path);
            if (existing) {
                result.ide = existing;
                return settings;
            }
            result.ide = {id: `custom-${randomUUID()}`, label: labelFromPath(path), path};
            return {...settings, customIdes: [...settings.customIdes, result.ide]};
        });
        return result.ide!;
    }

    rename(id: IdeId, label: string): Promise<void> {
        return this.change((ides) => ides.map((ide) => (ide.id === id ? {...ide, label} : ide)));
    }

    remove(id: IdeId): Promise<void> {
        return this.change((ides) => ides.filter((ide) => ide.id !== id));
    }

    /** Detected engine editors first, then the user's own IDEs. */
    async toOptions(editors: EngineEditor[]): Promise<IdeOption[]> {
        const engines = editors.map((editor) => ({
            id: editor.id, label: editor.label, custom: false, detail: editor.executable, engine: editor.engine
        }));
        const custom = (await this.list()).map((ide) => ({
            id: ide.id,
            label: ide.label,
            custom: true,
            detail: ide.path
        }));
        return [...engines, ...custom];
    }

    toOption(ide: CustomIde): IdeOption {
        return {id: ide.id, label: ide.label, custom: true, detail: ide.path};
    }

    private change(change: (ides: CustomIde[]) => CustomIde[]): Promise<void> {
        return this.settings.update((settings) => ({...settings, customIdes: change(settings.customIdes)}));
    }
}
