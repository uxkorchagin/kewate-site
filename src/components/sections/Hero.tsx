"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, SplitText, useGSAP, EASE } from "@/lib/gsap";
import { clients } from "@/content/site";
import { canHover, isMobileViewport, prefersReducedMotion, whenVisible } from "@/lib/env";
import { onIntro } from "@/components/motion/Preloader";
import { scramble, useMarquee } from "@/components/motion/hooks";
import { scrollToTarget, useLenis } from "@/components/motion/SmoothScroll";
import { Button } from "@/components/ui/Button";
import styles from "./Hero.module.css";

const COLS_DESKTOP = 12;
const COLS_MOBILE = 5;

type ServiceHero = {
  /** H1 split into white (accent) and grey parts */
  h1: [text: string, accent: boolean][];
  /** «Стоимость / Срок / Включено» bar (258:313) */
  specs: { label: string; value: string }[];
  /** «Обсудить задачу» and «Рассчитать стоимость» open the lead form */
  onPrimary: () => void;
  onSecondary: () => void;
};

/** Main page hero (181:765); with `service` — the hero of a service page (205:311). */
export function Hero({ service }: { service?: ServiceHero } = {}) {
  const root = useRef<HTMLElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const h1 = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLElement>(null);
  const ctas = useRef<HTMLDivElement>(null);
  const trusted = useRef<HTMLDivElement>(null);
  const vp = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const shade = useRef<HTMLDivElement>(null);
  const follow = useRef<HTMLDivElement>(null);
  const lenis = useLenis();

  useMarquee(vp, track, { speed: 30 });

  /* ---------------- intro + scroll choreography ---------------- */
  useGSAP(
    () => {
      const el = root.current!;
      const reduced = prefersReducedMotion();
      const lines = gsap.utils.toArray<HTMLElement>("[data-line]", grid.current);
      const cells = gsap.utils.toArray<HTMLElement>("[data-cell]", track.current);
      const subLines = gsap.utils.toArray<HTMLElement>("[data-sub]", sub.current);
      const buttons = gsap.utils.toArray<HTMLElement>(":scope > *", ctas.current);

      if (reduced) {
        gsap.set([h1.current, sub.current, ctas.current, trusted.current, glow.current], { opacity: 0 });
        const stop = onIntro(() =>
          gsap.to([h1.current, sub.current, ctas.current, trusted.current, glow.current], { opacity: 1, duration: 0.2 }),
        );
        return stop;
      }

      const split = SplitText.create(h1.current!, {
        type: "lines,words,chars",
        mask: "lines",
        linesClass: styles.h1Line,
        charsClass: styles.char,
      });
      el.dataset.split = "1";

      gsap.set(lines, { scaleY: 0, transformOrigin: "50% 100%" });
      gsap.set(glow.current, { opacity: 0, scale: 0.8 });
      gsap.set(split.lines, { yPercent: 110 });
      gsap.set(subLines, { opacity: 0 });
      gsap.set(buttons, { opacity: 0, y: 16 });
      gsap.set(trusted.current, { opacity: 0 });
      gsap.set(cells, { opacity: 0 });

      const intro = gsap.timeline({ paused: true });
      intro
        .to(lines, { scaleY: 1, duration: 1, ease: EASE.out, stagger: 0.03 }, 0)
        .to(glow.current, { opacity: 1, scale: 1, duration: 1.4, ease: "power2.out" }, 0.1)
        .to(split.lines, { yPercent: 0, duration: 1, ease: EASE.out, stagger: 0.08 }, 0.25)
        .add(() => {
          subLines.forEach((s) => {
            gsap.set(s, { opacity: 1 });
            if (!service) scramble(s, { duration: 0.6 });
          });
        }, 0.25 + 0.3 + 0.3)
        .to(buttons, { opacity: 1, y: 0, duration: 0.8, ease: EASE.out, stagger: 0.08 }, 1.1)
        .to(trusted.current, { opacity: 1, duration: 0.6 }, 1.3)
        .to(cells, { opacity: 1, duration: 0.6, stagger: 0.04, ease: "power2.out" }, 1.35);
      const stopIntro = onIntro(() => intro.play());

      // breathing glow (6s cycle)
      const breathe = gsap.to(follow.current!.firstElementChild, {
        scale: 1.06,
        opacity: 1,
        duration: 3,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
      });
      const stopVis = whenVisible(el, (v) => (v ? breathe.play() : breathe.pause()));

      // scroll: pin 40% of the height, content drifts up with blur, next section slides over
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px)", () => {
        const range = () => el.offsetHeight * 0.4;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top top",
            end: () => `+=${el.offsetHeight}`,
            scrub: true,
            invalidateOnRefresh: true,
          },
        });
        // Explicit start values + no immediate render: these tweens share elements with the intro
        // (lines rise via yPercent, the glow fades in via opacity). A plain .to() would record the
        // pre-intro state as its start, and scrolling back to the top would hide the headline again.
        // The lines therefore drift with `y` (px), a property the intro never touches.
        const flat = { ease: "none", immediateRender: false };
        const lineShift = (i: number, k: number) => () => -((split.lines[i] as HTMLElement | undefined)?.offsetHeight ?? 0) * k;
        tl.fromTo(content.current, { y: 0 }, { y: () => -range() * 1.5, ...flat }, 0)
          .fromTo(split.lines[0], { y: 0 }, { y: lineShift(0, 0.4), ...flat }, 0)
          .fromTo(split.lines[1] ?? [], { y: 0 }, { y: lineShift(1, 0.1), ...flat }, 0)
          .fromTo(glow.current, { y: 0, opacity: 1 }, { y: () => -el.offsetHeight * 0.25, opacity: 0, ...flat }, 0)
          .fromTo(shade.current, { opacity: 0 }, { opacity: 0.3, ...flat }, 0);
        ScrollTrigger.create({
          trigger: el,
          start: "top top",
          end: () => `+=${range()}`,
          pin: true,
          pinSpacing: false,
          invalidateOnRefresh: true,
        });
      });

      return () => {
        stopIntro();
        stopVis();
        breathe.kill();
        mm.revert();
        split.revert();
      };
    },
    { scope: root },
  );

  /* ---------------- background: column trail, roaming lit column, click wave, glow follow ----------------
     Lighter than the first version: no per-frame ticker. Everything is a short transform/opacity tween
     started by an event (pointer move, click, a 4 s timer), and nothing runs while the hero is off screen. */
  useEffect(() => {
    const el = root.current;
    const g = grid.current;
    const f = follow.current;
    if (!el || !g || !f || prefersReducedMotion()) return;
    const cols = () => gsap.utils.toArray<HTMLElement>("[data-col]", g).filter((c) => c.offsetParent !== null);
    const lit = g.querySelector<HTMLElement>("[data-lit]");
    const nCols = () => (isMobileViewport() ? COLS_MOBILE : COLS_DESKTOP);
    const colW = () => el.clientWidth / nCols();
    // CSS parks the lit column on its design slot (desktop 8th, mobile 4th); JS moves it relative to that
    const homeIndex = () => (isMobileViewport() ? 3 : 7);
    let litIndex = homeIndex();
    let pointerInside = false;
    let current = -1;
    let visible = true;

    // one style write per move — the 1.2 s glide is a CSS transition on the compositor
    const placeLit = (i: number, dur: number) => {
      litIndex = i;
      if (!lit) return;
      lit.style.transitionDuration = `${dur}s`;
      lit.style.transform = `translate3d(${(i - homeIndex()) * colW()}px, 0, 0)`;
    };
    const roam = gsap.delayedCall(4, function loop() {
      if (!pointerInside && visible) {
        let next = litIndex;
        while (next === litIndex) next = Math.floor(Math.random() * nCols());
        placeLit(next, 1.2);
      }
      roam.restart(true);
    });
    const stopVis = whenVisible(el, (v) => {
      visible = v;
      if (v) roam.resume();
      else roam.pause();
    });
    const onResize = () => placeLit(Math.min(litIndex, nCols() - 1), 0);
    window.addEventListener("resize", onResize);

    if (!canHover()) {
      return () => {
        roam.kill();
        stopVis();
        window.removeEventListener("resize", onResize);
      };
    }

    const fx = gsap.quickTo(f, "x", { duration: 1.4, ease: "power3.out" });
    const fy = gsap.quickTo(f, "y", { duration: 1.4, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      pointerInside = true;
      const r = el.getBoundingClientRect();
      fx(gsap.utils.clamp(-200, 200, e.clientX - (r.left + r.width / 2)));
      fy(gsap.utils.clamp(-200, 200, e.clientY - (r.top + r.height * 0.7)));
      const i = Math.floor((e.clientX - r.left) / colW());
      if (i === current) return;
      const list = cols();
      if (list[current]) gsap.to(list[current], { opacity: 0, duration: 0.9, ease: "power2.out", overwrite: true });
      current = i;
      if (list[i]) gsap.to(list[i], { opacity: 0.5, duration: 0.25, ease: "power2.out", overwrite: true });
    };
    const onLeave = () => {
      pointerInside = false;
      fx(0);
      fy(0);
      const list = cols();
      if (list[current]) gsap.to(list[current], { opacity: 0, duration: 0.9, overwrite: true });
      current = -1;
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest("a, button, [data-marquee]")) return;
      const r = el.getBoundingClientRect();
      const origin = Math.floor((e.clientX - r.left) / colW());
      cols().forEach((c, i) => {
        gsap
          .timeline({ delay: Math.abs(i - origin) * 0.04 })
          .to(c, { opacity: 1, duration: 0.15, ease: "power2.out", overwrite: true })
          .to(c, { opacity: i === current ? 0.5 : 0, duration: 0.9, ease: "power2.out" });
      });
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("click", onClick);
    return () => {
      roam.kill();
      stopVis();
      window.removeEventListener("resize", onResize);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("click", onClick);
    };
  }, []);

  /* ---------------- H1: letters near the cursor get bolder (400 → 800) and rise 3px ----------------
     The rAF loop only runs while some letter is still easing, and a letter is written to only when its
     weight moved by at least one unit — idle or far from the headline, it costs nothing. */
  useEffect(() => {
    const el = root.current;
    const head = h1.current;
    if (!el || !head || !canHover() || prefersReducedMotion()) return;
    type Ch = { el: HTMLElement; x: number; y: number; w: number; t: number; shown: number };
    let chars: Ch[] = [];
    let raf = 0;
    let px = -9999;
    let py = -9999;
    const measure = () => {
      chars = Array.from(head.querySelectorAll<HTMLElement>(`.${styles.char}`)).map((c) => {
        const r = c.getBoundingClientRect();
        return { el: c, x: r.left + r.width / 2, y: r.top + r.height / 2, w: 400, t: 400, shown: 400 };
      });
    };
    const loop = () => {
      let moving = false;
      for (const c of chars) {
        const d = Math.hypot(px - c.x, py - c.y);
        c.t = 400 + 400 * Math.max(0, 1 - d / 180);
        // rise in ~200ms, settle in ~600ms
        c.w += (c.t - c.w) * (c.t > c.w ? 0.25 : 0.08);
        if (Math.abs(c.t - c.w) > 0.5) moving = true;
        const w = Math.round(c.w);
        if (w === c.shown) continue;
        c.shown = w;
        c.el.style.fontWeight = String(w);
        c.el.style.transform = w === 400 ? "" : `translateY(${(-3 * ((w - 400) / 400)).toFixed(2)}px)`;
      }
      raf = moving ? requestAnimationFrame(loop) : 0;
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const onEnter = () => measure();
    const onMove = (e: PointerEvent) => {
      if (!chars.length) measure();
      px = e.clientX;
      py = e.clientY;
      kick();
    };
    const onLeave = () => {
      px = py = -9999;
      kick();
    };
    // positions go stale on scroll / resize — re-measure on the next move
    const invalidate = () => {
      if (chars.some((c) => c.shown !== 400)) return;
      chars = [];
    };
    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    window.addEventListener("scroll", invalidate, { passive: true });
    window.addEventListener("resize", invalidate);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("scroll", invalidate);
      window.removeEventListener("resize", invalidate);
    };
  }, []);

  const toProjects = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToTarget(lenis, "#projects", { duration: 1.2 });
  };
  const toContacts = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToTarget(lenis, "#contacts", { duration: 1.4 });
  };

  return (
    <section ref={root} id="top" className={`${styles.hero} ${service ? styles.service : ""}`} data-theme="dark" data-section aria-labelledby="hero-title">
      <div ref={glow} className={styles.glow} aria-hidden="true">
        {/* own layer for the cursor follow: the glow itself is driven by the intro and the scroll exit */}
        <div ref={follow} className={styles.follow}>
          <span />
        </div>
      </div>
      <div ref={grid} className={styles.grid} aria-hidden="true">
        {Array.from({ length: COLS_DESKTOP }, (_, i) => (
          <span key={i} className={styles.col} data-col data-mcol={i < COLS_MOBILE ? "" : undefined}>
            <span className={styles.colLight} />
          </span>
        ))}
        {Array.from({ length: COLS_DESKTOP - 1 }, (_, i) => (
          <span
            key={`l${i}`}
            className={styles.line}
            data-line
            data-mline={i < COLS_MOBILE - 1 ? "" : undefined}
            style={{ ["--i" as string]: i + 1 }}
          />
        ))}
        <span className={styles.lit} data-lit />
      </div>

      <div ref={content} className={styles.content}>
        {service ? (
          <>
            <h1 ref={h1} id="hero-title" className={`${styles.h1} ${styles.h1Service}`}>
              {service.h1.map(([text, accent], i) => (
                <span key={i} className={accent ? styles.accent : undefined}>
                  {text}
                </span>
              ))}
            </h1>
            <dl ref={sub as React.RefObject<HTMLDListElement>} className={styles.specs}>
              {service.specs.map((s) => (
                <div key={s.label} className={styles.spec} data-sub>
                  <dt className={styles.specLabel}>{s.label}</dt>
                  <dd className={styles.specValue}>{s.value}</dd>
                </div>
              ))}
            </dl>
            <div ref={ctas} className={styles.ctas}>
              <Button variant="white" size="lg" arrow={14} arrowStroke={1.4} magnet={10} onClick={service.onPrimary} className={styles.btn}>
                Обсудить задачу
              </Button>
              <Button variant="outline" size="lg" arrow={14} arrowStroke={1.4} magnet={10} onClick={service.onSecondary} className={styles.btn}>
                Рассчитать стоимость
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 ref={h1} id="hero-title" className={styles.h1}>
              Сайты, сервисы и дизайн, <span className={styles.br} aria-hidden="true" />которые приносят заявки
            </h1>
            <p ref={sub as React.RefObject<HTMLParagraphElement>} className={styles.sub}>
              <span data-sub>Kewate — студия цифровых продуктов: разработка, дизайн и маркетинг</span>{" "}
              <span data-sub>в одной команде</span>
            </p>
            <div ref={ctas} className={styles.ctas}>
              <Button href="#contacts" variant="white" size="md" magnet={10} onClick={toContacts} className={styles.btn}>
                Обсудить задачу
              </Button>
              <Button href="#projects" variant="outline" size="md" magnet={10} onClick={toProjects} className={styles.btn}>
                Смотреть проекты
              </Button>
            </div>
          </>
        )}
      </div>

      <div ref={trusted} className={styles.trusted} data-marquee>
        <p className={styles.trustedLabel}>Нам доверяют 100+ компаний</p>
        <div
          ref={vp}
          className={styles.viewport}
          data-drag
          role="region"
          aria-label="Клиенты студии"
        >
          <div ref={track} className={styles.track}>
            {[...clients, ...clients].map((c, i) => (
              <div key={i} className={styles.cell} data-cell aria-hidden={i >= clients.length ? true : undefined}>
                {c}
              </div>
            ))}
          </div>
          <span className={`${styles.fade} ${styles.fadeL}`} aria-hidden="true" />
          <span className={`${styles.fade} ${styles.fadeR}`} aria-hidden="true" />
        </div>
      </div>

      <div ref={shade} className={styles.shade} aria-hidden="true" />
    </section>
  );
}
