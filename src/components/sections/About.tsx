"use client";

import { useRef } from "react";
import { gsap, useGSAP, EASE } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";
import { useReveal, useCountUp } from "@/components/motion/hooks";
import { Icon } from "@/components/ui/Icon";
import { TagCloud } from "./about/TagCloud";
import { VideoReview } from "./about/VideoReview";
import styles from "./About.module.css";

const STATEMENT: { text: string; tail?: boolean; icon?: "arrow" | "ruble"; br?: boolean }[] = [
  { text: "Kewate создаёт цифровые продукты,", br: true },
  { text: "которые продают", icon: "arrow", br: true },
  { text: "и" },
  { text: "окупаются быстрее", tail: true, icon: "ruble" },
];

/** `tight`: service pages (258:573) — no bottom padding, the next section brings its own */
export function About({ tight = false }: { tight?: boolean } = {}) {
  const root = useRef<HTMLElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  const statement = useRef<HTMLHeadingElement>(null);
  const cards = useRef<HTMLDivElement>(null);

  useReveal(cards, { selector: "[data-card]", y: 48, stagger: 0.09 });

  useGSAP(
    () => {
      const st = statement.current!;
      const words = gsap.utils.toArray<HTMLElement>("[data-word]", st);
      const tail = gsap.utils.toArray<HTMLElement>("[data-tail]", st);
      const icons = gsap.utils.toArray<HTMLElement>("[data-icon]", st);
      if (prefersReducedMotion()) return;

      // label types itself, 30ms per character
      const lab = label.current!;
      const full = lab.textContent ?? "";
      const typing = { n: 0 };
      lab.textContent = "";
      gsap.to(typing, {
        n: full.length,
        duration: full.length * 0.03,
        ease: "none",
        scrollTrigger: { trigger: root.current, start: "top 75%", once: true },
        onUpdate: () => (lab.textContent = full.slice(0, Math.round(typing.n))),
      });

      // words go grey → ink with scroll; the tail waits until the very end, then flashes
      gsap.set([words, tail], { color: "#8e8e96" });
      gsap.set(icons, { scale: 0 });
      const tl = gsap.timeline({
        scrollTrigger: { trigger: st, start: "top 80%", end: "bottom 40%", scrub: true },
      });
      tl.to(words, { color: "#18181b", stagger: 0.12, duration: 0.3, ease: "none" });
      icons.slice(0, -1).forEach((icon) => {
        const at = Number(icon.dataset.at ?? 0) * 0.12;
        tl.add(() => {
          const forward = tl.scrollTrigger ? tl.scrollTrigger.direction > 0 : true;
          gsap.to(icon, { scale: forward ? 1 : 0, duration: 0.5, ease: forward ? EASE.back : "power2.in", overwrite: true });
        }, at);
      });
      tl.to(tail, { color: "var(--tail)", duration: 0.25, ease: "power2.out" }, ">");
      tl.add(() => {
        const icon = icons[icons.length - 1];
        const forward = tl.scrollTrigger ? tl.scrollTrigger.direction > 0 : true;
        gsap.to(icon, { scale: forward ? 1 : 0, duration: 0.5, ease: forward ? EASE.back : "power2.in", overwrite: true });
      }, ">-0.1");
    },
    { scope: root },
  );

  let wordIndex = 0;

  return (
    <section ref={root} id="about" className={`${styles.about} ${tight ? styles.tight : ""}`} data-theme="light" data-section aria-labelledby="about-title">
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.inner} data-section-inner>
        <div className={styles.head}>
          <p className={styles.labelCol}>
            <span className="eyebrow">
              <span ref={label}>О студии</span>
            </span>
          </p>
          <h2 ref={statement} id="about-title" className={styles.statement}>
            {STATEMENT.map((part, pi) => {
              const words = part.text.split(" ");
              const nodes = words.map((w, i) => {
                const idx = wordIndex++;
                return (
                  <span key={`${pi}-${i}`} data-word={part.tail ? undefined : idx} data-tail={part.tail ? "" : undefined} className={part.tail ? styles.tail : undefined}>
                    {w}
                    {i < words.length - 1 ? " " : ""}
                  </span>
                );
              });
              return (
                <span key={pi} className={styles.part}>
                  {nodes}
                  {part.icon && (
                    <>
                      {" "}
                      <StatementIcon kind={part.icon} at={wordIndex - 1} />
                    </>
                  )}
                  {" "}
                  {part.br && <br className="only-desktop" />}
                </span>
              );
            })}
          </h2>
        </div>

        <div ref={cards} className={styles.cards}>
          <YearsCard />
          <CountCard />
          <div data-card className={styles.cardWrap}>
            <VideoReview />
          </div>
          <ProfitCard />
        </div>
      </div>
      <div className={styles.shade} data-section-shade aria-hidden="true" />
    </section>
  );
}

function StatementIcon({ kind, at }: { kind: "arrow" | "ruble"; at: number }) {
  return (
    <span className={`${styles.icon} ${kind === "arrow" ? styles.iconMint : styles.iconInk} only-desktop`} data-icon data-at={at} aria-hidden="true">
      {kind === "arrow" ? (
        <span className={styles.iconArrow}>
          <Icon name="arrow-up-right" size={21} stroke={1.9} />
        </span>
      ) : (
        <span className={styles.coin}>
          <Icon name="ruble" size={23} stroke={2.1} />
        </span>
      )}
    </span>
  );
}

/* ----------------------------- cards ----------------------------- */

function useCard() {
  return useRef<HTMLDivElement>(null);
}

function YearsCard() {
  const ref = useCard();
  return (
    <div ref={ref} data-card className={`${styles.card} ${styles.white} ${styles.years}`}>
      <span className={styles.light} aria-hidden="true" />
      <TagCloud className="only-desktop" />
      <div className={styles.stat}>
        <p className={styles.caption}>
          <span className="only-desktop">Создаём сайты</span>
          <span className="only-mobile">Создаём сайты более</span>
        </p>
        <p className={styles.big}>
          <span className="only-desktop">{"> 5 лет"}</span>
          <span className="only-mobile">5 лет</span>
        </p>
      </div>
    </div>
  );
}

function CountCard() {
  const ref = useCard();
  const num = useRef<HTMLSpanElement>(null);
  const plus = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    if (!prefersReducedMotion()) gsap.set(plus.current, { opacity: 0 });
  });
  useCountUp(num, {
    to: 100,
    duration: 1.8,
    onComplete: () => gsap.to(plus.current, { opacity: 1, duration: 0.3 }),
  });
  return (
    <div ref={ref} data-card className={`${styles.card} ${styles.mint}`}>
      <span className={styles.light} aria-hidden="true" />
      <div className={styles.stat}>
        <p className={styles.caption}>Реализовали</p>
        <p className={`${styles.big} ${styles.huge}`}>
          <span className="sr-only">100+</span>
          {/* the final value reserves the width, so the count-up never shifts the line */}
          <span className={styles.count} data-final="100" aria-hidden="true">
            <span ref={num}>0</span>
          </span>
          <span ref={plus} className={styles.plus} aria-hidden="true">
            +
          </span>
        </p>
      </div>
      <p className={`${styles.note} only-desktop`}>
        Сайтов, сервисов и дизайн-проектов
        <br />
        для малого и среднего бизнеса
      </p>
    </div>
  );
}

function ProfitCard() {
  const ref = useCard();
  const num = useRef<HTMLSpanElement>(null);
  const unit = useRef<HTMLSpanElement>(null);
  useGSAP(() => {
    if (!prefersReducedMotion()) gsap.set(unit.current, { opacity: 0 });
  });
  useCountUp(num, {
    to: 80,
    duration: 2,
    onComplete: () => gsap.to(unit.current, { opacity: 1, duration: 0.4 }),
  });
  return (
    <div ref={ref} data-card className={`${styles.card} ${styles.white} ${styles.profit}`}>
      <span className={styles.light} aria-hidden="true" />
      <div className={styles.stat}>
        <p className={styles.caption}>Принесли клиентам</p>
        <p className={`${styles.big} ${styles.mid}`}>
          <span className="sr-only">80 млн ₽</span>
          {/* the final value reserves the width, so the count-up never shifts the line */}
          <span className={styles.count} data-final="80" aria-hidden="true">
            <span ref={num}>0</span>
          </span>
          <span ref={unit} aria-hidden="true">
            {" "}
            млн ₽
          </span>
        </p>
        <svg className={styles.growth} viewBox="0 0 240 40" preserveAspectRatio="none" aria-hidden="true">
          <path d="M1 38 C 40 36, 60 30, 90 27 S 140 20, 165 14 S 215 5, 239 2" pathLength={1} />
        </svg>
      </div>
      <p className={styles.note}>Прибыли за всё время работы студии</p>
    </div>
  );
}
