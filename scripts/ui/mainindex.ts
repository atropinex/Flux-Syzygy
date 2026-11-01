import {app} from "electron";
import {SyzygyEditorController} from "../common/projects/controller/SyzygyEditorController";
import {SyzygyGroupController} from "../common/projects/controller/SyzygyGroupController";
import {SyzygyPanelController} from "../common/projects/controller/SyzygyPanelController";
import {SyzygyProjectController} from "../common/projects/controller/SyzygyProjectController";
import {SyzygySettingsController} from "../common/projects/controller/SyzygySettingsController";
import {SyzygyTrayController} from "../common/projects/controller/SyzygyTrayController";
import {EngineModel} from "../common/models/EngineModel";
import {GroupModel} from "../common/models/GroupModel";
import {IdeModel} from "../common/models/IdeModel";
import {LaunchModel} from "../common/models/LaunchModel";
import {ProjectModel} from "../common/models/ProjectModel";
import {ScannerModel} from "../common/models/ScannerModel";
import {SettingsModel} from "../common/models/SettingsModel";
import {ThemeModel} from "../common/models/ThemeModel";

// Only one copy may run, otherwise two panels would fight over the keybind.
if (!app.requestSingleInstanceLock()) {
    app.quit();
} else {
    void app.whenReady().then(async () => {
        app.dock?.hide();

        // Models: the data and the work on it.
        const settings = new SettingsModel();
        const projects = new ProjectModel();
        const groups = new GroupModel(settings);
        const ides = new IdeModel(settings);
        const engines = new EngineModel();
        const scanner = new ScannerModel();
        const themes = new ThemeModel();
        const launcher = new LaunchModel(ides, engines, scanner);

        // Controllers: the window, and the answers to the page's requests.
        const {windowStyle, panelSide, hideOnBlur, shortcut} = await settings.read();
        const panel = new SyzygyPanelController({style: windowStyle, side: panelSide, hideOnBlur});

        new SyzygyProjectController(panel, projects, scanner, engines, launcher).register();
        new SyzygyGroupController(groups, projects).register();
        new SyzygyEditorController(panel, ides, projects, engines, scanner).register();
        new SyzygySettingsController(panel, settings, themes).register();

        new SyzygyTrayController(panel).start();
        if (!panel.registerShortcut(shortcut)) {
            console.warn(`Could not register ${shortcut}. Another app may be using it. Change it in the settings.`);
        }

        app.on("second-instance", () => panel.show());
        // Windows are only hidden, never closed, so the app keeps running for its keybind.
        app.on("window-all-closed", () => undefined);
        app.on("before-quit", () => panel.markQuitting());
        app.on("will-quit", () => panel.unregisterShortcuts());

        panel.createWindow();
    });
}
