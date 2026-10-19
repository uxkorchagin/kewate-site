"use client";

import { useEffect, useRef, type RefObject } from "react";
import { gsap } from "@/lib/gsap";
import { canHover, prefersReducedMotion } from "@/lib/env";
import type { CaseCover } from "@/content/service-shared";
import styles from "./CaseCover.module.css";

const SPEED = 500; // px/s in preview scale (296:309)
const PAUSE = 0.6;

export function CaseCoverView({ cover, client, viewport }: { cover: CaseCover; client: string; viewport: RefObject<HTMLElement | null> }) {
  return <Snapshot cover={cover} client={client} viewport={viewport} />;
}

/**
 * Hover preview (296:309): the window grows 1 → 1.05 with a deeper shadow, and the long screenshot
 * scrolls to the very bottom, pauses 600 ms, scrolls back, pauses — on a loop while the pointer stays.
 * Constant speed (~500 px/s), sine.inOut turns; leaving rewinds to the top in 500 ms.
 * The webp is lazy (loading="lazy" + the browser fetches it as the carousel nears the screen).
 */
function Snapshot({
  cover,
  client,
  viewport,
}: {
  cover: CaseCover;
  client: string;
  viewport: RefObject<HTMLElement | null>;
}) {
  const win = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const w = win.current;
    const im = img.current;
    const card = w?.closest("article");
    if (!w || !im || !card || prefersReducedMotion()) return;
    let loop: gsap.core.Timeline | null = null;
    let active = false;
    // the lazy webp may still be loading when the pointer arrives — start once it is there
    const onLoad = () => active && start();
    im.addEventListener("load", onLoad);

    const start = () => {
      active = true;
      const travel = im.offsetHeight - w.clientHeight;
      if (travel <= 4) return;
      loop?.kill();
      const d = travel / SPEED;
      loop = gsap
        .timeline({ repeat: -1 })
        .to(im, { y: -travel, duration: d, ease: "sine.inOut" })
        .to(im, { y: 0, duration: d, ease: "sine.inOut" }, `+=${PAUSE}`)
        .to({}, { duration: PAUSE });
    };
    const stop = () => {
      active = false;
      loop?.kill();
      loop = null;
      gsap.to(im, { y: 0, duration: 0.5, ease: "power2.out", overwrite: true });
    };

    if (canHover()) {
      card.addEventListener("pointerenter", start);
      card.addEventListener("pointerleave", stop);
      return () => {
        card.removeEventListener("pointerenter", start);
        card.removeEventListener("pointerleave", stop);
        im.removeEventListener("load", onLoad);
        loop?.kill();
      };
    }
    // touch: play while the card sits in the middle of the carousel
    const io = new IntersectionObserver(
      ([e]) => {
        card.toggleAttribute("data-centered", e.isIntersecting);
        if (e.isIntersecting) start();
        else stop();
      },
      { root: viewport.current, rootMargin: "0px -35% 0px -35%", threshold: 0 },
    );
    io.observe(card);
    return () => {
      io.disconnect();
      im.removeEventListener("load", onLoad);
      loop?.kill();
    };
  }, [viewport]);

  return (
    <div className={`${styles.cover} ${styles.light}`}>
      <div ref={win} className={styles.window}>
        {/* eslint-disable-next-line @next/next/no-img-element -- a plain lazy webp: no image server on static hosting */}
        <img
          ref={img}
          className={styles.shot}
          src={cover.src}
          alt={`${client} — скриншот сайта`}
          width={cover.width}
          height={cover.height}
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
    </div>
  );
}
