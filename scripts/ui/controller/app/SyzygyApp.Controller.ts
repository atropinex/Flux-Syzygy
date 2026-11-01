import { useEffect } from "react";
import { KIND_STYLES } from "../../../common/projects/SyzygyBadgeStyle";
import { closeContextMenu, isContextMenuOpen } from "../contextmenu/SyzygyContextMenu.Controller";
import { loadIdes } from "../editor/SyzygyEditor.Controller";
import { loadGroups } from "../group/SyzygyGroup.Controller";
import { moveSelection, setEntranceEnabled } from "../list/SyzygyList.Controller";
import { hidePanel, initializePanel } from "../panel/SyzygyPanel.Controller";
import { loadProjects, projectStore, setQuery, useProjectState } from "../project/SyzygyProject.Controller";
import { closeSettings, isSettingsOpen, loadSettings } from "../settings/SyzygySettings.Controller";
import { applyAccent, initializeTheme } from "../theme/SyzygyTheme.Controller";

const focusSearch = () => document.querySelector<HTMLInputElement>("[data-search]")?.focus();

/** Each time the panel opens, start with a clean slate: no menu or drawer, cursor in the search box. */
function onPanelOpened(): void {
    closeContextMenu();
    if (isSettingsOpen()) closeSettings();
    focusSearch();
}

/** Loads everything the page shows. Runs once, before the first render. */
export async function loadAppData(): Promise<void> {
    // Settings and theme first, so the window never flashes the wrong colours or layout.
    const settings = await loadSettings();
    await initializeTheme(settings.themeId);

    setEntranceEnabled(settings.windowStyle !== "panel"); // opening the panel already slides the list in
    initializePanel(onPanelOpened);

    await Promise.all([loadIdes(), loadProjects(), loadGroups()]);
}

let announced = false;

/** Tells the main process the page is drawn, so it can show the window. */
export function announceReady(): void {
    if (announced) return;
    announced = true;
    void window.api.panelReady();
}

/** Tints the app with the selected project's engine colour (unless the theme pins its own accent). */
export function useAccent(): void {
    const { projects, selectedId } = useProjectState();
    const project = projects.find((item) => item.id === selectedId);
    const color = project ? KIND_STYLES[project.kind].color : null;

    useEffect(() => applyAccent(color), [color]);
}

/** Escape and the arrow keys. */
export function useAppKeyboard(): void {
    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            const inSearch = target.matches("[data-search]");
            const inField = Boolean(target.closest("input, select, textarea")) && !inSearch;

            if (event.key === "Escape") {
                if (isContextMenuOpen()) return; // the menu closes itself
                if (isSettingsOpen()) return closeSettings();
                if (inSearch && projectStore.get().query) return setQuery(""); // the first Escape clears the search
                if (inField) return;
                return hidePanel();
            }

            // The search box has no use for Up and Down, so they keep moving through the list while typing.
            if ((event.key === "ArrowDown" || event.key === "ArrowUp") && !inField && !isSettingsOpen() && !isContextMenuOpen()) {
                event.preventDefault();
                moveSelection(event.key === "ArrowDown" ? 1 : -1);
            }
        };

        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, []);
}
