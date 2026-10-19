"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE } from "@/lib/gsap";
import { serviceCategories, services, type ServiceCategory } from "@/content/site";
import { prefersReducedMotion } from "@/lib/env";
import { useIllustrationScale, useSplitLines } from "@/components/motion/hooks";
import { scrollToTarget, useLenis } from "@/components/motion/SmoothScroll";
import { ServiceIllustration } from "@/components/illustrations/ServiceIllustration";
import { Button } from "@/components/ui/Button";
import { SwapArrow } from "@/components/ui/Icon";
import styles from "./Services.module.css";

type Cat = "all" | ServiceCategory;

export function Services() {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const lenis = useLenis();
  const [cat, setCat] = useState<Cat>("all");

  useSplitLines(title);

  // the grey second title line inks up mid-scroll and greys again
  useGSAP(
    () => {
      const second = title.current?.querySelector<HTMLElement>("[data-second]");
      if (!second || prefersReducedMotion()) return;
      gsap
        .timeline({ scrollTrigger: { trigger: title.current, start: "top 75%", end: "bottom 15%", scrub: true } })
        .to(second, { color: "#18181b", ease: "none", duration: 1 })
        .to(second, { color: "#8e8e96", ease: "none", duration: 1 });

      // cards rise row by row
      const cards = gsap.utils.toArray<HTMLElement>("[data-service]", grid.current);
      gsap.set(cards, { opacity: 0, y: 40 });
      ScrollTrigger.batch(cards, {
        start: "top 88%",
        once: true,
        onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: EASE.out, stagger: 0.06 }),
      });
    },
    { scope: root },
  );

  // switching a category swaps the cards instantly — no FLIP, the CTA tile stays put
  const choose = (c: Cat) => {
    if (c === cat) return;
    setCat(c);
    if (grid.current && grid.current.getBoundingClientRect().top < 0) scrollToTarget(lenis, grid.current, { offset: -120, duration: 0.8 });
  };
  const firstCatRun = useRef(true);
  useEffect(() => {
    if (firstCatRun.current) {
      firstCatRun.current = false;
      return;
    }
    // cards that had not risen yet must not stay hidden after the swap
    const cards = grid.current?.querySelectorAll("[data-service]");
    if (cards?.length) gsap.set(cards, { opacity: 1, y: 0 });
    ScrollTrigger.refresh();
  }, [cat]);

  const shown = services.filter((s) => cat === "all" || s.category === cat);
  const toContacts = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToTarget(lenis, "#contacts", { duration: 1.2 });
  };

  return (
    <section ref={root} id="services" className={styles.services} data-theme="light" data-section aria-labelledby="services-title">
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.inner} data-section-inner>
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <p className="eyebrow">Услуги · 8 направлений</p>
            <h2 ref={title} id="services-title" className={styles.title}>
              <span>Всё для роста бизнеса</span> <span data-second className={styles.second}>в digital — в одной команде</span>
            </h2>
          </div>
          <p className={styles.lead}>Сайты, магазины, приложения, сервисы, дизайн и реклама</p>
        </div>

        <div className={styles.body}>
          <aside className={styles.side}>
            <div className={styles.cats} role="group" aria-label="Категории услуг">
              {serviceCategories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={styles.cat}
                  aria-pressed={cat === c.id}
                  aria-controls="services-grid"
                  onClick={() => choose(c.id)}
                >
                  <span className={`${styles.catLabel} only-desktop`}>{c.label}</span>
                  <span className={`${styles.catLabel} only-mobile`}>
                    {c.id === "all" ? "Все" : c.label} · {c.count}
                  </span>
                  <span className={`${styles.catCount} only-desktop`}>{c.count}</span>
                </button>
              ))}
            </div>
            <Promo className="only-desktop" onClick={toContacts} />
          </aside>

          <div ref={grid} id="services-grid" className={styles.grid} aria-live="polite">
            {shown.map((s) => (
              <ServiceCard key={s.id} service={s} />
            ))}
            <CtaTile onClick={toContacts} />
            <Promo className="only-mobile" onClick={toContacts} />
          </div>
        </div>
      </div>
      <div className={styles.shade} data-section-shade aria-hidden="true" />
    </section>
  );
}

function ServiceCard({ service: s }: { service: (typeof services)[number] }) {
  const ill = useRef<HTMLDivElement>(null);
  useIllustrationScale(ill);
  return (
    <Link href={s.href} prefetch={false} className={`${styles.card} swap-host`} data-service>
      <div ref={ill} className={styles.ill}>
        <ServiceIllustration kind={s.id} />
      </div>
      <div className={styles.text}>
        <h3 className={styles.cardTitle}>{s.title}</h3>
        <p className={styles.desc}>{s.desc}</p>
      </div>
      <div className={styles.price}>
        <span className={styles.priceText}>{s.price}</span>
        <SwapArrow size={14} stroke={1.4} className={styles.priceArrow} />
      </div>
    </Link>
  );
}

function CtaTile({ onClick }: { onClick: (e: React.MouseEvent) => void }) {
  return (
    <div className={styles.cta}>
      <span className={styles.grain} aria-hidden="true" />
      <span className={styles.ctaGlow} aria-hidden="true" />
      <div className={styles.ctaText}>
        <p className={styles.ctaTitle}>Нужно несколько направлений сразу?</p>
        <p className={styles.ctaDesc}>Соберём сайт, дизайн и рекламу в один проект с одним сроком и одной ценой в договоре.</p>
      </div>
      <Button href="#contacts" variant="mint" block size="sm" arrow={12} className={styles.ctaBtn} onClick={onClick}>
        Рассчитать комплекс
      </Button>
    </div>
  );
}

function Promo({ className, onClick }: { className?: string; onClick: (e: React.MouseEvent) => void }) {
  return (
    <div className={`${styles.promo} ${className ?? ""}`}>
      <div className={styles.promoText}>
        <p className={styles.promoTitle}>Не нашли нужное?</p>
        <p className={styles.promoDesc}>Расскажите о задаче — соберём команду и посчитаем цену до старта.</p>
      </div>
      <Button href="#contacts" variant="dark" block size="sm" arrow={12} className={styles.promoBtn} onClick={onClick}>
        Обсудить задачу
      </Button>
    </div>
  );
}
