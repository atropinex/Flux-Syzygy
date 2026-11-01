import { useEffect, useRef } from "react";
import type { Project } from "../../../../common/CommonInterface";
import { GIT_STYLES, KIND_STYLES, languageStyle } from "../../../../common/projects/SyzygyBadgeStyle";
import { cx } from "../../../../common/utils/ClassHelper";
import { isMotionEnabled } from "../../../controller/theme/SyzygyTheme.Controller";
import { useContextMenu } from "../../../controller/contextmenu/SyzygyContextMenu.Controller";
import { selectProject, useProjectState } from "../../../controller/project/SyzygyProject.Controller";
import SyzygyBadge from "../../shared/SyzygyBadge";
import { cssVars } from "../../shared/SyzygyStyleHelper";
import SyzygyProjectDetails from "./SyzygyProjectDetails";
import styles from "./SyzygyProjectCard.module.css";

/** A project: a head that is always visible, and details that open when the card is selected. */
export default function SyzygyProjectCard({ project }: { project: Project }) {
    const { selectedId } = useProjectState();
    const menu = useContextMenu();
    const cardRef = useRef<HTMLDivElement>(null);
    const detailsRef = useRef<HTMLDivElement>(null);

    const selected = selectedId === project.id;
    const isTarget = menu.target?.type === "project" && menu.target.id === project.id;
    const kind = KIND_STYLES[project.kind];
    const kindLabel = project.requiredVersion ? `${kind.label} ${project.requiredVersion}` : kind.label;

    /** Clicking a closed card opens it; clicking the open one closes it again. */
    const toggle = () => selectProject(selected ? null : project.id);

    // Hidden controls must not be reachable with the Tab key.
    useEffect(() => {
        if (detailsRef.current) detailsRef.current.inert = !selected;
    }, [selected]);

    // With animation off no transition ends, so scroll straight away.
    useEffect(() => {
        if (selected && !isMotionEnabled()) cardRef.current?.scrollIntoView({ block: "nearest" });
    }, [selected]);

    return (
        <div
            ref={cardRef}
            className={cx(styles.card, selected && styles.selected, isTarget && styles.context, !project.exists && styles.missing)}
            style={cssVars({ "--kind": kind.color })}
        >
            <div
                className={styles.cardHead}
                role="button"
                tabIndex={0}
                aria-expanded={selected}
                onClick={toggle}
                onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggle();
                    }
                }}
            >
                <div className={styles.headText}>
                    <div className={styles.title}>{project.name}</div>
                    <div className={styles.sub}>
                        <span className={styles.kind}>{kindLabel}</span>
                        <span className={styles.path}>{project.path}</span>
                    </div>
                </div>
                <ProjectBadges project={project} />
            </div>

            <div
                ref={detailsRef}
                className={styles.detailsWrap}
                onTransitionEnd={(event) => {
                    // Once the card has finished opening, scroll it fully into view.
                    if (selected && event.target === event.currentTarget && event.propertyName === "grid-template-rows") {
                        cardRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
                    }
                }}
            >
                <div className={styles.detailsClip}>
                    <SyzygyProjectDetails project={project} />
                </div>
            </div>
        </div>
    );
}

/** Overlapping round icons on the right: the git host first, then the top languages. */
function ProjectBadges({ project }: { project: Project }) {
    if (!project.exists) return <div className={styles.badges}><span className={styles.warn}>Folder not found</span></div>;

    const git = project.git ? GIT_STYLES[project.git.provider] : null;
    return (
        <div className={styles.badges}>
            {git && <SyzygyBadge symbol={git.symbol} color={git.color} title={git.label} />}
            {project.languages.slice(0, 3).map(({ name }) => {
                const style = languageStyle(name);
                return <SyzygyBadge key={name} symbol={style.symbol} color={style.color} title={name} />;
            })}
        </div>
    );
}
