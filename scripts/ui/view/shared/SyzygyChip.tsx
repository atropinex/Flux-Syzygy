import SyzygyBadge from "./SyzygyBadge";
import controls from "./SyzygyControls.module.css";

interface Props {
    symbol: string;
    color: string;
    label: string;
}

export default function SyzygyChip({symbol, color, label}: Props) {
    return (
        <span className={controls.chip}>
            <SyzygyBadge symbol={symbol} color={color}/>
            {label}
        </span>
    );
}
