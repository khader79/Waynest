import { useEffect, useRef, useState } from "react";
import styles from "./LoadingOverlay.module.css";

const SHOW_AFTER_MS = 120; // delay to avoid flashing for very fast requests

export default function LoadingOverlay() {
  const [visible, setVisible] = useState(false);
  const pending = useRef(0);
  const showTimer = useRef(null);

  useEffect(() => {
    const onStart = () => {
      pending.current += 1;
      if (showTimer.current == null) {
        showTimer.current = setTimeout(() => {
          if (pending.current > 0) setVisible(true);
          showTimer.current = null;
        }, SHOW_AFTER_MS);
      }
    };

    const onEnd = () => {
      pending.current = Math.max(0, pending.current - 1);
      if (pending.current === 0) {
        if (showTimer.current) {
          clearTimeout(showTimer.current);
          showTimer.current = null;
        }
        setVisible(false);
      }
    };

    window.addEventListener("global:request:start", onStart);
    window.addEventListener("global:request:end", onEnd);

    return () => {
      window.removeEventListener("global:request:start", onStart);
      window.removeEventListener("global:request:end", onEnd);
      if (showTimer.current) clearTimeout(showTimer.current);
    };
  }, []);

  if (!visible) return null;

  return (
    <div className={styles.overlay} aria-hidden>
      <div className={styles.spinner} />
      <div className={styles.label}>Loading…</div>
    </div>
  );
}
