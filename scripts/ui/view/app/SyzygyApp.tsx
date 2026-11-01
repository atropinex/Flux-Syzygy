import {useEffect} from "react";
import {announceReady, useAccent, useAppKeyboard} from "../../controller/app/SyzygyApp.Controller";
import {handleStagePointerDown} from "../../controller/panel/SyzygyPanel.Controller";
import SyzygyContextMenu from "../contextmenu/SyzygyContextMenu";
import SyzygyHomePage from "../home/SyzygyHomePage";
import SyzygyNavbar from "../navbar/SyzygyNavbar";
import SyzygySettingsPage from "../settings/SyzygySettingsPage";
import SyzygyToast from "../toast/SyzygyToast";
import styles from "./SyzygyApp.module.css";

export default function SyzygyApp() {
    useAccent();
    useAppKeyboard();
    useEffect(() => announceReady(), []);

    return (
        <div className={styles.stage} onPointerDown={handleStagePointerDown}>
            <div className={styles.panel} data-panel>
                <div className={styles.backdrop}/>
                <SyzygyNavbar/>
                <SyzygyHomePage/>
                <SyzygyToast/>
                <SyzygySettingsPage/>
            </div>
            <SyzygyContextMenu/>
        </div>
    );
}
