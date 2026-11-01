import { promises as fs } from "fs";
import { extname, join } from "path";
import type { GitInfo, LanguageShare, ScanResult } from "../CommonInterface";
import { EXTENSION_TO_LANGUAGE, IGNORED_DIRS, KIND_MARKERS, MAX_FILES_SCANNED } from "../projects/SyzygyConfig";
import type { GitProvider, ProjectKind } from "../projects/SyzygyContract";

function providerFromUrl(url: string): GitProvider {
    if (url.includes("github.com")) return "github";
    if (url.includes("gitlab")) return "gitlab";
    if (url.includes("bitbucket")) return "bitbucket";
    return "other";
}

/** Looks inside a project folder: what kind of project it is, its git remote, and its languages. */
export class ScannerModel {
    async scan(root: string): Promise<ScanResult> {
        const entries = await fs.readdir(root).catch(() => null);
        if (!entries) return { kind: "unknown", git: null, languages: [], exists: false };

        const [git, languages] = await Promise.all([this.detectGit(root), this.detectLanguages(root)]);
        return { kind: this.detectKind(entries), git, languages, exists: true };
    }

    /** `entries` are the names of the files and folders in the project's root. */
    detectKind(entries: string[]): ProjectKind {
        const matches = KIND_MARKERS.find((marker) =>
            Boolean(marker.names?.some((name) => entries.includes(name))) ||
            Boolean(marker.all?.every((name) => entries.includes(name))) ||
            Boolean(marker.endsWith?.some((ending) => entries.some((entry) => entry.endsWith(ending)))));
        return matches?.kind ?? "unknown";
    }

    async detectGit(root: string): Promise<GitInfo | null> {
        const gitPath = join(root, ".git");
        try {
            const stat = await fs.stat(gitPath);
            if (!stat.isDirectory()) return { provider: "local", remoteUrl: null, branch: null }; // worktree or submodule
        } catch {
            return null;
        }

        const config = await fs.readFile(join(gitPath, "config"), "utf8").catch(() => "");
        const head = await fs.readFile(join(gitPath, "HEAD"), "utf8").catch(() => "");

        const remoteUrl = config.match(/^\s*url\s*=\s*(.+)$/m)?.[1].trim() ?? null;
        const branch = head.match(/^ref: refs\/heads\/(.+)$/m)?.[1].trim() ?? null;

        return { provider: remoteUrl ? providerFromUrl(remoteUrl) : "local", remoteUrl, branch };
    }

    /** The five most used languages, by file size. */
    async detectLanguages(root: string): Promise<LanguageShare[]> {
        const bytesPerLanguage = new Map<string, number>();
        const pending = [root];
        let filesSeen = 0;

        while (pending.length > 0 && filesSeen < MAX_FILES_SCANNED) {
            const dir = pending.pop()!;
            const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);

            for (const entry of entries) {
                const fullPath = join(dir, entry.name);
                if (entry.isDirectory()) {
                    if (!IGNORED_DIRS.has(entry.name)) pending.push(fullPath);
                    continue;
                }

                const language = EXTENSION_TO_LANGUAGE[extname(entry.name).toLowerCase()];
                if (!language) continue;

                filesSeen++;
                const { size } = await fs.stat(fullPath).catch(() => ({ size: 0 }));
                bytesPerLanguage.set(language, (bytesPerLanguage.get(language) ?? 0) + size);
            }
        }

        const total = [...bytesPerLanguage.values()].reduce((sum, bytes) => sum + bytes, 0);
        if (total === 0) return [];

        return [...bytesPerLanguage.entries()]
            .map(([name, bytes]) => ({ name, percent: Math.round((bytes / total) * 1000) / 10 }))
            .sort((a, b) => b.percent - a.percent)
            .slice(0, 5);
    }
}
