"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { methods, timeline } from "@/content/site";
import { canHover, prefersReducedMotion, whenVisible } from "@/lib/env";
import { useReveal, useSplitLines } from "@/components/motion/hooks";
import { Timeline } from "./process/Timeline";
import styles from "./Process.module.css";


export function Process() {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const methodsRef = useRef<HTMLDivElement>(null);
  const resp = useRef<HTMLDivElement>(null);

  useSplitLines(title);
  useReveal(methodsRef, { selector: "[data-method]", y: 40, stagger: 0.1 });
  useReveal(resp, { selector: "[data-resp]", y: 40, stagger: 0.1 });

  // mint digits are drawn by their outline, then filled
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const digits = gsap.utils.toArray<SVGTextElement>("[data-digit]", root.current);
      gsap.set(digits, { strokeDasharray: 200, strokeDashoffset: 200, fillOpacity: 0 });
      gsap
        .timeline({ scrollTrigger: { trigger: methodsRef.current, start: "top 80%", once: true } })
        .to(digits, { strokeDashoffset: 0, duration: 0.8, ease: "power2.inOut", stagger: 0.1 }, 0.2)
        .to(digits, { fillOpacity: 1, duration: 0.4, stagger: 0.1 }, 0.8);
    },
    { scope: root },
  );

  return (
    <section ref={root} id="process" className={styles.process} data-theme="dark" data-section data-seamless aria-labelledby="process-title">
      <div className={styles.inner} data-section-inner>
        <div className={styles.head}>
          <p className="eyebrow only-mobile">Процесс</p>
          <h2 ref={title} id="process-title" className={styles.title}>
            Как мы работаем — по шагам
          </h2>
          <p className={styles.lead}>
            <span>Каждый проект идёт по плану с датами — вы видите, на каком он этапе.</span>{" "}
            <span>Ниже пример: лендинг за 2 недели.</span>
          </p>
        </div>

        <div ref={methodsRef} className={styles.methods}>
          {methods.map((m, i) => (
            <MethodCard key={m.title} n={i + 1} title={m.title} text={m.text} />
          ))}
        </div>

        <Timeline unit="Д" count={timeline.days} today={timeline.today} stages={timeline.stages} scrub />

        <h3 className={styles.sub}>У нас есть проектная ответственность</h3>
        <div ref={resp} className={styles.resp}>
          <CanvasCard />
          <ClockCard />
        </div>
      </div>
    </section>
  );
}

function MethodCard({ n, title, text }: { n: number; title: string; text: string }) {
  return (
    <div className={styles.method} data-method>
      <span className={styles.digit} aria-hidden="true">
        <svg viewBox="0 0 40 48" width="40" height="48" overflow="visible">
          <text data-digit x="0" y="42" className={styles.digitText}>
            {n}
          </text>
        </svg>
      </span>
      <span className="sr-only">Шаг {n}.</span>
      <div className={styles.methodText}>
        <h3 className={styles.methodTitle}>{title}</h3>
        <p className={styles.methodDesc}>{text}</p>
      </div>
    </div>
  );
}

/* ----------------------------- responsibility cards ----------------------------- */

const PATH = [
  { x: 90, y: 62 },
  { x: 40, y: 20 },
  { x: 120, y: 30 },
  { x: 60, y: 78 },
  { x: 90, y: 62 },
];

function CanvasCard() {
  const card = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const nikita = useRef<HTMLDivElement>(null);
  const you = useRef<HTMLDivElement>(null);
  const block = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const n = nikita.current!;
      if (prefersReducedMotion()) return;
      const tl = gsap.timeline({ repeat: -1, defaults: { ease: "sine.inOut" } });
      tl.to(n, { x: PATH[1].x - PATH[0].x, y: PATH[1].y - PATH[0].y, duration: 1.4 })
        .to(n, { x: PATH[2].x - PATH[0].x, y: PATH[2].y - PATH[0].y, duration: 1.2 })
        .to(n, { x: PATH[3].x - PATH[0].x, y: PATH[3].y - PATH[0].y, duration: 1.3 })
        .to(n.querySelector("svg"), { scale: 0.85, duration: 0.08, yoyo: true, repeat: 1, transformOrigin: "0 0" })
        .call(() => block.current?.setAttribute("data-sel", ""))
        .to(n, { x: 0, y: 0, duration: 1.3 }, "+=0.3")
        .call(() => block.current?.removeAttribute("data-sel"), [], "+=0.3");
      const stop = whenVisible(card.current!, (v) => (v ? tl.play() : tl.pause()));
      return () => stop();
    },
    { scope: card },
  );

  // «Вы» mirrors the real cursor inside the mini canvas
  useEffect(() => {
    const c = card.current;
    const cv = canvas.current;
    const y = you.current;
    if (!c || !cv || !y || !canHover()) return;
    const xTo = gsap.quickTo(y, "x", { duration: 0.3, ease: "power3.out" });
    const yTo = gsap.quickTo(y, "y", { duration: 0.3, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      xTo(((e.clientX - r.left) / r.width) * (cv.clientWidth - 20));
      yTo(((e.clientY - r.top) / r.height) * (cv.clientHeight - 24));
    };
    const enter = () => gsap.to(y, { opacity: 1, duration: 0.2 });
    const leave = () => gsap.to(y, { opacity: 0, duration: 0.2 });
    c.addEventListener("pointermove", move);
    c.addEventListener("pointerenter", enter);
    c.addEventListener("pointerleave", leave);
    return () => {
      c.removeEventListener("pointermove", move);
      c.removeEventListener("pointerenter", enter);
      c.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <div ref={card} className={`${styles.respCard} ${styles.dark}`} data-resp>
      <div className={styles.respText}>
        <p className={styles.respTitle}>Доступ к проектному файлу</p>
        <p className={styles.respDesc}>Смотрите результаты работы прямо в Figma — в любой момент.</p>
      </div>
      <div ref={canvas} className={styles.canvas} aria-hidden="true">
        <span className={styles.cr} style={{ left: 13, top: 13, width: 100, height: 8 }} />
        <span className={styles.cr} style={{ left: 13, top: 29, width: 60, height: 8 }} />
        <span ref={block} className={`${styles.cr} ${styles.block}`} style={{ left: 13, top: 51, width: 152, height: 50 }} />
        <div ref={nikita} className={styles.cursor} style={{ left: PATH[0].x, top: PATH[0].y }}>
          <CursorIcon color="#6aeec7" />
          <span className={styles.tag}>Никита</span>
        </div>
        <div ref={you} className={styles.cursor} style={{ left: 0, top: 0, opacity: 0 }}>
          <CursorIcon color="#fff" />
          <span className={`${styles.tag} ${styles.tagYou}`}>Вы</span>
        </div>
      </div>
    </div>
  );
}

function CursorIcon({ color }: { color: string }) {
  return (
    <svg width="13" height="18" viewBox="0 0 13 18.0001" overflow="visible">
      <path d="M0.5 0.500006V15.5L4.5 11.5L7.5 17.5L10 16.5L7 10.5H12.5L0.5 0.500006Z" fill={color} stroke="#09090B" strokeLinejoin="round" />
    </svg>
  );
}

/** Real Moscow time; colon blinks; minutes roll; 23:00–7:00 → «Дежурная поддержка». */
function ClockCard() {
  const [now, setNow] = useState<{ h: string; m: string; night: boolean } | null>(null);
  useEffect(() => {
    const fmt = new Intl.DateTimeFormat("ru-RU", { timeZone: "Europe/Moscow", hour: "2-digit", minute: "2-digit", hour12: false });
    const update = () => {
      const parts = fmt.formatToParts(new Date());
      const h = parts.find((p) => p.type === "hour")?.value ?? "00";
      const m = parts.find((p) => p.type === "minute")?.value ?? "00";
      const hour = Number(h);
      setNow({ h, m, night: hour >= 23 || hour < 7 });
    };
    update();
    const id = setInterval(update, 1000 * 5);
    return () => clearInterval(id);
  }, []);
  const h = now?.h ?? "14";
  const m = now?.m ?? "32";
  return (
    <div className={`${styles.respCard} ${styles.light2}`} data-resp>
      <div className={styles.respText}>
        <p className={`${styles.respTitle} ${styles.ink}`}>Мы на связи с 7:00 до 23:00</p>
        <p className={styles.respDesc}>А служба поддержки сайтов работает даже ночью =)</p>
      </div>
      <div className={styles.clock} data-night={now?.night ? "" : undefined}>
        <p className={styles.time} data-clock>
          <span className="sr-only">
            Сейчас в Москве {h}:{m}
          </span>
          <span aria-hidden="true">{h}</span>
          <span className={styles.colon} aria-hidden="true">
            :
          </span>
          <span className={styles.minutes} aria-hidden="true">
            <span key={m} className={styles.minuteRoll}>
              {m}
            </span>
          </span>
        </p>
        <p className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          {now?.night ? "Дежурная поддержка" : "Онлайн"}
        </p>
      </div>
    </div>
  );
}

