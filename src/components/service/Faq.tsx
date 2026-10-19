"use client";

import { useEffect, useId, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";
import { useSplitLines } from "@/components/motion/hooks";
import { contacts } from "@/content/site";
import { serviceCopy } from "@/content/service-shared";
import { Button } from "@/components/ui/Button";
import styles from "./Faq.module.css";

/** Moscow time 7:00–23:00 → online (260:311 «status live by Moscow time») */
const onlineNow = () => {
  const h = new Date(Date.now() + 3 * 3_600_000).getUTCHours();
  return h >= 7 && h < 23;
};

/**
 * «Частые вопросы» (205:690 / 282:700). One item open at a time: the answer opens 0 → auto
 * (400 ms power2.inOut), its text fades in from y 8 after 80 ms; the plus turns 90° into a minus.
 * The FAQPage JSON-LD is emitted by the page.
 */
export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const title = useRef<HTMLHeadingElement>(null);
  const [open, setOpen] = useState(0);
  const [online, setOnline] = useState<boolean | null>(null);
  const uid = useId();
  useSplitLines(title);

  useEffect(() => {
    setOnline(onlineNow());
    const id = setInterval(() => setOnline(onlineNow()), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <section id="faq" className={styles.faq} data-theme="light" data-section aria-labelledby="faq-title">
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.inner} data-section-inner>
        <div className={styles.left}>
          <h2 ref={title} id="faq-title" className={styles.title}>
            Частые вопросы
          </h2>
          <p className={styles.lead}>{serviceCopy.faqLead}</p>
          <div className={styles.ask} data-theme="dark">
            <span className={styles.askArt} aria-hidden="true" />
            <p className={styles.askStatus}>
              <span className={styles.dot} data-online={online ? "" : undefined} aria-hidden="true" />
              На связи с 7:00 до 23:00
            </p>
            <p className={styles.askTitle}>Не нашли свой вопрос?</p>
            <p className={styles.askText}>Напишите в Telegram, позвоните или отправьте письмо. Ответим на любой вопрос о проекте.</p>
            <Button href={contacts.telegram} external variant="white" size="sm" arrow={16} arrowStroke={1.4} className={styles.askBtn}>
              Задать вопрос
            </Button>
          </div>
        </div>

        <ol className={styles.list}>
          {items.map((it, i) => (
            <Item
              key={it.q}
              n={i + 1}
              q={it.q}
              a={it.a}
              open={open === i}
              id={`${uid}-${i}`}
              onToggle={() => setOpen((o) => (o === i ? -1 : i))}
            />
          ))}
        </ol>
      </div>
    </section>
  );
}

function Item({ n, q, a, open, id, onToggle }: { n: number; q: string; a: string; open: boolean; id: string; onToggle: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLParagraphElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const p = panel.current;
    const t = text.current;
    if (!p || !t) return;
    if (first.current || prefersReducedMotion()) {
      first.current = false;
      gsap.set(p, { height: open ? "auto" : 0 });
      gsap.set(t, { opacity: open ? 1 : 0, y: 0 });
      return;
    }
    if (open) {
      gsap.fromTo(p, { height: 0 }, { height: "auto", duration: 0.4, ease: "power2.inOut", overwrite: true });
      gsap.fromTo(t, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.08, ease: "power2.out", overwrite: true });
    } else {
      gsap.to(p, { height: 0, duration: 0.4, ease: "power2.inOut", overwrite: true });
      gsap.to(t, { opacity: 0, duration: 0.2, overwrite: true });
    }
  }, [open]);

  return (
    <li className={styles.item} data-open={open ? "" : undefined}>
      <h3 className={styles.qWrap}>
        <button type="button" className={styles.q} aria-expanded={open} aria-controls={`${id}-a`} id={`${id}-q`} onClick={onToggle}>
          <span className={styles.n}>{n}</span>
          <span className={styles.qText}>{q}</span>
          <span className={styles.toggle} aria-hidden="true">
            <span className={styles.bar} />
            <span className={`${styles.bar} ${styles.barV}`} />
          </span>
        </button>
      </h3>
      <div ref={panel} id={`${id}-a`} role="region" aria-labelledby={`${id}-q`} className={styles.panel}>
        <p ref={text} className={styles.a}>
          {a}
        </p>
      </div>
    </li>
  );
}
