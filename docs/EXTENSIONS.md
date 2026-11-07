# Extensions

Flux Syzygy can be extended with small add-ons. An extension can put **badges** on project cards, add **items to a
project's right-click menu**, open its own **windows**, and remember things between runs.

Nothing ships with the app. Extensions are separate packages: **install** one by unzipping its folder into the
extensions folder (**Settings > Extensions > Open extensions folder**), then press **Reload extensions**. Each
extension can live in its own git repository.

> **Extensions run with full access to your computer**, like a VS Code extension: they are ordinary Node.js code
> running inside the app. Only install extensions you trust.

**Developing an extension**: set the `SYZYGY_EXTENSIONS` environment variable to a folder that contains your extension
folders (several folders can be listed, separated like `PATH`), then start the app. Extensions found there replace an
installed one with the same `id`, so you can edit in your own repository and just press *Reload extensions*.

## An extension

```
my-extension/
  extension.json     required
  main.js            the script named by "main"; runs in the app's main process (CommonJS)
  window/...         optional: pages for the extension's windows
```

`extension.json`:

```json
{
    "id": "my-extension",
    "name": "My Extension",
    "version": "1.0.0",
    "description": "What it does, in a sentence.",
    "author": "You",
    "main": "main.js"
}
```

`id` is 2 to 49 characters: lowercase letters, digits and dashes. `main` must stay inside the extension's folder.

`main.js` exports `activate(context)` (required) and `deactivate()` (optional). Everything an extension registers is
removed when it is switched off or reloaded.

```js
exports.activate = async function activate(context) {
    const projects = await context.projects.list();

    context.commands.register("hello", ({ projectId }) => context.notify(`Hello from ${projectId}`));

    for (const project of projects) {
        context.projects.contribute(project.id, {
            badges: [{ id: "hi", text: "Hi", tone: "info", tooltip: "Say hello", command: "hello", args: { projectId: project.id } }],
            menu: [{ id: "hello", label: "Say hello", command: "hello", args: { projectId: project.id } }]
        });
    }
};
```

## The `context` an extension receives

| | |
|---|---|
| `id`, `version`, `folder` | who this is, and where its files are |
| `log(...)` | writes to the app's log, prefixed with the id |
| `notify(message, isError?)` | shows a message in the panel's toast |
| `openExternal(url)` | opens a link in the browser. **https only** |
| `projects.list()` | `[{ id, name, path, kind }]` for every project in the app |
| `projects.onDidChange(listener)` | a project was added or removed |
| `projects.contribute(projectId, { badges, menu })` | replaces what this extension shows for that project |
| `projects.clear(projectId)` | removes it |
| `commands.register(name, handler)` | a command a badge or menu item can run: `handler(args)` |
| `ipc.handle(channel, handler)` | answers calls from this extension's windows: `handler(payload, { windowId })` |
| `windows.open({ id?, title, page, width?, height?, data? })` | opens a window and returns its id. The same `id` focuses the existing window |
| `windows.send(windowId, channel, payload?)` | sends a message to a window |
| `windows.close(windowId)`, `windows.onDidClose(listener)` | |
| `storage.get(key, fallback?)`, `storage.set(key, value)` | a small JSON store, private to the extension |

Anything that returns something you can stop (`onDidChange`, `register`, `handle`, `onDidClose`) gives back
`{ dispose() }`; it is disposed automatically when the extension is deactivated.

**Badges** (up to 4 per project): `{ id, text (max 24 characters), tone, tooltip?, command?, args? }`. `tone` is one of
`info`, `ok`, `warn`, `danger`, `muted`. A badge without a `command` is just a label. **Menu items** (up to 8 per project):
`{ id, label, command, args?, hint?, danger? }`. Everything is validated and trimmed before the page sees it.

## Windows

A window is a normal window that shows one of the extension's own `.html` files. It has `window.extension`:

```js
const info = await window.extension.getInfo();          // { extensionId, windowId, data, theme: { mode, colors } }
const reply = await window.extension.invoke("channel", payload);   // calls context.ipc.handle("channel", ...)
const stop = window.extension.on("channel", (payload) => {});      // receives context.windows.send(windowId, "channel", ...)
window.extension.close();
```

`info.theme` is the app's current theme (`background`, `panel`, `panelRaised`, `text`, `muted`, `accent`, `onAccent`,
`danger`), so a window can match the app. Windows are sandboxed: no Node, no access to the app's own API, and they can
only navigate to files inside their extension's folder. A window can only reach the extension that opened it; the app
works out who is calling from the window itself, never from anything the page says. Pages should set a strict
`Content-Security-Policy` and keep their scripts in files (see the Package Updates extension's `window/index.html`).

## Keeping the preload scripts apart

`scripts/preload/preloadindex.ts` (the panel) and `scripts/preload/preloadextension.ts` (extension windows) must not import
a common module: rollup would split it into a shared chunk, and a sandboxed preload cannot load one. That is why the
extension window channels live in their own file, `SyzygyExtensionConnection.ts`.

## Extensions that exist

* **Package Updates** (`package-updates`): shows which npm and NuGet packages of a project are out of date, with a window
  to update them and a built-in console.
* **Git Updates** (`git-updates`): shows whether a project's git repository is behind its remote, with a window to fetch
  and pull.
