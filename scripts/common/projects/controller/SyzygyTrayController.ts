import {Menu, nativeImage, Tray} from "electron";
import {TRAY_ICON} from "../../icons/TrayIcon";
import {SyzygyPanelController} from "./SyzygyPanelController";

/** The tray icon: the way to find and quit the app, since the panel has no taskbar entry. */
export class SyzygyTrayController {
    private tray: Tray | null = null; // kept so it is not garbage collected

    constructor(private readonly panel: SyzygyPanelController) {
    }

    start(): void {
        this.tray = new Tray(nativeImage.createFromDataURL(TRAY_ICON).resize({width: 16, height: 16}));
        this.tray.setToolTip("Flux Syzygy");
        this.tray.setContextMenu(
            Menu.buildFromTemplate([
                {label: "Show or hide", click: () => this.panel.toggle()},
                {type: "separator"},
                {label: "Quit Flux Syzygy", click: () => this.panel.quit()}
            ])
        );
        this.tray.on("click", () => this.panel.toggle());
    }
}
