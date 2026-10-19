"use client";

import { useLayoutEffect, useRef } from "react";
import { useLead } from "./LeadContext";
import styles from "./WeekPicker.module.css";

/**
 * «Неделя старта» (274:309 / 282:873): the nearest open week is preselected; the dark plate glides
 * between chips on change (FLIP, 300 ms). Arrow keys move the choice (radio group).
 */
export function WeekPicker({ name = "week" }: { name?: string }) {
  const { pickable, selected, select } = useLead();
  const wrap = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLSpanElement>(null);
  const placed = useRef(false);

  // the plate follows the selected chip (also on resize: chips reflow 4 → 2×2 on mobile)
  useLayoutEffect(() => {
    const w = wrap.current;
    const p = plate.current;
    if (!w || !p) return;
    const place = () => {
      const chip = w.querySelector<HTMLElement>("[aria-checked='true']");
      if (!chip) return;
      p.style.transform = `translate(${chip.offsetLeft}px, ${chip.offsetTop}px)`;
      p.style.width = `${chip.offsetWidth}px`;
      p.style.height = `${chip.offsetHeight}px`;
      if (!placed.current) {
        placed.current = true;
        requestAnimationFrame(() => p.setAttribute("data-ready", ""));
      }
    };
    place();
    const ro = new ResizeObserver(place);
    ro.observe(w);
    return () => ro.disconnect();
  }, [selected, pickable]);

  const onKey = (e: React.KeyboardEvent) => {
    const i = pickable.findIndex((w) => w.key === selected);
    const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!dir || i < 0) return;
    e.preventDefault();
    const next = pickable[(i + dir + pickable.length) % pickable.length];
    select(next.key);
    wrap.current?.querySelector<HTMLElement>(`[data-key="${next.key}"]`)?.focus();
  };

  if (!pickable.length) return null;
  return (
    <div className={styles.picker}>
      <p className={styles.label} id={`${name}-label`}>
        Неделя старта
      </p>
      <div ref={wrap} className={styles.chips} role="radiogroup" aria-labelledby={`${name}-label`} onKeyDown={onKey}>
        <span ref={plate} className={styles.plate} aria-hidden="true" />
        {pickable.map((w) => {
          const on = w.key === selected;
          return (
            <button
              key={w.key}
              type="button"
              role="radio"
              aria-checked={on}
              tabIndex={on ? 0 : -1}
              data-key={w.key}
              className={styles.chip}
              data-status={w.status}
              onClick={() => select(w.key)}
            >
              <span className={styles.date}>{w.short}</span>
              <span className={styles.seats}>{w.label}</span>
            </button>
          );
        })}
      </div>
      <input type="hidden" name={name} value={selected ?? ""} />
    </div>
  );
}
