"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";
import { onIntro } from "@/components/motion/Preloader";
import { serviceCopy } from "@/content/service-shared";
import { Icon } from "@/components/ui/Icon";
import { useLead } from "./LeadContext";
import styles from "./DemoBanner.module.css";

const KEY = "kw-demo-hidden";

/**
 * «Демо бесплатно» (265:317 / 281:310), sites page only. It keeps its place from the first paint (no
 * layout shift); after the preloader its content slides in. The fixed header sits right under it and
 * glides up as the banner scrolls away. × folds it (350 ms) and hides it for the session.
 */
export function DemoBanner() {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const { openLead } = useLead();

  // header offset follows the banner while it is on screen
  useEffect(() => {
    const el = root.current;
    if (!el || document.documentElement.classList.contains("demo-hidden")) return;
    const html = document.documentElement;
    let raf = 0;
    const sync = () => {
      raf = 0;
      const h = el.offsetHeight;
      html.style.setProperty("--banner-offset", `${Math.max(0, h - window.scrollY)}px`);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(sync);
    };
    sync();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const stopIntro = onIntro(() => {
      if (prefersReducedMotion()) return;
      gsap.fromTo(body.current, { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.45, ease: "expo.out" });
    });
    return () => {
      stopIntro();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const close = () => {
    const el = root.current;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
    const done = () => {
      document.documentElement.classList.add("demo-hidden");
      document.documentElement.style.setProperty("--banner-offset", "0px");
      window.dispatchEvent(new Event("resize"));
    };
    if (!el || prefersReducedMotion()) return done();
    gsap.to(el, {
      height: 0,
      duration: 0.35,
      ease: "power2.inOut",
      onUpdate: () => document.documentElement.style.setProperty("--banner-offset", `${Math.max(0, el.offsetHeight - window.scrollY)}px`),
      onComplete: done,
    });
  };

  return (
    <>
      {/* runs before paint: a banner dismissed earlier in this session never shows up (no shift) */}
      <script
        dangerouslySetInnerHTML={{
          __html: `try{if(sessionStorage.getItem("${KEY}"))document.documentElement.classList.add("demo-hidden");else document.documentElement.classList.add("has-banner")}catch(e){}`,
        }}
      />
      <div ref={root} className={styles.banner} role="region" aria-label="Демо бесплатно">
        <div ref={body} className={styles.body}>
          <span className={styles.spacer} aria-hidden="true" />
          <p className={styles.row}>
            <span className={styles.text}>{serviceCopy.demo}</span>
            <button type="button" className={styles.demo} onClick={() => openLead({ demo: true })}>
              получить демо
              <span className={styles.arrow} aria-hidden="true">
                <Icon name="arrow-up-right" size={12} stroke={1.4} />
              </span>
            </button>
          </p>
          <button type="button" className={styles.close} onClick={close} aria-label="Скрыть баннер">
            <Icon name="close" size={16} stroke={1.6} />
          </button>
        </div>
      </div>
    </>
  );
}
