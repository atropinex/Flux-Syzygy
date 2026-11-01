import type {LanguageShare} from "../../../../common/CommonInterface";
import {languageStyle} from "../../../../common/projects/SyzygyBadgeStyle";
import SyzygyBadge from "../../shared/SyzygyBadge";
import controls from "../../shared/SyzygyControls.module.css";
import {cssVars} from "../../shared/SyzygyStyleHelper";
import styles from "./SyzygyProjectCard.module.css";

/** The most used languages as a coloured bar and a legend. */
export default function SyzygyLanguageStats({languages}: { languages: LanguageShare[] }) {
    return (
        <section>
            <h3 className={styles.sectionTitle}>Most used languages</h3>

            {languages.length === 0 ? (
                <p className={controls.muted}>No source files found yet.</p>
            ) : (
                <>
                    <div className={styles.langBar}>
                        {languages.map(({name, percent}, index) => (
                            <span key={name} title={name}
                                  style={cssVars({
                                      "--icon": languageStyle(name).color,
                                      "--w": `${percent}%`,
                                      "--i": index
                                  })}/>
                        ))}
                    </div>
                    <ul className={styles.langLegend}>
                        {languages.map(({name, percent}) => {
                            const style = languageStyle(name);
                            return (
                                <li key={name}>
                                    <SyzygyBadge symbol={style.symbol} color={style.color}/>
                                    {name}
                                    <span className={styles.pct}>{percent}%</span>
                                </li>
                            );
                        })}
                    </ul>
                </>
            )}
        </section>
    );
}
