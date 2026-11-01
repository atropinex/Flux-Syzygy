import type { ReactNode } from "react";
import type { PanelOption, PanelSide, WindowStyle } from "../../../common/projects/SyzygyContract";
import { cx } from "../../../common/utils/ClassHelper";
import { changePanelSide } from "../../controller/panel/SyzygyPanel.Controller";
import {
    changePanelOption, changeWindowStyle, quitApp, useSettings
} from "../../controller/settings/SyzygySettings.Controller";
import controls from "../shared/SyzygyControls.module.css";
import SyzygyShortcutButton from "./SyzygyShortcutButton";
import SyzygySwitch from "./SyzygySwitch";
import styles from "./SyzygySettingsPage.module.css";

/** Window style, which edge the panel docks to, the shortcut, and quitting. */
export default function SyzygyWindowSection() {
    const settings = useSettings();
    const isPanel = settings.windowStyle === "panel";

    return (
        <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Window</h3>
            <p className={controls.muted}>
                {isPanel
                    ? "The shortcut slides this panel in from the edge of your screen, and slides it away again."
                    : "The shortcut shows and hides the window. Closing the window keeps the app running in the tray."}
            </p>

            <div className={styles.segmented}>
                <Segment<WindowStyle> value="panel" current={settings.windowStyle} onPick={(style) => void changeWindowStyle(style)}>Slide-in panel</Segment>
                <Segment<WindowStyle> value="window" current={settings.windowStyle} onPick={(style) => void changeWindowStyle(style)}>Regular window</Segment>
            </div>

            {isPanel && (
                <Row title="Dock to" hint="The screen edge the panel slides from">
                    <div className={cx(styles.segmented, styles.compact)}>
                        <Segment<PanelSide> value="left" current={settings.panelSide} onPick={(side) => void changePanelSide(side)}>Left</Segment>
                        <Segment<PanelSide> value="right" current={settings.panelSide} onPick={(side) => void changePanelSide(side)}>Right</Segment>
                    </div>
                </Row>
            )}

            <Row title="Toggle shortcut" hint="Works from any app"><SyzygyShortcutButton /></Row>

            {isPanel && (
                <>
                    <OptionRow option="hideOnBlur" title="Hide when I click away" hint="Closes the panel when another window takes focus" />
                    <OptionRow option="hideAfterOpen" title="Hide after opening a project" hint="Slides away once the editor has started" />
                </>
            )}

            <div className={styles.row}>
                <button className={cx(controls.btn, controls.btnQuiet, controls.btnDanger)} onClick={quitApp}>Quit Flux Syzygy</button>
            </div>
        </section>
    );
}

function Row({ title, hint, children }: { title: string; hint: string; children: ReactNode }) {
    return (
        <div className={styles.switchRow}>
            <span className={styles.switchText}>
                <span className={styles.ideName}>{title}</span>
                <span className={cx(controls.muted, controls.small)}>{hint}</span>
            </span>
            {children}
        </div>
    );
}

function OptionRow({ option, title, hint }: { option: PanelOption; title: string; hint: string }) {
    const settings = useSettings();

    return (
        <Row title={title} hint={hint}>
            <SyzygySwitch label={title} checked={settings[option]} onChange={(value) => void changePanelOption(option, value)} />
        </Row>
    );
}

interface SegmentProps<T extends string> {
    value: T;
    current: T;
    onPick: (value: T) => void;
    children: ReactNode;
}

/** One button of a segmented control. */
function Segment<T extends string>({ value, current, onPick, children }: SegmentProps<T>) {
    return (
        <button className={cx(styles.seg, value === current && styles.segActive)} aria-pressed={value === current} onClick={() => onPick(value)}>
            {children}
        </button>
    );
}
