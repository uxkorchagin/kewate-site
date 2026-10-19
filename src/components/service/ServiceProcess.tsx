"use client";

import { useRef } from "react";
import { useReveal, useSplitLines } from "@/components/motion/hooks";
import { serviceCopy, type ServicePage } from "@/content/service-shared";
import { Timeline } from "@/components/sections/process/Timeline";
import styles from "./ServiceProcess.module.css";

/** «Как проходит работа» (205:649 / 282:565): four dated steps and the plan by days or weeks */
export function ServiceProcess({ page }: { page: ServicePage }) {
  const title = useRef<HTMLHeadingElement>(null);
  const steps = useRef<HTMLOListElement>(null);
  useSplitLines(title);
  useReveal(steps, { selector: "[data-step]", y: 40, stagger: 0.1 });
  const { plan } = page;

  return (
    <section id="process" className={styles.process} data-theme="dark" data-section aria-labelledby="process-title">
      <div className={styles.art} aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} className={styles.vline} style={{ ["--i" as string]: i + 1 }} />
        ))}
        <span className={styles.glow} />
      </div>
      <div className={styles.inner} data-section-inner>
        <div className={styles.head}>
          <div className={styles.headLeft}>
            <p className={`eyebrow ${styles.eyebrow}`}>Процесс</p>
            <h2 ref={title} id="process-title" className={styles.title}>
              Как проходит работа
            </h2>
          </div>
          <p className={styles.lead}>{serviceCopy.processLead}</p>
        </div>

        <ol ref={steps} className={styles.steps}>
          {page.steps.map((s, i) => (
            <li key={s.title} className={styles.step} data-step>
              <div className={styles.stepTop}>
                <span className={styles.num} aria-hidden="true">
                  {i + 1}
                </span>
                <span className={styles.badge}>{s.badge}</span>
              </div>
              <div className={styles.stepText}>
                <h3 className={styles.stepTitle}>{s.title}</h3>
                <p className={styles.stepDesc}>{s.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className={styles.planBlock}>
          <div className={styles.caption}>
            <p>{plan.caption}</p>
            <p>{serviceCopy.planNote}</p>
          </div>
          <Timeline unit={plan.unit} count={plan.count} today={plan.today} stages={plan.stages} scrub />
        </div>
      </div>
    </section>
  );
}
