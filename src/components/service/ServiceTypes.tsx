"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";
import { useSplitLines } from "@/components/motion/hooks";
import { serviceCopy, type ServicePage } from "@/content/service-shared";
import { Button } from "@/components/ui/Button";
import { useLead } from "./LeadContext";
import { Slots } from "./Slots";
import styles from "./ServiceTypes.module.css";

/** «Виды услуги» + «Свободные слоты» (205:431 / 281:411) */
export function ServiceTypes({ page }: { page: ServicePage }) {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const { openLead } = useLead();
  useSplitLines(title);

  // cards rise row by row (258:594: y 48 → 0, stagger 90 ms, 900 ms expo.out)
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const cards = gsap.utils.toArray<HTMLElement>("[data-type]", root.current);
      gsap.set(cards, { opacity: 0, y: 48 });
      ScrollTrigger.batch(cards, {
        start: "top 88%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, ease: EASE.out, stagger: 0.09 }),
      });
    },
    { scope: root },
  );

  const { cards } = page.types;
  return (
    <section ref={root} id="types" className={styles.types} data-theme="light" data-section aria-labelledby="types-title">
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.inner} data-section-inner>
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <p className="eyebrow only-desktop">{serviceCopy.typesEyebrow}</p>
            <h2 ref={title} id="types-title" className={styles.title}>
              {page.types.title}
            </h2>
          </div>
          <p className={styles.lead}>{serviceCopy.typesLead}</p>
        </div>

        <ul className={styles.cards} data-count={cards.length}>
          {cards.map((c, i) => (
            <li key={c.title} className={`${styles.card} ${i === 0 ? styles.dark : ""}`} data-type data-theme={i === 0 ? "dark" : undefined}>
              {i === 0 && <span className={styles.glow} aria-hidden="true" />}
              <div className={styles.top}>
                {c.badge && <span className={styles.badge}>{c.badge}</span>}
                <h3 className={styles.cardTitle}>{c.title}</h3>
                <p className={styles.desc}>{c.desc}</p>
              </div>
              <div className={styles.bottom}>
                <p className={styles.priceRow}>
                  <span className={styles.price}>{c.price}</span>
                  <span className={styles.term}>{c.term}</span>
                </p>
                <Button
                  variant={i === 0 ? "outline" : "white"}
                  size="lg"
                  block
                  arrow={14}
                  arrowStroke={1.4}
                  className={i === 0 ? styles.btnDark : styles.btnLight}
                  onClick={() => openLead({ topic: c.title })}
                  aria-label={`Обсудить: ${c.title}`}
                >
                  Обсудить
                </Button>
              </div>
            </li>
          ))}
        </ul>

        <Slots bonus={page.bonus} season={page.season} />
      </div>
    </section>
  );
}
