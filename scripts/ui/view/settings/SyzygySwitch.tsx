import styles from "./SyzygySettingsPage.module.css";

interface Props {
    label: string;
    checked: boolean;
    onChange: (value: boolean) => void;
}

/** An on/off switch. */
export default function SyzygySwitch({ label, checked, onChange }: Props) {
    return (
        <label className={styles.switch}>
            <input type="checkbox" aria-label={label} checked={checked} onChange={(event) => onChange(event.target.checked)} />
            <span className={styles.track} />
        </label>
    );
}
