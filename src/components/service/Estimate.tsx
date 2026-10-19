"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP, EASE } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/env";
import { useSplitLines } from "@/components/motion/hooks";
import { services } from "@/content/site";
import { serviceCopy, type ServicePage } from "@/content/service-shared";
import { ServiceIllustration } from "@/components/illustrations/ServiceIllustration";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { useLead } from "./LeadContext";
import styles from "./Estimate.module.css";

const rub = (n: number) => `${n.toLocaleString("ru-RU").replace(/ /g, " ")} ₽`;
const pkgLabel = (n: number | null) => `+ от ${n == null ? "[N] ₽" : rub(n)} в пакете`;

/**
 * «Что входит + часто заказывают вместе» (205:596 / 282:403).
 * A toggle adds the add-on to the receipt: a new line prints in (height 0 → 48, 350 ms power2.inOut)
 * and the total counts to the new sum (600 ms). While any price in the sum is still «[N]», the total
 * shows «[N]» too — it is never made up.
 */
export function Estimate({ page }: { page: ServicePage }) {
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const totalEl = useRef<HTMLSpanElement>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const { openLead } = useLead();
  useSplitLines(title);

  const addons = page.addons.map((a) => ({ ...a, info: services.find((s) => s.id === a.kind)! }));
  const chosen = picked.map((i) => addons[i]);
  const known = page.included.base != null && chosen.every((a) => a.pkg != null);
  const sum = known ? page.included.base! + chosen.reduce((t, a) => t + (a.pkg ?? 0), 0) : null;

  // the receipt prints line by line when it scrolls in
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      gsap.from("[data-line]", {
        opacity: 0,
        y: 8,
        duration: 0.5,
        ease: EASE.out,
        stagger: 0.06,
        scrollTrigger: { trigger: "[data-receipt]", start: "top 75%", once: true },
      });
    },
    { scope: root },
  );

  // total counter (600 ms) when the sum is a real number
  const shown = useRef<number | null>(page.included.base);
  useEffect(() => {
    const el = totalEl.current;
    if (!el) return;
    if (sum == null) {
      el.textContent = page.included.base == null ? page.included.total : "от [N] ₽";
      shown.current = null;
      return;
    }
    const from = shown.current ?? sum;
    shown.current = sum;
    if (from === sum || prefersReducedMotion()) {
      el.textContent = `от ${rub(sum)}`;
      return;
    }
    const o = { v: from };
    const tw = gsap.to(o, { v: sum, duration: 0.6, ease: "power2.out", onUpdate: () => (el.textContent = `от ${rub(Math.round(o.v / 100) * 100)}`) });
    return () => {
      tw.kill();
    };
  }, [sum, page.included]);

  const toggle = (i: number) => setPicked((p) => (p.includes(i) ? p.filter((x) => x !== i) : [...p, i]));

  return (
    <section ref={root} id="estimate" className={styles.estimate} data-theme="light" data-section aria-labelledby="estimate-title">
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.inner} data-section-inner>
        <div className={styles.head}>
          <h2 ref={title} id="estimate-title" className={styles.title}>
            {serviceCopy.includedTitle}
          </h2>
          <p className={styles.lead}>{serviceCopy.includedLead}</p>
        </div>

        <div className={styles.body}>
          <div className={styles.receipt} data-receipt>
            <p className={styles.receiptHead}>Смета Kewate</p>
            <ul className={styles.lines} aria-label="Что входит в стоимость">
              {page.included.items.map((item) => (
                <li key={item} className={styles.line} data-line>
                  <span className={styles.check} aria-hidden="true">
                    <Icon name="check" size={16} stroke={1.6} />
                  </span>
                  <span className={styles.lineText}>{item}</span>
                  <span className={styles.lineNote}>Включено</span>
                </li>
              ))}
              {chosen.map((a) => (
                <AddedLine key={a.kind} title={a.info.title} price={a.pkg == null ? "+ [N] ₽" : `+ ${rub(a.pkg)}`} />
              ))}
            </ul>
            <div className={styles.total} aria-live="polite">
              <div className={styles.totalLeft}>
                <p className={styles.totalLabel}>Стоимость</p>
                <p className={styles.totalNote}>Доплаты по ходу работы: 0 ₽</p>
              </div>
              <span ref={totalEl} className={styles.totalValue}>
                {page.included.total}
              </span>
            </div>
          </div>

          <div className={styles.side}>
            <div className={styles.sideHead}>
              <h3 className={styles.sideTitle}>{serviceCopy.addonsTitle}</h3>
              <p className={styles.sideLead}>{serviceCopy.addonsLead}</p>
            </div>
            {addons.map((a, i) => {
              const on = picked.includes(i);
              return (
                <div key={a.kind} className={styles.addon} data-on={on ? "" : undefined} onClick={() => toggle(i)}>
                  <div className={styles.thumb} aria-hidden="true">
                    <ServiceIllustration kind={a.kind} />
                  </div>
                  <div className={styles.addonText}>
                    <p className={styles.addonTitle}>{a.info.title}</p>
                    <p className={styles.addonDesc}>{a.info.desc}</p>
                    <p className={styles.prices}>
                      <span className={styles.pkg}>{pkgLabel(a.pkg)}</span>
                      <span className={styles.sep}>
                        отдельно <s>[N] ₽</s>
                      </span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className={styles.toggle}
                    aria-pressed={on}
                    aria-label={`${on ? "Убрать из сметы" : "Добавить в смету"}: ${a.info.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(i);
                    }}
                  >
                    <span className={styles.plus} aria-hidden="true" />
                  </button>
                </div>
              );
            })}
            <div className={styles.extra} data-theme="dark">
              <span className={styles.extraArt} aria-hidden="true" />
              <p className={styles.extraEyebrow}>Не нашли в списке?</p>
              <div className={styles.extraText}>
                <p className={styles.extraTitle}>Добавим нужное в смету</p>
                <p className={styles.extraDesc}>Расскажите, что ещё нужно. Посчитаем до старта и сразу покажем новую цену.</p>
              </div>
              <Button variant="white" size="sm" arrow={16} arrowStroke={1.4} className={styles.extraBtn} onClick={() => openLead({ topic: "Состав сметы" })}>
                Обсудить состав
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** a line printed into the receipt by an add-on: height 0 → 48 (350 ms power2.inOut) */
function AddedLine({ title, price }: { title: string; price: string }) {
  const el = useRef<HTMLLIElement>(null);
  useEffect(() => {
    if (!el.current || prefersReducedMotion()) return;
    gsap.fromTo(el.current, { height: 0, opacity: 0 }, { height: 48, opacity: 1, duration: 0.35, ease: "power2.inOut", clearProps: "height" });
  }, []);
  return (
    <li ref={el} className={`${styles.line} ${styles.added}`}>
      <span className={styles.check} aria-hidden="true">
        <Icon name="check" size={16} stroke={1.6} />
      </span>
      <span className={styles.lineText}>{title}</span>
      <span className={styles.lineNote}>{price}</span>
    </li>
  );
}
