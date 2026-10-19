"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";
import { useLenis } from "@/components/motion/SmoothScroll";
import { MiniForm } from "@/components/sections/Contact";
import { Icon } from "@/components/ui/Icon";
import { useLead } from "./LeadContext";
import styles from "./LeadModal.module.css";

/**
 * Every CTA of a service page opens the contact form here, with the start week already chosen (274:309).
 * Esc / × / backdrop close it; focus is trapped inside and returns to the button that opened it.
 */
export function LeadModal() {
  const { modal, closeLead } = useLead();
  if (!modal.open) return null;
  return <Dialog demo={modal.demo} topic={modal.topic} onClose={closeLead} />;
}

function Dialog({ demo, topic, onClose }: { demo: boolean; topic?: string; onClose: () => void }) {
  const shell = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const closing = useRef(false);

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (prefersReducedMotion()) return onClose();
    gsap.to(shell.current, { opacity: 0, duration: 0.2, onComplete: onClose });
    gsap.to(card.current, { y: 12, duration: 0.2 });
  };

  useEffect(() => {
    lenis?.stop();
    const html = document.documentElement;
    html.style.overflow = "hidden";
    const prev = document.activeElement as HTMLElement | null;
    if (!prefersReducedMotion()) {
      gsap.fromTo(shell.current, { opacity: 0 }, { opacity: 1, duration: 0.25 });
      gsap.fromTo(card.current, { y: 16, scale: 0.98 }, { y: 0, scale: 1, duration: 0.45, ease: "expo.out" });
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key !== "Tab") return;
      const f = shell.current?.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled]), a[href], [tabindex='0']");
      if (!f?.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      lenis?.start();
      html.style.overflow = "";
      prev?.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return createPortal(
    <div ref={shell} className={styles.shell} role="dialog" aria-modal="true" aria-label="Обсудить задачу">
      <div className={styles.backdrop} onClick={close} />
      <div ref={card} className={styles.card}>
        <button type="button" className={styles.close} onClick={close} aria-label="Закрыть">
          <Icon name="close" size={18} stroke={1.6} />
        </button>
        <MiniForm weekPicker demo={demo} topic={topic} autoFocus />
      </div>
    </div>,
    document.body,
  );
}
