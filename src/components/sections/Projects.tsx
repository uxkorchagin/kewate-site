"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, useGSAP, EASE } from "@/lib/gsap";
import { serviceCases, usedProjectFilters, type ProjectFilter } from "@/content/service-shared";
import { CaseCoverView } from "./projects/CaseCover";
import { canHover, clamp, prefersReducedMotion } from "@/lib/env";
import { useSplitLines } from "@/components/motion/hooks";
import { Icon, SwapArrow } from "@/components/ui/Icon";
import styles from "./Projects.module.css";

const CARD = 560;
const GAP = 16;

/**
 * «Проекты, которые мы запустили» (181:921). The main page and every service page show the same cases with
 * the scrolling-screenshot preview. On a service page (`topic`) the filter of the page topic is preselected
 * (258:323) — when that topic has no cases yet, «Все» is. Only filters with cases are offered.
 */
export function Projects({ topic }: { topic?: ProjectFilter } = {}) {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const prevBtn = useRef<HTMLButtonElement>(null);
  const nextBtn = useRef<HTMLButtonElement>(null);
  const range = useRef(0); // current horizontal travel in px
  const [filter, setFilter] = useState<ProjectFilter>(topic && usedProjectFilters.some((f) => f.id === topic) ? topic : "all");
  const [index, setIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const filters = usedProjectFilters;
  const visible = serviceCases.filter((c) => filter === "all" || c.filters.includes(filter));

  useSplitLines(title);

  /* ---------- desktop: the track moves on its own — page scroll is never captured ---------- */
  const offset = useRef({ x: 0 }); // how far the track is shifted left, px
  const move = useRef<gsap.core.Tween | null>(null);
  const dest = useRef(0); // where the current slide is heading, px
  const applyRef = useRef<() => void>(() => {});
  const isMobile = () => window.matchMedia("(max-width: 767px)").matches;

  const measure = useCallback(() => {
    const tr = track.current;
    const vp = viewport.current;
    if (!tr || !vp) return 0;
    range.current = Math.max(0, tr.scrollWidth - vp.clientWidth);
    return range.current;
  }, []);

  /** animate the track to offset `x` (clamped) */
  const slideTo = useCallback((x: number, duration = 0.5) => {
    move.current?.kill();
    const target = clamp(x, 0, range.current);
    dest.current = target;
    move.current = gsap.to(offset.current, {
      x: target,
      duration: prefersReducedMotion() ? 0 : duration,
      ease: EASE.out,
      onUpdate: () => applyRef.current(),
    });
  }, []);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const tr = track.current!;
        const vp = viewport.current!;
        const step = CARD + GAP;
        measure();

        const apply = () => {
          const x = -offset.current.x;
          gsap.set(tr, { x });
          // inner images drift the other way (10% parallax)
          tr.querySelectorAll<HTMLElement>("[data-parallax]").forEach((img) => {
            const card = img.parentElement!.parentElement!;
            const center = card.offsetLeft + x + card.offsetWidth / 2;
            const n = (center - vp.clientWidth / 2) / vp.clientWidth;
            gsap.set(img, { xPercent: -n * 10 });
          });
          const p = range.current ? clamp(offset.current.x / range.current, 0, 1) : 0;
          if (bar.current) gsap.set(bar.current, { scaleX: 0.2 + 0.8 * p });
          setIndex(clamp(Math.round(offset.current.x / step), 0, Math.max(0, tr.children.length - 1)));
          setAtStart(offset.current.x <= 1);
          setAtEnd(offset.current.x >= range.current - 1);
        };
        applyRef.current = apply;
        apply();

        const ro = new ResizeObserver(() => {
          measure();
          offset.current.x = clamp(offset.current.x, 0, range.current);
          apply();
        });
        ro.observe(vp);
        ro.observe(tr);

        // horizontal trackpad swipes move the track; vertical wheel goes to the page as usual
        const onWheel = (e: WheelEvent) => {
          if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) || !range.current) return;
          e.preventDefault();
          move.current?.kill();
          offset.current.x = clamp(offset.current.x + e.deltaX, 0, range.current);
          dest.current = offset.current.x;
          apply();
        };
        vp.addEventListener("wheel", onWheel, { passive: false });

        return () => {
          ro.disconnect();
          vp.removeEventListener("wheel", onWheel);
          move.current?.kill();
          offset.current.x = 0;
          applyRef.current = () => {};
          gsap.set(tr, { x: 0 });
        };
      });
      return () => mm.revert();
    },
    { scope: root },
  );

  const goTo = useCallback(
    (i: number) => {
      const vp = viewport.current;
      if (!vp) return;
      const n = track.current?.children.length ?? 0;
      const target = clamp(i, 0, Math.max(0, n - 1));
      if (isMobile()) {
        const card = track.current?.children[target] as HTMLElement | undefined;
        vp.scrollTo({ left: card ? card.offsetLeft - 16 : 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        return;
      }
      slideTo(target * (CARD + GAP), 0.5);
    },
    [slideTo],
  );

  /** one card forward/back; counts from where the track is heading, so rapid clicks don't stall */
  const step = useCallback(
    (dir: 1 | -1) => {
      if (isMobile()) return goTo(index + dir);
      goTo(Math.round(dest.current / (CARD + GAP)) + dir);
    },
    [goTo, index],
  );

  /* ---------- desktop drag with inertia ---------- */
  useEffect(() => {
    const vp = viewport.current;
    if (!vp || !canHover()) return;
    let startX = 0;
    let startOffset = 0;
    let lastX = 0;
    let lastT = 0;
    let v = 0;
    let dragging = false;
    let moved = false;
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || isMobile()) return;
      move.current?.kill();
      dragging = true;
      moved = false;
      startX = lastX = e.clientX;
      lastT = performance.now();
      startOffset = offset.current.x;
      v = 0;
      vp.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 4) {
        moved = true;
        vp.dataset.dragging = "1";
      }
      const now = performance.now();
      v = ((e.clientX - lastX) / Math.max(1, now - lastT)) * 1000;
      lastX = e.clientX;
      lastT = now;
      let x = startOffset - dx;
      // rubber band past the edges
      if (x < 0) x *= 0.35;
      else if (x > range.current) x = range.current + (x - range.current) * 0.35;
      offset.current.x = x;
      applyRef.current();
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      delete vp.dataset.dragging;
      slideTo(offset.current.x - v * 0.35, 0.9);
    };
    const click = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    vp.addEventListener("pointerdown", down);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerup", up);
    vp.addEventListener("pointercancel", up);
    vp.addEventListener("click", click, true);
    return () => {
      vp.removeEventListener("pointerdown", down);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerup", up);
      vp.removeEventListener("pointercancel", up);
      vp.removeEventListener("click", click, true);
    };
  }, [slideTo]);

  /* ---------- mobile: native swipe + snap, progress follows ---------- */
  useEffect(() => {
    const vp = viewport.current;
    if (!vp) return;
    const onScroll = () => {
      if (!isMobile()) return;
      const max = vp.scrollWidth - vp.clientWidth;
      const p = max > 0 ? vp.scrollLeft / max : 0;
      if (progress.current) progress.current.style.setProperty("--p", String(p));
      const i = Math.round(vp.scrollLeft / (300 + 12));
      setIndex(clamp(i, 0, (track.current?.children.length ?? 1) - 1));
      setAtStart(p < 0.01);
      setAtEnd(p > 0.99);
    };
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => vp.removeEventListener("scroll", onScroll);
  }, []);

  /* ---------- progress bar: click / drag to rewind ---------- */
  const scrubFromBar = (clientX: number) => {
    const el = progress.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const p = clamp((clientX - r.left) / r.width, 0, 1);
    if (isMobile()) {
      const vp = viewport.current!;
      vp.scrollTo({ left: p * (vp.scrollWidth - vp.clientWidth) });
      return;
    }
    slideTo(p * range.current, 0.4);
  };

  /* ---------- filters: instant switch ---------- */
  const firstFilterRun = useRef(true);
  const changeFilter = (f: ProjectFilter) => {
    if (f !== filter) setFilter(f);
  };
  useEffect(() => {
    // nothing to do on mount — never touch the page scroll here
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return;
    }
    measure();
    // back to the first card of the new list, without animation (moves the track only, not the page)
    if (isMobile()) viewport.current?.scrollTo({ left: 0 });
    else slideTo(0, 0);
  }, [filter, measure, slideTo]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      step(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      step(-1);
    }
  };

  const total = visible.length;

  return (
    <section ref={root} id="projects" className={`${styles.projects} ${topic ? styles.service : ""}`} data-theme="dark" data-section aria-labelledby="projects-title">
      <div className={styles.inner} data-section-inner>
        <div className={styles.head}>
          <p className={`eyebrow only-mobile ${styles.eyebrow}`}>Проекты</p>
          <h2 ref={title} id="projects-title" className={styles.title}>
            Проекты, которые мы запустили
          </h2>
          <div className={styles.controls}>
            <div className={styles.filters} role="group" aria-label="Фильтр проектов">
              {filters.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={styles.filter}
                  aria-pressed={filter === f.id}
                  onClick={() => changeFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className={`${styles.nav} only-desktop`}>
              <Counter index={index} total={total} className={styles.counter} />
              <button
                ref={prevBtn}
                type="button"
                className={`${styles.arrow} ${styles.arrowDark}`}
                onClick={() => step(-1)}
                disabled={atStart}
                aria-label="Предыдущий проект"
                aria-controls="projects-track"
              >
                <span className={styles.shootL}>
                  <Icon name="arrow-left" size={15} stroke={1.4} />
                </span>
              </button>
              <button
                ref={nextBtn}
                type="button"
                className={`${styles.arrow} ${styles.arrowLight}`}
                onClick={() => step(1)}
                disabled={atEnd}
                aria-label="Следующий проект"
                aria-controls="projects-track"
              >
                <span className={styles.shootR}>
                  <Icon name="arrow-right" size={15} stroke={1.4} />
                </span>
              </button>
            </div>
          </div>
        </div>

        <div
          ref={viewport}
          className={styles.viewport}
          data-drag
          role="region"
          aria-roledescription="карусель"
          aria-label="Проекты студии"
          tabIndex={0}
          onKeyDown={onKey}
        >
          <div ref={track} id="projects-track" className={styles.track}>
            {visible.map((c) => (
              <article
                key={c.id}
                className={`${styles.card} swap-host`}
                data-cover={c.cover.kind}
                aria-label={c.title}
                aria-roledescription="слайд"
              >
                <CaseCoverView cover={c.cover} client={c.client} viewport={viewport} />
                <div className={styles.caption}>
                  <p className={styles.tags}>{c.tags}</p>
                  <div className={styles.titleRow}>
                    <h3 className={styles.cardTitle}>{c.title}</h3>
                    <SwapArrow size={15} stroke={1.4} className={`${styles.cardArrow} only-desktop`} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className={styles.foot}>
          <div
            ref={progress}
            className={styles.progress}
            role="slider"
            tabIndex={-1}
            aria-label="Положение ленты проектов"
            aria-valuemin={1}
            aria-valuemax={total}
            aria-valuenow={index + 1}
            onPointerDown={(e) => {
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              scrubFromBar(e.clientX);
            }}
            onPointerMove={(e) => e.buttons === 1 && scrubFromBar(e.clientX)}
          >
            <span className={styles.base} />
            <span ref={bar} className={styles.bar} />
          </div>
          <Counter index={index} total={total} className={`${styles.counter} only-mobile`} />
        </div>
      </div>
      <div className={styles.shade} data-section-shade aria-hidden="true" />
    </section>
  );
}

/** «1 / 5» — the current digit rolls like an odometer (400ms). */
function Counter({ index, total, className }: { index: number; total: number; className?: string }) {
  return (
    <p className={className} aria-live="polite" aria-atomic="true">
      <span className="sr-only">
        Проект {index + 1} из {total}
      </span>
      <span aria-hidden="true" className={styles.odo}>
        <span className={styles.odoReel} style={{ transform: `translateY(${(-index * 100) / Math.max(total, 1)}%)` }}>
          {Array.from({ length: Math.max(total, 1) }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </span>
      </span>
      <span aria-hidden="true"> / {total}</span>
    </p>
  );
}
