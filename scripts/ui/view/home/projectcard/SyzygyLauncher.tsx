import type {IdeOption} from "../../../../common/CommonInterface";
import {cx} from "../../../../common/utils/ClassHelper";
import controls from "../../shared/SyzygyControls.module.css";
import styles from "./SyzygyProjectCard.module.css";

interface Props {
    title: string;            // above the dropdown, e.g. "Unity editor" or "IDE"
    firstOption: string;      // the choice for "nothing picked", e.g. "Automatic" or "None chosen"
    options: IdeOption[];
    value: string;            // the picked option's id, or "" for the first option
    onChange: (value: string | null) => void;
    buttonLabel: string;
    buttonDisabled: boolean;
    outline?: boolean;        // the secondary look
    hint: string;             // shown under the button; empty = nothing
    hintIsWarning?: boolean;
    onOpen: () => void;
}

/** A dropdown with a button under it: the shared look of the engine and IDE launchers. */
export default function SyzygyLauncher(props: Props) {
    return (
        <div className={styles.launcher}>
            <label className={controls.field}>
                {props.title}
                <select className={controls.select} value={props.value}
                        onChange={(event) => props.onChange(event.target.value || null)}>
                    <option value="">{props.firstOption}</option>
                    {props.options.map((option) => (
                        <option key={option.id} value={option.id}>{option.label}</option>
                    ))}
                </select>
            </label>

            <button
                className={cx(controls.btn, controls.wide, props.outline ? controls.btnOutline : controls.btnPrimary)}
                disabled={props.buttonDisabled}
                onClick={props.onOpen}
            >
                {props.buttonLabel}
            </button>

            {props.hint && <p className={cx(controls.hint, props.hintIsWarning && controls.hintWarn)}>{props.hint}</p>}
        </div>
    );
}
