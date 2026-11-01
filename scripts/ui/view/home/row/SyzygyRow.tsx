import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { animateRemoval, setShown } from "../../../controller/animation/SyzygyAnimation.Controller";
import { isEntranceEnabled } from "../../../controller/list/SyzygyList.Controller";
import { cx } from "../../../../common/utils/ClassHelper";
import styles from "./SyzygyRow.module.css";

interface Props {
    rowType: "project" | "group" | "ungrouped";
    rowId: string;
    rowKey: string;
    order: number;        // the row's place in the list, used to stagger the entrance
    visible: boolean;     // false while hidden by a search or a minimized group
    leaving?: boolean;    // true while the row slides out before it is removed
    isGroup?: boolean;    // group headers sit a little apart
    onLeft?: () => void;  // called once the row has slid out
    children: ReactNode;
}

/**
 * One row of the list. It owns the animations that need the real element: growing and shrinking when
 * shown or hidden, the entrance, and sliding out. The `hidden` attribute is set by hand, never by
 * React, so React can't undo it mid-animation.
 */
export default function SyzygyRow({ rowType, rowId, rowKey, order, visible, leaving = false, isGroup = false, onLeft, children }: Props) {
    const ref = useRef<HTMLDivElement>(null);
    const mounted = useRef(false);
    const [entering, setEntering] = useState(isEntranceEnabled);

    useLayoutEffect(() => {
        ref.current!.style.setProperty("--i", String(Math.min(order, 10)));
    }, [order]);

    useLayoutEffect(() => {
        // The first time there is nothing to animate: the row just starts out shown or hidden.
        void setShown(ref.current!, visible, mounted.current);
        mounted.current = true;
    }, [visible]);

    useEffect(() => {
        if (!leaving) return;
        void animateRemoval(ref.current!).then(() => onLeft?.());
    }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div
            ref={ref}
            className={cx(styles.row, isGroup && styles.group, entering && styles.enter)}
            data-row
            data-row-type={rowType}
            data-row-id={rowId}
            data-row-key={rowKey}
            onAnimationEnd={(event) => event.target === event.currentTarget && setEntering(false)}
        >
            {children}
        </div>
    );
}
