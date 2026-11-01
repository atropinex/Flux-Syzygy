/** git@github.com:me/repo.git, ssh://git@host/me/repo.git and https URLs all become https://host/me/repo */
export function remoteToWebUrl(remote: string): string | null {
    const trimmed = remote.trim();

    const scpStyle = trimmed.match(/^[\w.-]+@([\w.-]+):(.+?)(?:\.git)?\/?$/);
    if (scpStyle) return `https://${scpStyle[1]}/${scpStyle[2]}`;

    try {
        const url = new URL(trimmed);
        if (!["http:", "https:", "ssh:", "git:"].includes(url.protocol)) return null;
        return `https://${url.hostname}${url.pathname.replace(/\.git\/?$/, "").replace(/\/$/, "")}`;
    } catch {
        return null; // a local path or something we can't open
    }
}
