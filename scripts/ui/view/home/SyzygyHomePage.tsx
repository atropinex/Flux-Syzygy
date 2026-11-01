import { useRef } from "react";
import { handleListContextMenu } from "../../controller/contextmenu/SyzygyContextMenu.Controller";
import { useListBehavior, useListRows, useSummary } from "../../controller/list/SyzygyList.Controller";
import SyzygyListRow from "./SyzygyListRow";
import styles from "./SyzygyHomePage.module.css";

export default function SyzygyHomePage() {
    const rows = useListRows();
    const summary = useSummary();
    const listRef = useRef<HTMLElement>(null);
    useListBehavior(listRef, rows);

    const [title, body] = summary.projects === 0
        ? ["No projects yet", "Add a Unity, Unreal, Cocos, Node or any other project folder to get started."]
        : ["No matches", "Try a different name or path."];

    return (
        <main ref={listRef} className={styles.homeList} aria-label="Projects" onContextMenu={handleListContextMenu}>
            {rows.map((row, index) => (
                <SyzygyListRow key={row.key} row={row} order={index} />
            ))}

            {summary.matched === 0 && (
                <div className={styles.homeEmpty}>
                    <strong>{title}</strong>
                    {body}
                </div>
            )}
        </main>
    );
}
