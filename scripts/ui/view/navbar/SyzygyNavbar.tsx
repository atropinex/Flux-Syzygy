import {createGroup} from "../../controller/group/SyzygyGroup.Controller";
import {useSummary} from "../../controller/list/SyzygyList.Controller";
import {addProject, setQuery, useProjectState} from "../../controller/project/SyzygyProject.Controller";
import {openSettings} from "../../controller/settings/SyzygySettings.Controller";
import {cx} from "../../../common/utils/ClassHelper";
import controls from "../shared/SyzygyControls.module.css";
import styles from "./SyzygyNavbar.module.css";

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export default function SyzygyNavbar() {
    const {query} = useProjectState();
    const summary = useSummary();
    const count = plural(summary.projects, "project") + (summary.groups ? `, ${plural(summary.groups, "group")}` : "");

    return (
        <header className={styles.navbar}>
            <div className={styles.brand}>
                <span className={styles.brandMark} aria-hidden="true"/>
                <div>
                    <h1 className={styles.brandName}>Flux Syzygy</h1>
                    <p className={styles.brandCount}>{count}</p>
                </div>
            </div>

            <label className={styles.search}>
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                    <circle cx="8.5" cy="8.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.8"/>
                    <path d="M13 13l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                </svg>
                <input
                    className={styles.searchInput}
                    data-search
                    type="search"
                    value={query}
                    placeholder="Search projects"
                    autoComplete="off"
                    aria-label="Search projects"
                    onChange={(event) => setQuery(event.target.value)}
                />
            </label>

            <button className={controls.btn} onClick={() => void createGroup()}>New group</button>
            <button className={cx(controls.btn, controls.btnPrimary)} onClick={() => void addProject()}>Add project
            </button>
            <button className={controls.iconBtn} data-settings-button aria-label="Open settings" onClick={openSettings}>
                <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor"
                     strokeWidth="1.8" strokeLinecap="round">
                    <path d="M3 5h8M15 5h2M3 10h2M9 10h8M3 15h10M17 15h0"/>
                    <circle cx="13" cy="5" r="2"/>
                    <circle cx="7" cy="10" r="2"/>
                    <circle cx="15" cy="15" r="2"/>
                </svg>
            </button>
        </header>
    );
}
