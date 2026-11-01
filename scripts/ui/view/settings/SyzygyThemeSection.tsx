import type {Theme} from "../../../common/CommonInterface";
import {cx} from "../../../common/utils/ClassHelper";
import {chooseTheme, openThemesFolder, reloadThemes, useThemes} from "../../controller/theme/SyzygyTheme.Controller";
import controls from "../shared/SyzygyControls.module.css";
import styles from "./SyzygySettingsPage.module.css";

/** Pick a theme. Themes are YAML files in a folder, so they can be edited and added. */
export default function SyzygyThemeSection() {
    const {list, themeId} = useThemes();

    return (
        <section className={styles.section}>
            <h3 className={styles.sectionTitle}>Theme</h3>
            <p className={controls.muted}>Themes are YAML files. Edit one or add your own in the themes folder, then
                reload.</p>

            <div className={styles.themeGrid}>
                {list.themes.map((theme) => (
                    <ThemeTile key={theme.id} theme={theme} active={theme.id === themeId}/>
                ))}
            </div>

            <div className={styles.row}>
                <button className={controls.btn} onClick={() => void openThemesFolder()}>Open themes folder</button>
                <button className={controls.btn} onClick={() => void reloadThemes()}>Reload themes</button>
            </div>

            {list.problems.length > 0 && (
                <ul className={styles.problems}>
                    {list.problems.map((problem) => <li key={problem}>{problem}</li>)}
                </ul>
            )}
        </section>
    );
}

/** A small preview of a theme's colours. */
function ThemeTile({theme, active}: { theme: Theme; active: boolean }) {
    const {colors} = theme;

    return (
        <button className={cx(styles.themeTile, active && styles.themeActive)}
                onClick={() => void chooseTheme(theme.id)}>
            <span className={styles.themePreview} style={{background: colors.background}}>
                <span className={styles.swatch} style={{background: colors.panelRaised}}/>
                <span className={styles.swatchAccent} style={{background: colors.accent}}/>
                <span className={styles.swatchText} style={{background: colors.text}}/>
            </span>
            <span className={styles.themeName}>{theme.name}</span>
            <span className={cx(controls.muted, controls.small, styles.themeAuthor)}>{theme.author}</span>
        </button>
    );
}
