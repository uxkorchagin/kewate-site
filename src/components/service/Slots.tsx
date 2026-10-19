"use client";

import { useEffect, useRef } from "react";
import { countdown } from "@/lib/slots";
import { serviceCopy } from "@/content/service-shared";
import { Button } from "@/components/ui/Button";
import { useLead } from "./LeadContext";
import styles from "./Slots.module.css";

/**
 * «Свободные слоты» (215:312): the nearest start, a countdown to Friday 23:59 MSK before it, the five
 * week calendar, the booking bonus and the season note. Everything comes from lib/slots via the lead
 * context, so it moves on by itself every Monday and when the deadline passes. Changed digits flip (300 ms).
 */
export function Slots({ bonus, season }: { bonus: string; season: [string, string] }) {
  const { now, ready, slots, nearest, openLead } = useLead();
  const cal = useRef<HTMLUListElement>(null);
  const t = countdown(now, slots.deadline);

  // mobile: the calendar strip starts at the nearest week, past ones stay to the left
  useEffect(() => {
    const el = cal.current;
    if (!el || el.scrollWidth <= el.clientWidth) return;
    const first = el.children[0] as HTMLElement | undefined;
    const card = el.children[Math.max(0, slots.nearest)] as HTMLElement | undefined;
    if (card && first) el.scrollLeft = card.offsetLeft - first.offsetLeft;
  }, [slots.nearest]);

  return (
    <div id="slots" className={styles.slots} data-theme="dark" data-slots data-ready={ready ? "" : undefined}>
      <div className={styles.art} aria-hidden="true">
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i} className={styles.vline} style={{ ["--i" as string]: i }} />
        ))}
        <span className={styles.glow} />
      </div>

      <div className={styles.left}>
        <p className={styles.eyebrow}>{serviceCopy.slotsEyebrow}</p>
        <h3 className={styles.title}>
          Ближайший старт:
          <br />
          {nearest?.full}
        </h3>
        <p className={`${styles.label} ${styles.deskOnly}`}>Приём заявок на неделю {nearest?.short} закрывается через</p>
        <div className={`${styles.timerRow} ${styles.deskOnly}`}>
          <Timer d={t.d} h={t.h} m={t.m} />
          <Button variant="mint" size="sm" arrow={14} arrowStroke={1.4} className={styles.cta} onClick={() => openLead({ week: nearest?.key })}>
            Занять слот
          </Button>
        </div>
      </div>

      <div className={styles.right}>
        <ul ref={cal} className={styles.calendar} aria-label="Свободные недели">
          {slots.weeks.map((w, i) => {
            const state = w.status === "busy" ? "busy" : i === slots.nearest ? "current" : w.status;
            const body = (
              <>
                <span className={styles.cap}>{w.caption}</span>
                <span className={styles.range}>
                  <Flip value={w.range} />
                </span>
                <span className={styles.seats}>
                  <Flip value={w.label} />
                </span>
              </>
            );
            return (
              <li key={w.key} className={styles.slot} data-state={state}>
                {w.status === "busy" ? (
                  <div className={styles.slotIn}>{body}</div>
                ) : (
                  <button type="button" className={styles.slotIn} onClick={() => openLead({ week: w.key })}>
                    {body}
                    <span className="sr-only"> — выбрать эту неделю старта</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <div className={styles.notes}>
          <p>
            {serviceCopy.bonusLead}
            <span className={styles.hl}>{bonus}</span>
          </p>
          <p>
            {season[0]}
            <span className={styles.hl}>{season[1]}</span>
          </p>
        </div>
      </div>

      {/* mobile order (281:411): label → timer → full-width button after the notes */}
      <div className={styles.mobileTail}>
        <p className={styles.label}>Приём заявок на неделю {nearest?.short} закрывается через</p>
        <div className={styles.timerRow}>
          <Timer d={t.d} h={t.h} m={t.m} />
        </div>
        <Button variant="mint" size="lg" arrow={14} arrowStroke={1.4} block className={styles.ctaWide} onClick={() => openLead({ week: nearest?.key })}>
          Занять слот
        </Button>
      </div>
    </div>
  );
}

function Timer({ d, h, m }: { d: number; h: number; m: number }) {
  return (
    <p className={styles.timer} role="timer" aria-live="off">
      <span className="sr-only">
        {d} дн {h} ч {m} мин
      </span>
      {(
        [
          [d, "дн"],
          [h, "ч"],
          [m, "мин"],
        ] as const
      ).map(([v, u]) => (
        <span key={u} className={styles.cell} aria-hidden="true">
          <span className={styles.num}>
            <Flip value={String(v)} />
          </span>
          <span className={styles.unit}>{u}</span>
        </span>
      ))}
    </p>
  );
}

/** text that flips in when it changes (215:319 — «смена цифр — flip 300 мс») */
function Flip({ value }: { value: string }) {
  return (
    <span key={value} className={styles.flip}>
      {value}
    </span>
  );
}
