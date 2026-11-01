import { useToast } from "../../controller/toast/SyzygyToast.Controller";
import { cx } from "../../../common/utils/ClassHelper";
import styles from "./SyzygyToast.module.css";

export default function SyzygyToast() {
    const toast = useToast();

    return (
        <div className={cx(styles.toast, toast.visible && styles.show, toast.isError && styles.error)} role="status" aria-live="polite">
            {toast.message}
        </div>
    );
}
