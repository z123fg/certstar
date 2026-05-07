import styles from "./LoaderBackdrop.module.css";

export default function LoaderBackdrop() {
    return (
        <div className={styles.backdrop}>
            <div className={styles.spinner} />
        </div>
    );
}
