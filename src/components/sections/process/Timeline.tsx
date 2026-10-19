"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { clamp, prefersReducedMotion } from "@/lib/env";
import styles from "./Timeline.module.css";

export type PlanStage = { label: string; from: number; to: number; final?: boolean };

type Props = {
  /** «Д» — days, «Н» — weeks */
  unit: "Д" | "Н";
  count: number;
  /** unit the «today» playhead parks on (1-based) */
  today: number;
  stages: PlanStage[];
  /**
   * false (main page): bars draw in once when the plan scrolls into view.
   * true (service pages, 252:315): bars grow with the scroll and the playhead rides from the first
   * unit to «today» — both written straight to the DOM, no React render per frame.
   */
  scrub?: boolean;
};

/** «Д2–6», «Н1–3», «Д14» */
export const spanLabel = (unit: string, from: number, to: number) => {
  const a = Math.floor(from);
  const b = Math.ceil(to);
  return a >= b ? `${unit}${b}` : `${unit}${a}–${b}`;
};

/**
 * Plan by days / weeks (181:1338, 252:315): hover a bar — the others dim to 40% and the header lights
 * the units it spans; hover a column — vertical highlight; drag the playhead or use ←/→ — bars left of
 * it count as passed (white), the rest are muted.
 */
export function Timeline({ unit, count, today, stages, scrub = false }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const playhead = useRef<HTMLDivElement>(null);
  const ride = useRef<gsap.core.Tween | null>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [unitHover, setUnitHover] = useState<number | null>(null);
  const [head, setHead] = useState<number>(today - 1); // unit index the playhead sits on (0-based, fractional)
  const [scrubbed, setScrubbed] = useState(false);
  const word = unit === "Д" ? "День" : "Неделя";

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const el = root.current!;
      const bars = gsap.utils.toArray<HTMLElement>("[data-bar], [data-mbar]", el);
      if (!scrub) {
        gsap.fromTo(
          bars,
          { scaleX: 0, transformOrigin: "0% 50%" },
          {
            scaleX: 1,
            duration: 0.6,
            ease: "power2.out",
            stagger: 0.08,
            clearProps: "transform",
            scrollTrigger: { trigger: el, start: "top 80%", once: true },
          },
        );
        return;
      }
      const mm = gsap.matchMedia();
      mm.add({ desktop: "(min-width: 768px)", mobile: "(max-width: 767px)" }, (ctx) => {
        const { desktop } = ctx.conditions as { desktop: boolean };
        const own = bars.filter((b) => (desktop ? b.hasAttribute("data-bar") : b.hasAttribute("data-mbar")));
        const finals = own.filter((b) => b.hasAttribute("data-final"));
        gsap.set(own, { scaleX: 0, transformOrigin: "0% 50%" });
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: desktop ? "top 75%" : "top 85%", end: desktop ? "bottom 45%" : "bottom 60%", scrub: 0.4 },
        });
        tl.to(own, { scaleX: 1, duration: 0.4, stagger: 0.12 }, 0);
        // the mint «hand-over» bar lands last with a short glow
        tl.fromTo(finals, { boxShadow: "0 0 0 rgba(106,238,199,0)" }, { boxShadow: "0 0 24px rgba(106,238,199,0.9)", duration: 0.12 }, ">-0.12").to(finals, {
          boxShadow: "0 0 0 rgba(106,238,199,0)",
          duration: 0.2,
        });
        if (desktop && playhead.current) {
          const ph = playhead.current;
          const state = { d: 0 };
          ride.current = gsap.to(state, {
            d: today - 1,
            duration: tl.duration() * 0.8,
            ease: "none",
            onUpdate: () => {
              ph.style.left = `${(state.d / count) * 100}%`;
            },
          });
          tl.add(ride.current, 0);
        }
        return () => {
          ride.current = null;
        };
      });
      return () => mm.revert();
    },
    { scope: root, dependencies: [scrub, count, today] },
  );

  // the parked playhead pulses softly (opacity 0.6 ↔ 1, 1.6 s) — a CSS animation, paused off screen
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const io = new IntersectionObserver(([e]) => el.toggleAttribute("data-live", e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const takeOver = () => {
    // the visitor moves the playhead now: the scroll stops driving it
    if (ride.current) {
      ride.current.kill();
      ride.current = null;
    }
    setScrubbed(true);
  };
  const startDrag = (e: React.PointerEvent) => {
    const g = grid.current;
    if (!g) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    takeOver();
    const move = (ev: PointerEvent) => {
      const r = g.getBoundingClientRect();
      setHead(clamp(((ev.clientX - r.left) / r.width) * count, 0, count));
    };
    move(e.nativeEvent);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    takeOver();
    setHead((h) => clamp(Math.round(h) + (e.key === "ArrowRight" ? 1 : -1), 0, count));
  };

  const hovered = hover != null ? stages[hover] : null;
  const inRange = (d: number) => hovered && d + 1 >= Math.floor(hovered.from) && d + 1 <= Math.ceil(hovered.to);
  const pos = (s: PlanStage) => ({ left: (s.from - 1) / count, width: (s.to - s.from + 1) / count });

  return (
    <div ref={root} className={styles.timelineWrap} style={{ ["--n" as string]: count }}>
      {/* desktop: table */}
      <div className={`${styles.table} only-desktop`} data-hover={hover != null ? "" : undefined} data-scrubbed={scrubbed ? "" : undefined}>
        <div className={styles.thead} aria-hidden="true">
          <div className={styles.stageCol}>Этап</div>
          <div className={styles.days}>
            {Array.from({ length: count }, (_, d) => (
              <div
                key={d}
                className={styles.day}
                data-today={d === today - 1 ? "" : undefined}
                data-hl={inRange(d) || unitHover === d ? "" : undefined}
                onPointerEnter={() => setUnitHover(d)}
                onPointerLeave={() => setUnitHover(null)}
              >
                {unit}
                {d + 1}
              </div>
            ))}
          </div>
        </div>
        <div className={styles.rows}>
          {stages.map((s, i) => {
            const passed = s.to <= head + 0.001;
            const span = spanLabel(unit, s.from, s.to);
            const p = pos(s);
            return (
              <div
                key={i}
                className={styles.row}
                data-final={s.final ? "" : undefined}
                // the whole row is the focus target: the bar itself can be scaled to 0 before it draws in
                tabIndex={0}
                aria-label={`${s.label}: ${span}`}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                <div className={styles.stageCol}>{s.label}</div>
                <div className={styles.track}>
                  <div
                    className={styles.bar}
                    data-bar
                    data-final={s.final ? "" : undefined}
                    data-active={hover === i ? "" : undefined}
                    data-passed={passed ? "" : undefined}
                    style={{ left: `calc(${p.left * 100}% + 3px)`, width: `calc(${p.width * 100}% - 6px)` }}
                    onPointerEnter={() => setHover(i)}
                    onPointerLeave={() => setHover(null)}
                  >
                    {hover === i && (
                      <span className={styles.tip} role="tooltip">
                        <b>{s.label}</b> {span}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={grid} className={styles.overlay} aria-hidden="true">
          {unitHover != null && <span className={styles.colHl} style={{ left: `${(unitHover / count) * 100}%`, width: `${100 / count}%` }} />}
        </div>
        <div className={styles.headLayer}>
          <div
            ref={playhead}
            className={styles.playhead}
            style={{ left: `${(head / count) * 100}%` }}
            role="slider"
            tabIndex={0}
            aria-label="Сегодня в плане проекта"
            aria-valuemin={1}
            aria-valuemax={count}
            aria-valuenow={Math.round(head) + 1}
            aria-valuetext={`${word} ${Math.round(head) + 1}`}
            onPointerDown={startDrag}
            onKeyDown={onKey}
          />
        </div>
      </div>

      {/* mobile: stage list with bars */}
      <div className={`${styles.list} only-mobile`}>
        <div className={styles.listHead}>
          <span>Этап</span>
          <span>
            {unit}1 → {unit}
            {count}
          </span>
        </div>
        {stages.map((s, i) => {
          const p = pos(s);
          return (
            <div key={i} className={styles.listRow}>
              <div className={styles.listMeta}>
                <span className={s.final ? styles.mint : undefined}>{s.label}</span>
                <span className={styles.listDays}>{spanLabel(unit, s.from, s.to)}</span>
              </div>
              <div className={styles.listTrack}>
                <span
                  className={styles.listBar}
                  data-mbar
                  data-final={s.final ? "" : undefined}
                  style={{ left: `${p.left * 100}%`, width: `${p.width * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
