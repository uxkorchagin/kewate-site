"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useLead } from "./LeadContext";
import styles from "./StickySlotBar.module.css";

const CLOSED = "kw-bar-closed";
const RETURNED = "kw-bar-returned";
const ss = {
  get: (k: string) => {
    try {
      return sessionStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string) => {
    try {
      sessionStorage.setItem(k, "1");
    } catch {}
  },
};

/**
 * Sticky slot bar (274:324 / 282:888): fixed at the bottom once the hero is out of view, hidden while the
 * slot calendar, the contact form or the footer is on screen. Same data as the calendar, no countdown
 * (one timer on screen is enough). × (mobile: swipe down) closes it; it comes back once per session on
 * exit intent — the pointer leaving towards the tabs, or the visitor returning to the tab on touch screens.
 */
export function StickySlotBar() {
  const { nearest, openLead } = useLead();
  const [heroOut, setHeroOut] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [closed, setClosed] = useState(true); // false after mount unless closed earlier this session
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setClosed(!!ss.get(CLOSED) && !ss.get(RETURNED));
    const hero = document.getElementById("top");
    const blockers = [document.querySelector("[data-slots]"), document.getElementById("contacts")].filter(Boolean) as Element[];
    const seen = new Set<Element>();
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) seen.add(e.target);
        else seen.delete(e.target);
      }
      setBlocked(seen.size > 0);
    });
    blockers.forEach((b) => io.observe(b));
    // the hero is pinned while «О студии» slides over it, so an observer would still see it:
    // it counts as gone once its own place in the document has been scrolled past
    let raf = 0;
    const check = () => {
      raf = 0;
      if (hero) setHeroOut(window.scrollY >= hero.offsetTop + hero.offsetHeight - 1);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // exit intent brings a closed bar back once per session
  useEffect(() => {
    if (!closed || ss.get(RETURNED)) return;
    const back = () => {
      if (ss.get(RETURNED)) return;
      ss.set(RETURNED);
      setClosed(false);
    };
    const onOut = (e: MouseEvent) => {
      if (!e.relatedTarget && e.clientY <= 0) back();
    };
    const onVis = () => document.visibilityState === "visible" && back();
    document.addEventListener("mouseout", onOut);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("mouseout", onOut);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [closed]);

  const close = () => {
    ss.set(CLOSED);
    setClosed(true);
  };

  // mobile: swipe down to close
  useEffect(() => {
    const el = bar.current;
    if (!el) return;
    let y0 = 0;
    let dy = 0;
    const down = (e: TouchEvent) => {
      y0 = e.touches[0].clientY;
      dy = 0;
    };
    const move = (e: TouchEvent) => {
      dy = Math.max(0, e.touches[0].clientY - y0);
      el.style.transform = `translateY(${dy}px)`;
    };
    const up = () => {
      el.style.transform = "";
      if (dy > 40) close();
    };
    el.addEventListener("touchstart", down, { passive: true });
    el.addEventListener("touchmove", move, { passive: true });
    el.addEventListener("touchend", up);
    return () => {
      el.removeEventListener("touchstart", down);
      el.removeEventListener("touchmove", move);
      el.removeEventListener("touchend", up);
    };
  }, []);

  if (!nearest) return null;
  const show = heroOut && !blocked && !closed;
  return (
    <div className={styles.wrap} data-show={show ? "" : undefined} aria-hidden={!show} inert={!show}>
      <div ref={bar} className={styles.bar} role="region" aria-label="Ближайшая свободная неделя">
        <button type="button" className={styles.close} onClick={close} aria-label="Скрыть">
          <Icon name="close" size={14} stroke={1.6} />
        </button>
        <p className={styles.info}>
          <span className={styles.week}>Неделя {nearest.short}</span>
          <span className={styles.dot} aria-hidden="true">
            ·
          </span>
          <span className={styles.left}>осталось {nearest.label}</span>
        </p>
        <Button variant="mint" size="sm" arrow={14} arrowStroke={1.4} className={styles.btn} onClick={() => openLead({ week: nearest.key })}>
          Забронировать
        </Button>
      </div>
    </div>
  );
}
