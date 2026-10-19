"use client";

import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";

/**
 * «Секции наезжают друг на друга»: every [data-section] (except the first and those
 * marked data-seamless) enters with a 40px rounded top that flattens to 0 on scrub;
 * the section below it drifts with parallax 0.85 and darkens to 30%.
 */
export function SectionTransitions() {
  useGSAP(() => {
    if (prefersReducedMotion()) return;
    const sections = gsap.utils.toArray<HTMLElement>("[data-section]");
    const mm = gsap.matchMedia();

    mm.add(
      { desktop: "(min-width: 768px)", mobile: "(max-width: 767px)" },
      (ctx) => {
        const { desktop } = ctx.conditions as { desktop: boolean };
        const radius = desktop ? 40 : 28;
        sections.forEach((s, i) => {
          s.style.zIndex = String(i + 1);
          if (i === 0 || s.dataset.seamless !== undefined) return;
          gsap.fromTo(
            s,
            { clipPath: `inset(0px 0px 0px 0px round ${radius}px ${radius}px 0px 0px)` },
            {
              clipPath: "inset(0px 0px 0px 0px round 0px 0px 0px 0px)",
              ease: "none",
              scrollTrigger: { trigger: s, start: "top bottom", end: "top top", scrub: true, refreshPriority: -1 },
            },
          );
          const prev = sections[i - 1];
          if (!desktop || i === 1) return; // hero handles its own exit
          const inner = prev.querySelector<HTMLElement>(":scope > [data-section-inner]") ?? null;
          const shade = prev.querySelector<HTMLElement>(":scope > [data-section-shade]") ?? null;
          const tl = gsap.timeline({
            scrollTrigger: { trigger: s, start: "top bottom", end: "top top", scrub: true, refreshPriority: -1 },
          });
          if (inner) tl.fromTo(inner, { y: 0 }, { y: () => window.innerHeight * 0.15, ease: "none" }, 0);
          if (shade) tl.fromTo(shade, { opacity: 0 }, { opacity: 0.3, ease: "none" }, 0);
        });
        ScrollTrigger.refresh();
      },
    );
    return () => mm.revert();
  }, []);
  return null;
}
