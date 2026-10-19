"use client";

import { useEffect, useState } from "react";
import { Icon } from "./Icon";
import styles from "./Toast.module.css";

/** «Скопировано ✓» toast, 1.5s. Triggered with `toast()` from lib/env. */
export function Toaster() {
  const [msg, setMsg] = useState<{ text: string; id: number } | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const on = (e: Event) => {
      clearTimeout(timer);
      setMsg({ text: (e as CustomEvent<string>).detail, id: Date.now() });
      timer = setTimeout(() => setMsg(null), 1500);
    };
    window.addEventListener("kewate:toast", on);
    return () => {
      window.removeEventListener("kewate:toast", on);
      clearTimeout(timer);
    };
  }, []);
  return (
    <div className={styles.region} role="status" aria-live="polite">
      {msg && (
        <div key={msg.id} className={styles.toast}>
          {msg.text}
          <Icon name="check" size={12} stroke={1.25} />
        </div>
      )}
    </div>
  );
}
