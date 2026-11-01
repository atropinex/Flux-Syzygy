import {app} from "electron";
import {promises as fs} from "fs";
import {join} from "path";

/**
 * One JSON file in the app's data folder.
 *
 * Every change is "read the file, change it, write it back". Two of those running at once (a double
 * click, a held key) would each start from the same old data and the second would erase the first.
 * So changes are queued and run strictly one after another, and each write goes to a temporary file
 * that is then renamed, so a reader never sees half a file.
 */
export class StoreModel<T> {
    private queue: Promise<unknown> = Promise.resolve();

    /** `parse` turns whatever is on disk (or `undefined` if there is nothing) into a valid value. */
    constructor(private readonly fileName: string, private readonly parse: (raw: unknown) => T) {
    }

    async read(): Promise<T> {
        try {
            return this.parse(JSON.parse(await fs.readFile(this.file, "utf8")));
        } catch {
            return this.parse(undefined); // first run, or an unreadable file
        }
    }

    /** Applies a change to the saved value. Safe to call many times at once. */
    update(change: (value: T) => T): Promise<void> {
        return this.enqueue(async () => this.write(change(await this.read())));
    }

    private get file(): string {
        return join(app.getPath("userData"), this.fileName);
    }

    private enqueue<R>(task: () => Promise<R>): Promise<R> {
        const run = this.queue.then(task, task);
        this.queue = run.catch(() => undefined);
        return run;
    }

    private async write(value: T): Promise<void> {
        const text = JSON.stringify(value, null, 2);
        const temporary = `${this.file}.tmp`;
        try {
            await fs.writeFile(temporary, text);
            await fs.rename(temporary, this.file);
        } catch {
            await fs.writeFile(this.file, text); // e.g. the rename was blocked by antivirus; still save
        }
    }
}
