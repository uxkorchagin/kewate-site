"use client";

import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP, EASE } from "@/lib/gsap";
import { canHover, clamp, lerp, prefersReducedMotion, whenVisible } from "@/lib/env";

type ElRef<T extends HTMLElement = HTMLElement> = RefObject<T | null>;

/* -------------------------------------------------------------------------- */
/* useReveal — default block appearance: opacity 0→1, y 32→0, 900ms expo.out  */
/* -------------------------------------------------------------------------- */

export function useReveal(
  scope: ElRef,
  opts: { selector?: string; y?: number; stagger?: number; start?: string; delay?: number; scale?: number } = {},
) {
  useGSAP(
    () => {
      const root = scope.current;
      if (!root) return;
      const targets = opts.selector ? gsap.utils.toArray<HTMLElement>(opts.selector, root) : [root];
      if (!targets.length) return;
      if (prefersReducedMotion()) {
        gsap.fromTo(targets, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "none" });
        return;
      }
      gsap.fromTo(
        targets,
        { opacity: 0, y: opts.y ?? 32, scale: opts.scale ?? 1 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.9,
          ease: EASE.out,
          stagger: opts.stagger ?? 0,
          delay: opts.delay ?? 0,
          scrollTrigger: { trigger: targets[0], start: opts.start ?? "top 85%", once: true },
        },
      );
    },
    { scope },
  );
}

/* -------------------------------------------------------------------------- */
/* useSplitLines — lines rise from a mask (yPercent 110→0, 1s expo.out)       */
/* -------------------------------------------------------------------------- */

export function splitLines(el: HTMLElement) {
  return SplitText.create(el, {
    type: "lines",
    mask: "lines",
    linesClass: "split-line",
    autoSplit: true,
  });
}

export function useSplitLines(
  ref: ElRef,
  opts: { start?: string; stagger?: number; delay?: number; manual?: boolean; onReady?: (tl: gsap.core.Timeline) => void } = {},
) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      if (prefersReducedMotion()) {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.2 });
        return;
      }
      gsap.set(el, { opacity: 1 });
      const split = splitLines(el);
      const tl = gsap.timeline({
        paused: !!opts.manual,
        delay: opts.delay ?? 0,
        scrollTrigger: opts.manual ? undefined : { trigger: el, start: opts.start ?? "top 85%", once: true },
      });
      tl.from(split.lines, { yPercent: 110, duration: 1, ease: EASE.out, stagger: opts.stagger ?? 0.08 });
      opts.onReady?.(tl);
      return () => split.revert();
    },
    { scope: ref },
  );
}

/* -------------------------------------------------------------------------- */
/* useMagnetic — pulls toward the cursor inside an 80px radius, springs back  */
/* -------------------------------------------------------------------------- */

export function useMagnetic(
  ref: ElRef,
  opts: { strength?: number; inner?: ElRef; innerStrength?: number; radius?: number } = {},
) {
  useEffect(() => {
    const el = ref.current;
    const strength = opts.strength ?? 8;
    if (!el || !canHover() || strength === 0) return;
    const innerStrength = opts.innerStrength ?? strength / 2;
    const radius = opts.radius ?? 80;
    const inner = opts.inner?.current ?? null;
    const xTo = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    const ixTo = inner ? gsap.quickTo(inner, "x", { duration: 0.35, ease: "power3.out" }) : null;
    const iyTo = inner ? gsap.quickTo(inner, "y", { duration: 0.35, ease: "power3.out" }) : null;
    let active = false;
    let visible = true;
    const stopVis = whenVisible(el, (v) => (visible = v));

    const onMove = (e: PointerEvent) => {
      if (!visible) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // distance to the element edge, not to its center — wide buttons stay responsive
      const ex = Math.max(0, Math.abs(dx) - r.width / 2);
      const ey = Math.max(0, Math.abs(dy) - r.height / 2);
      const dist = Math.hypot(ex, ey);
      if (dist < radius) {
        active = true;
        const nx = clamp(dx / (r.width / 2 + radius), -1, 1);
        const ny = clamp(dy / (r.height / 2 + radius), -1, 1);
        const falloff = 1 - dist / radius;
        xTo(nx * strength * falloff);
        yTo(ny * strength * falloff);
        ixTo?.(nx * innerStrength * falloff);
        iyTo?.(ny * innerStrength * falloff);
      } else if (active) {
        active = false;
        gsap.to(inner ? [el, inner] : el, { x: 0, y: 0, duration: 0.9, ease: EASE.spring, overwrite: true });
      }
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      stopVis();
    };
  }, [ref, opts.inner, opts.strength, opts.innerStrength, opts.radius]);
}

/* -------------------------------------------------------------------------- */
/* useCountUp — numbers count when entering the viewport                       */
/* -------------------------------------------------------------------------- */

export function useCountUp(
  ref: ElRef,
  opts: { to: number; from?: number; duration?: number; ease?: string; format?: (n: number) => string; onComplete?: () => void },
) {
  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const fmt = opts.format ?? ((n: number) => String(Math.round(n)));
      if (prefersReducedMotion()) {
        el.textContent = fmt(opts.to);
        opts.onComplete?.();
        return;
      }
      const state = { v: opts.from ?? 0 };
      el.textContent = fmt(state.v);
      gsap.to(state, {
        v: opts.to,
        duration: opts.duration ?? 1.8,
        ease: opts.ease ?? "power3.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onUpdate: () => {
          el.textContent = fmt(state.v);
        },
        onComplete: opts.onComplete,
      });
    },
    { scope: ref },
  );
}

/* -------------------------------------------------------------------------- */
/* usePointerLight — sets --mx/--my (px) following the cursor with lerp       */
/* -------------------------------------------------------------------------- */

export function usePointerLight(ref: ElRef, opts: { lerp?: number; target?: ElRef; clampTo?: number } = {}) {
  useEffect(() => {
    const host = ref.current;
    if (!host || !canHover()) return;
    const el = opts.target?.current ?? host;
    const k = opts.lerp ?? 0.1;
    let tx = host.clientWidth / 2;
    let ty = host.clientHeight / 2;
    let x = tx;
    let y = ty;
    let inside = false;
    let raf = 0;
    let visible = false;
    const stopVis = whenVisible(host, (v) => {
      visible = v;
      if (v && !raf) raf = requestAnimationFrame(tick);
    });

    function tick() {
      x = lerp(x, tx, k);
      y = lerp(y, ty, k);
      el.style.setProperty("--mx", `${x.toFixed(1)}px`);
      el.style.setProperty("--my", `${y.toFixed(1)}px`);
      const settled = Math.abs(x - tx) < 0.2 && Math.abs(y - ty) < 0.2;
      raf = visible && !(settled && !inside) ? requestAnimationFrame(tick) : 0;
    }
    const onMove = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      tx = e.clientX - r.left;
      ty = e.clientY - r.top;
      if (opts.clampTo != null) {
        const cx = r.width / 2;
        const cy = r.height / 2;
        tx = cx + clamp(tx - cx, -opts.clampTo, opts.clampTo);
        ty = cy + clamp(ty - cy, -opts.clampTo, opts.clampTo);
      }
      inside = true;
      el.dataset.lit = "1";
      if (!raf && visible) raf = requestAnimationFrame(tick);
    };
    const onLeave = () => {
      inside = false;
      delete el.dataset.lit;
    };
    host.addEventListener("pointermove", onMove);
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      stopVis();
    };
  }, [ref, opts.target, opts.lerp, opts.clampTo]);
}

/* -------------------------------------------------------------------------- */
/* useMarquee — endless track with scroll-velocity coupling, hover brake, drag */
/* -------------------------------------------------------------------------- */

export function useMarquee(
  viewport: ElRef,
  track: ElRef,
  opts: { speed?: number; hoverBrake?: boolean; draggable?: boolean; scrollCoupling?: boolean } = {},
) {
  useEffect(() => {
    const vp = viewport.current;
    const tr = track.current;
    if (!vp || !tr || prefersReducedMotion()) return;
    const speed = opts.speed ?? 30;
    let half = tr.scrollWidth / 2; // track is rendered twice for a seamless loop
    let x = -(parseFloat(getComputedStyle(tr).getPropertyValue("--start")) || 0);
    let dir = -1;
    let timeScale = 1;
    let targetScale = 1;
    let boost = 0; // scroll-driven extra speed, decays with inertia 0.9
    let dragging = false;
    let dragV = 0;
    let lastX = 0;
    let lastT = 0;
    let visible = true;

    const ro = new ResizeObserver(() => (half = tr.scrollWidth / 2));
    ro.observe(tr);
    const stopVis = whenVisible(vp, (v) => (visible = v));

    const scrollSync = opts.scrollCoupling !== false
      ? ScrollTrigger.create({
          trigger: vp,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            const v = self.getVelocity(); // px/s
            if (Math.abs(v) > 200) {
              dir = v > 0 ? -1 : 1;
              boost = clamp(Math.abs(v) / 900, 0, 3); // up to ×4 total
            }
          },
        })
      : null;

    const wrap = (v: number) => {
      if (!half) return v;
      return ((v % half) - half) % half;
    };

    const tick = (_t: number, dtMs: number) => {
      if (!visible) return;
      const dt = Math.min(dtMs, 64) / 1000;
      timeScale += (targetScale - timeScale) * Math.min(1, dt / 0.4 * 2.2);
      boost *= Math.pow(0.9, dt * 60 / 6);
      if (!dragging) {
        if (Math.abs(dragV) > 1) {
          x += dragV * dt;
          dragV *= Math.pow(0.92, dt * 60);
        }
        x += dir * speed * (1 + boost) * timeScale * dt;
      }
      x = wrap(x);
      tr.style.transform = `translate3d(${x.toFixed(2)}px,0,0)`;
    };
    gsap.ticker.add(tick);

    const onEnter = () => opts.hoverBrake !== false && (targetScale = 0);
    const onLeave = () => (targetScale = 1);
    const onDown = (e: PointerEvent) => {
      if (opts.draggable === false || e.button !== 0) return;
      dragging = true;
      dragV = 0;
      lastX = e.clientX;
      lastT = performance.now();
      vp.setPointerCapture(e.pointerId);
      vp.dataset.dragging = "1";
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const now = performance.now();
      const dx = e.clientX - lastX;
      x += dx;
      dragV = (dx / Math.max(1, now - lastT)) * 1000;
      lastX = e.clientX;
      lastT = now;
    };
    const onUp = () => {
      dragging = false;
      delete vp.dataset.dragging;
      if (dragV) dir = dragV > 0 ? 1 : -1;
    };
    vp.addEventListener("pointerenter", onEnter);
    vp.addEventListener("pointerleave", onLeave);
    vp.addEventListener("pointerdown", onDown);
    vp.addEventListener("pointermove", onMove);
    vp.addEventListener("pointerup", onUp);
    vp.addEventListener("pointercancel", onUp);
    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      stopVis();
      scrollSync?.kill();
      vp.removeEventListener("pointerenter", onEnter);
      vp.removeEventListener("pointerleave", onLeave);
      vp.removeEventListener("pointerdown", onDown);
      vp.removeEventListener("pointermove", onMove);
      vp.removeEventListener("pointerup", onUp);
      vp.removeEventListener("pointercancel", onUp);
    };
  }, [viewport, track, opts.speed, opts.hoverBrake, opts.draggable, opts.scrollCoupling]);
}

/* -------------------------------------------------------------------------- */
/* scramble — characters shuffle and settle left→right                         */
/* -------------------------------------------------------------------------- */

const GLYPHS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯabcdefghijklmnopqrstuvwxyz0123456789#%&*+=/<>";

export function scramble(el: HTMLElement, opts: { duration?: number; chars?: string; final?: string } = {}) {
  const final = opts.final ?? el.dataset.text ?? el.textContent ?? "";
  el.dataset.text = final;
  const pool = opts.chars ?? GLYPHS;
  const state = { p: 0 };
  return gsap.to(state, {
    p: 1,
    duration: opts.duration ?? 0.6,
    ease: "none",
    onUpdate: () => {
      const settled = Math.floor(state.p * final.length);
      let out = "";
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        out += i < settled || ch === " " || ch === "\n" ? ch : pool[(Math.random() * pool.length) | 0];
      }
      el.textContent = out;
    },
    onComplete: () => {
      el.textContent = final;
    },
  });
}

/* -------------------------------------------------------------------------- */
/* useLayerParallax — illustration layers drift with the cursor (4/8/14 px)   */
/* -------------------------------------------------------------------------- */

const DEPTH_PX: Record<string, number> = { "1": 4, "2": 8, "3": 14 };

export function useLayerParallax(host: ElRef, scale = 1) {
  useEffect(() => {
    const el = host.current;
    if (!el || !canHover()) return;
    const layers = Array.from(el.querySelectorAll<HTMLElement>("[data-depth]"));
    const accents = Array.from(el.querySelectorAll<HTMLElement>("[data-accent]"));
    const move = (nx: number, ny: number, dur: number, ease: string) => {
      layers.forEach((l) => {
        const d = (DEPTH_PX[l.dataset.depth ?? "1"] ?? 4) / scale;
        gsap.to(l, { "--px": `${nx * d}px`, "--py": `${ny * d}px`, duration: dur, ease, overwrite: "auto" });
      });
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      move(((e.clientX - r.left) / r.width - 0.5) * 2, ((e.clientY - r.top) / r.height - 0.5) * 2, 0.5, "power3.out");
    };
    const onEnter = () => {
      gsap.fromTo(accents, { scale: 1 }, { scale: 1.08, duration: 0.35, ease: "sine.inOut", yoyo: true, repeat: 3, overwrite: "auto" });
    };
    const onLeave = () => move(0, 0, 0.9, EASE.spring);
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [host, scale]);
}

/* -------------------------------------------------------------------------- */
/* useIllustrationScale — fits the 306×200 illustration stage into its card   */
/* -------------------------------------------------------------------------- */

export function useIllustrationScale(ref: ElRef) {
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    // 1 on the 306px desktop card, 0.78 on the 150px-tall mobile card, smaller on narrow tablets
    const fit = () => {
      const s = Math.min(1, el.clientWidth / 306, el.clientHeight / 192);
      el.style.setProperty("--ill-scale", s.toFixed(3));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    fit();
    return () => ro.disconnect();
  }, [ref]);
}
