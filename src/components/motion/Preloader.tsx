"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";
import { Logo } from "@/components/ui/Logo";
import styles from "./Preloader.module.css";

const KEY = "kw-visited";

declare global {
  interface Window {
    __kwIntroDone?: boolean;
  }
}

export function signalIntro() {
  window.__kwIntroDone = true;
  window.dispatchEvent(new Event("kewate:intro"));
}

/** Run `cb` once the preloader (if any) has finished. */
export function onIntro(cb: () => void) {
  if (window.__kwIntroDone) {
    cb();
    return () => {};
  }
  const h = () => cb();
  window.addEventListener("kewate:intro", h, { once: true });
  return () => window.removeEventListener("kewate:intro", h);
}

/**
 * First visit only (sessionStorage): black screen, mono counter 0→100 bottom-left,
 * logo drawn by its outline, then the screen wipes up (clip-path, 800ms expo.inOut).
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = root.current;
    let visited = false;
    try {
      visited = !!sessionStorage.getItem(KEY);
    } catch {}
    if (!el || visited || prefersReducedMotion()) {
      setDone(true);
      signalIntro();
      return;
    }

    const html = document.documentElement;
    html.style.overflow = "hidden";
    const strokes = el.querySelectorAll<SVGPathElement>(".logo-stroke, .logo-letter");
    const letters = el.querySelectorAll<SVGPathElement>(".logo-letter");
    const state = { n: 0 };

    gsap.set(strokes, { strokeDasharray: 1, strokeDashoffset: 1 });
    gsap.set(letters, { fillOpacity: 0, stroke: "#fff", strokeWidth: 0.6 });

    const tl = gsap.timeline({
      onComplete: () => {
        html.style.overflow = "";
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {}
        setDone(true);
      },
    });
    tl.to(state, {
      n: 100,
      duration: 1.6,
      ease: "power2.inOut",
      onUpdate: () => {
        if (count.current) count.current.textContent = String(Math.round(state.n));
      },
    })
      .to(strokes, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut", stagger: 0.05 }, 0.15)
      .to(letters, { fillOpacity: 1, strokeWidth: 0, duration: 0.3, ease: "none" }, 1.15)
      .to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.8, ease: "expo.inOut" }, "+=0.1")
      .call(signalIntro, [], "-=0.45");

    return () => {
      tl.kill();
      html.style.overflow = "";
    };
  }, []);

  if (done) return null;
  return (
    <div ref={root} className={styles.preloader} aria-hidden="true" data-preloader>
      <Logo width={220} color="#fff" title={null} />
      <span ref={count} className={styles.count}>
        0
      </span>
    </div>
  );
}
