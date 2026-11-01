import {app} from "electron";
import {promises as fs} from "fs";
import {join, basename, extname} from "path";
import {parse} from "yaml";
import type {Theme, ThemeColors, ThemeList} from "../CommonInterface";
import {THEME_COLORS} from "../projects/SyzygyContract";
import {DEFAULT_THEMES} from "./DefaultThemeModel";

/** Used for any value a theme file leaves out or gets wrong. Matches the Midnight theme. */
const FALLBACK_COLORS: ThemeColors = {
    background: "#0d0b14",
    panel: "#191525",
    panelRaised: "#241e36",
    text: "#f3eefc",
    muted: "#9b93b4",
    accent: "#ff66aa",
    onAccent: "#17101f",
    danger: "#ff8a8a"
};

const COLOR_PATTERN = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([^)]*\))$/i;
const isYaml = (name: string) => /\.ya?ml$/i.test(name);
const clamp = (value: unknown, min: number, max: number, fallback: number) =>
    typeof value === "number" && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

type Raw = Record<string, unknown>;

/** Themes are YAML files in a folder. This reads and checks them. */
export class ThemeModel {
    readonly folder = join(app.getPath("userData"), "themes");

    /** Reads every theme file. A broken file is reported without stopping the others. */
    async load(): Promise<ThemeList> {
        await this.ensureDefaults();

        const problems: string[] = [];
        const files = (await fs.readdir(this.folder).catch(() => [] as string[])).filter(isYaml).sort();
        const themes: Theme[] = [];

        for (const file of files) {
            const source = await fs.readFile(join(this.folder, file), "utf8").catch(() => "");
            const theme = this.toTheme(file, source, problems);
            if (theme) themes.push(theme);
        }
        return {themes, problems, folder: this.folder};
    }

    /** The first time the app runs the folder is filled with the built-in themes. After that the files belong to the user. */
    private async ensureDefaults(): Promise<void> {
        await fs.mkdir(this.folder, {recursive: true});
        if ((await fs.readdir(this.folder)).some(isYaml)) return;

        for (const [file, source] of Object.entries(DEFAULT_THEMES)) {
            await fs.writeFile(join(this.folder, file), source);
        }
    }

    private toTheme(file: string, source: string, problems: string[]): Theme | null {
        let raw: unknown;
        try {
            raw = parse(source);
        } catch (error) {
            problems.push(`${file}: ${(error as Error).message.split("\n")[0]}`);
            return null;
        }
        if (typeof raw !== "object" || raw === null) {
            problems.push(`${file}: expected a YAML mapping at the top level.`);
            return null;
        }

        const data = raw as Raw;
        const colors = (typeof data.colors === "object" && data.colors ? data.colors : {}) as Raw;
        const id = basename(file, extname(file));

        return {
            id,
            name: typeof data.name === "string" ? data.name : id,
            author: typeof data.author === "string" ? data.author : "Unknown",
            mode: data.mode === "light" ? "light" : "dark",
            accentMode: data.accent === "fixed" ? "fixed" : "project",
            radius: clamp(data.radius, 0, 32, 14),
            motion: clamp(data.motion, 0, 3, 1),
            colors: Object.fromEntries(THEME_COLORS.map((key) => [key, this.toColor(colors, key, file, problems)])) as ThemeColors
        };
    }

    private toColor(colors: Raw, key: keyof ThemeColors, file: string, problems: string[]): string {
        const value = colors[key];
        if (value === undefined) return FALLBACK_COLORS[key];
        if (typeof value === "string" && COLOR_PATTERN.test(value.trim())) return value.trim();

        problems.push(`${file}: "${key}" is not a valid colour (wrap hex colours in quotes). Using the default.`);
        return FALLBACK_COLORS[key];
    }
}
