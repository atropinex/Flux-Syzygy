import controls from "./SyzygyControls.module.css";
import {cssVars} from "./SyzygyStyleHelper";

interface Props {
    symbol: string;
    color: string;
    title?: string;
}

/** A round coloured badge with a short symbol, e.g. (TS) for TypeScript. */
export default function SyzygyBadge({symbol, color, title}: Props) {
    return (
        <span className={controls.badge} style={cssVars({"--icon": color})} title={title}>
            {symbol}
        </span>
    );
}
