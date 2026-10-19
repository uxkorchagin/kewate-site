"use client";

import Lenis from "lenis";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";

const LenisContext = createContext<Lenis | null>(null);

export const useLenis = () => useContext(LenisContext);

/** Scroll helper that works with and without Lenis (reduced motion / touch). */
export function scrollToTarget(
  lenis: Lenis | null,
  target: string | number | HTMLElement,
  opts: { duration?: number; offset?: number; easing?: (t: number) => number } = {},
) {
  if (lenis) {
    lenis.scrollTo(target, { duration: opts.duration ?? 1.2, offset: opts.offset ?? 0, easing: opts.easing });
    return;
  }
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  const top =
    typeof el === "number" ? el : el ? el.getBoundingClientRect().top + window.scrollY + (opts.offset ?? 0) : 0;
  window.scrollTo({ top, behavior: prefersReducedMotion() ? "auto" : "smooth" });
}

export const expoInOut = (t: number) =>
  t === 0 ? 0 : t === 1 ? 1 : t < 0.5 ? Math.pow(2, 20 * t - 10) / 2 : (2 - Math.pow(2, -20 * t + 10)) / 2;

export function SmoothScroll({ children }: { children: ReactNode }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const raf = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    document.documentElement.classList.add("js");
    if (prefersReducedMotion()) {
      document.documentElement.classList.add("reduced");
      return;
    }

    // Lenis only drives wheel scrolling; touch keeps native momentum (syncTouch false).
    const instance = new Lenis({ lerp: 0.1, wheelMultiplier: 1, smoothWheel: true });
    instance.on("scroll", ScrollTrigger.update);
    raf.current = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(raf.current);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);

    return () => {
      if (raf.current) gsap.ticker.remove(raf.current);
      instance.destroy();
      setLenis(null);
    };
  }, []);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
