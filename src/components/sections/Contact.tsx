"use client";

import { useRef, useState } from "react";
import { gsap } from "@/lib/gsap";
import { contacts, legal } from "@/content/site";
import { copyToClipboard, prefersReducedMotion, toast } from "@/lib/env";
import { useCountUp, useSplitLines } from "@/components/motion/hooks";
import { expoInOut, scrollToTarget, useLenis } from "@/components/motion/SmoothScroll";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Logo } from "@/components/ui/Logo";
import { useLeadOptional } from "@/components/service/LeadContext";
import { WeekPicker } from "@/components/service/WeekPicker";
import styles from "./Contact.module.css";

const TG_RE = /^@?[a-z0-9_]{5,32}$/i;
const isValidContact = (v: string) => {
  const s = v.trim();
  if (TG_RE.test(s) && /[a-z]/i.test(s)) return true;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15 && /^[+\d\s()-]+$/.test(s);
};

type ContactProps = {
  /** left heading; the service pages use their own (205:861) */
  title?: string;
  /** footer card heading, two lines (205:904) */
  footerTitle?: [string, string];
};

export function Contact({ title: heading, footerTitle }: ContactProps = {}) {
  const lead = useLeadOptional();
  const root = useRef<HTMLElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const years = useRef<HTMLSpanElement>(null);
  const count = useRef<HTMLSpanElement>(null);
  useSplitLines(title);

  useCountUp(years, { to: 5, duration: 1.2 });
  useCountUp(count, { to: 100, duration: 1.2 });

  return (
    <section ref={root} id="contacts" className={styles.contact} data-theme="light" data-section aria-labelledby="contact-title">
      <div className={styles.bg} aria-hidden="true" />
      <div className={styles.inner} data-section-inner>
        <div className={styles.left}>
          <h2 ref={title} id="contact-title" className={styles.title}>
            {heading ?? "Расскажите о задаче — предложим решение и посчитаем цену"}
          </h2>
          <MiniForm weekPicker={!!lead} />
          <div className={styles.stats}>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Опыт работы</p>
              <p className={styles.statValue}>
                Больше <span ref={years} aria-hidden="true">0</span>
                <span className="sr-only">5</span> лет
              </p>
            </div>
            <div className={styles.stat}>
              <p className={styles.statLabel}>Проектов</p>
              <p className={styles.statValue}>
                Более <span ref={count} aria-hidden="true">0</span>
                <span className="sr-only">100</span>
              </p>
            </div>
          </div>
        </div>

        <div data-theme="dark">
          <FooterCard title={footerTitle} />
        </div>
      </div>
    </section>
  );
}

/* ----------------------------- mini form ----------------------------- */

type FormStatus = "idle" | "sending" | "sent";

/**
 * Quick request. On service pages it carries the start-week picker (274:309) and is also what the lead
 * modal shows; `demo` marks requests that came from «Получить демо».
 */
export function MiniForm({
  weekPicker = false,
  demo = false,
  topic,
  autoFocus = false,
}: {
  weekPicker?: boolean;
  demo?: boolean;
  topic?: string;
  autoFocus?: boolean;
}) {
  const lead = useLeadOptional();
  const btn = useRef<HTMLDivElement>(null);
  const confetti = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [focus, setFocus] = useState(false);
  const [status, setStatus] = useState<FormStatus>("idle");
  const valid = isValidContact(value);

  const burst = () => {
    const host = confetti.current;
    if (!host || prefersReducedMotion()) return;
    const n = 10;
    for (let i = 0; i < n; i++) {
      const s = document.createElement("span");
      s.className = styles.bit;
      host.appendChild(s);
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.1;
      const v = 90 + Math.random() * 80;
      gsap
        .timeline({ onComplete: () => s.remove() })
        .fromTo(
          s,
          { x: 0, y: 0, rotation: 0, opacity: 1, scale: 0.6 + Math.random() * 0.6 },
          {
            x: Math.cos(angle) * v,
            y: Math.sin(angle) * v,
            rotation: (Math.random() - 0.5) * 360,
            duration: 0.35,
            ease: "power2.out",
          },
        )
        .to(s, { y: `+=${70 + Math.random() * 40}`, opacity: 0, duration: 0.35, ease: "power1.in" });
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status !== "idle") return;
    setStatus("sending");
    // TODO(backend): send `value` to the CRM / mail endpoint, with the chosen start week, the topic and the demo mark
    void { contact: value, week: weekPicker ? lead?.selected : undefined, topic, demo };
    gsap.delayedCall(prefersReducedMotion() ? 0.2 : 1.1, () => {
      setStatus("sent");
      requestAnimationFrame(burst);
    });
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate aria-label="Быстрая заявка">
      <div className={styles.formTop}>
        <p className={styles.formStatus}>
          <span className={styles.pulse} aria-hidden="true" />
          Перезвоним в течение дня
        </p>
        {demo ? <span className={styles.demoTag}>получить демо</span> : <p className={styles.hours}>с 8:00 до 20:00</p>}
      </div>
      {weekPicker && lead && <WeekPicker name={autoFocus ? "modal-week" : "week"} />}
      <div className={styles.formRow}>
        <label className={styles.field} data-focus={focus ? "" : undefined}>
          <span className={styles.fieldLabel}>Telegram или телефон</span>
          <input
            className={styles.input}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            placeholder="@username"
            autoFocus={autoFocus}
            autoComplete="tel"
            inputMode="text"
            aria-invalid={value.length > 3 && !valid ? true : undefined}
            disabled={status !== "idle"}
          />
        </label>
        <div ref={btn} className={styles.sendWrap}>
          <div ref={confetti} className={styles.confetti} aria-hidden="true" />
          <button
            type="submit"
            className={`${styles.send} swap-host`}
            disabled={!valid && status === "idle"}
            data-awake={valid ? "" : undefined}
            data-status={status}
          >
            {status === "idle" && (
              <>
                <span>Обсудить задачу</span>
                <span className="swap-arrow" style={{ width: 14, height: 14 }} aria-hidden="true">
                  <Icon name="arrow-up-right" size={14} stroke={1.4} className="swap-arrow__a" />
                  <Icon name="arrow-up-right" size={14} stroke={1.4} className="swap-arrow__b" />
                </span>
              </>
            )}
            {status === "sending" && (
              <span className={styles.spinner} role="status" aria-label="Отправляем">
                <span />
              </span>
            )}
            {status === "sent" && (
              <span role="status">
                Заявка принята <Icon name="check" size={12} stroke={1.25} />
              </span>
            )}
          </button>
        </div>
      </div>
      <div className={styles.quick}>
        <a href={contacts.telegram} className={styles.quickLink} target="_blank" rel="noopener noreferrer">
          <span className={styles.quickIcon}>
            <Icon name="tg" size={16} stroke={1.4} />
          </span>
          Telegram
        </a>
        <a href={`mailto:${contacts.email}`} className={styles.quickLink}>
          <span className={styles.quickIcon}>
            <Icon name="mail" size={16} stroke={1.4} />
          </span>
          Почта
        </a>
      </div>
    </form>
  );
}

/* ----------------------------- footer card ----------------------------- */

function FooterCard({ title }: { title?: [string, string] }) {
  const lenis = useLenis();
  const lead = useLeadOptional();

  const copy = (text: string) => async () => {
    if (await copyToClipboard(text)) toast("Скопировано");
  };
  const toTop = () => {
    scrollToTarget(lenis, 0, { duration: 1.4, easing: expoInOut });
    const header = document.querySelector<HTMLElement>("header");
    if (header) header.dataset.hidden = "0";
  };
  const toContacts = (e: React.MouseEvent) => {
    e.preventDefault();
    if (lead) return lead.openLead();
    document.querySelector<HTMLInputElement>("#contacts input")?.focus({ preventScroll: true });
    scrollToTarget(lenis, "#contacts", { duration: 1 });
  };

  return (
    <footer className={styles.card}>
      <div className={styles.art} aria-hidden="true">
        {Array.from({ length: 7 }, (_, i) => (
          <span key={i} className={styles.vline} style={{ ["--i" as string]: i + 1 }} />
        ))}
        <span className={styles.lit} />
        <span className={styles.glow} />
      </div>

      <div className={styles.cardHead}>
        <p className={styles.cta}>
          {title ? title[0] : "Не визитка. Инструмент,"}
          <br className="only-desktop" /> {title ? title[1] : "который работает на вас."}
        </p>
        <p className={styles.ctaGrey}>Готовы начать?</p>
        <div className={styles.cardBtns}>
          <Button href="#contacts" variant="white" size="lg" arrow={14} arrowStroke={1.4} onClick={toContacts} className={styles.cardBtn} plain>
            Рассчитать стоимость
          </Button>
          <Button
            href={contacts.telegram}
            variant="outline"
            size="lg"
            arrow={14}
            arrowStroke={1.4}
            className={styles.cardBtn}
            plain
            external
          >
            Написать в Telegram
          </Button>
        </div>
      </div>

      <div className={styles.mark} aria-hidden="true">
        <div className={styles.logo}>
          <Logo width={736} color="#fff" title={null} />
        </div>
      </div>

      <div className={styles.info}>
        <div className={styles.cell}>
          <p className={styles.white}>Студия цифровых продуктов</p>
          <p>© 2026 Kewate</p>
        </div>
        <div className={styles.cell}>
          <button type="button" className={`${styles.white} underline`} onClick={copy(contacts.email)} aria-label={`Скопировать почту ${contacts.email}`}>
            {contacts.email}
          </button>
          <button type="button" className={`${styles.phone} underline`} onClick={copy(contacts.phone)} aria-label={`Скопировать телефон ${contacts.phone}`}>
            {contacts.phone}
          </button>
          <p>
            <a className="underline" href={contacts.telegram} target="_blank" rel="noopener noreferrer">
              Telegram
            </a>{" "}
            ·{" "}
            <a className="underline" href={contacts.vk} target="_blank" rel="noopener noreferrer">
              VK
            </a>{" "}
            ·{" "}
            <a className="underline" href={contacts.behance} target="_blank" rel="noopener noreferrer">
              Behance
            </a>
          </p>
        </div>
        <div className={styles.cell}>
          <p>{legal.owner}</p>
          <p className="only-desktop">{legal.inn}</p>
          <p className="only-desktop">{legal.ogrnip}</p>
          <p className="only-mobile">
            {legal.inn} · {legal.ogrnip}
          </p>
        </div>
        <div className={styles.cell}>
          <a href="/rekvizity" className={`underline ${styles.legalLink}`}>
            Реквизиты
          </a>
          <a href="/privacy" className="underline">
            Политика конфиденциальности
          </a>
          <button type="button" className={`${styles.top} ${styles.white}`} onClick={toTop}>
            Наверх
            <span className={styles.topArrow}>
              <Icon name="arrow-up" size={12} stroke={1.4} />
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
