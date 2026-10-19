"use client";

import { useRef, useState } from "react";
import { gsap, ScrollTrigger, useGSAP, EASE } from "@/lib/gsap";
import { checklist as homeChecklist } from "@/content/site";
import { prefersReducedMotion, whenVisible } from "@/lib/env";
import { splitLines } from "@/components/motion/hooks";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import styles from "./Audit.module.css";

const URL_RE = /^(https?:\/\/)?([a-zа-яё0-9-]+\.)+[a-zа-яё]{2,}(:\d+)?(\/\S*)?$/i;

type Status = "idle" | "scanning" | "done";

type AuditContent = { title: string; desc: string; items: string[]; placeholder: string };

/** «Бесплатный разбор» (181:1253); service pages pass their own copy (205:733). */
export function Audit({ content }: { content?: AuditContent } = {}) {
  const checklist = content?.items ?? homeChecklist;
  const root = useRef<HTMLElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const scan = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLSpanElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const list = useRef<HTMLOListElement>(null);
  const [checked, setChecked] = useState(1);

  useGSAP(
    () => {
      const sec = root.current!;
      const reduced = prefersReducedMotion();
      if (reduced) {
        setChecked(checklist.length);
        return;
      }
      // badge pops first, title lines rise, «мешает» glitches once
      gsap.from(badge.current, {
        scale: 0.6,
        opacity: 0,
        duration: 0.6,
        ease: EASE.back,
        scrollTrigger: { trigger: sec, start: "top 70%", once: true },
      });
      const split = splitLines(title.current!);
      gsap.from(split.lines, {
        yPercent: 110,
        duration: 1,
        ease: EASE.out,
        stagger: 0.08,
        delay: 0.15,
        scrollTrigger: { trigger: sec, start: "top 70%", once: true },
        onComplete: () => title.current?.querySelector("[data-glitch]")?.setAttribute("data-on", ""),
      });

      // entry scan: one pass over the whole section (1.6s) ticks the checklist
      const sh = () => sec.offsetHeight;
      const entry = gsap.timeline({
        paused: true,
        onComplete: () => loop.play(),
      });
      entry.fromTo(scan.current, { y: -160 }, { y: () => sh(), duration: 1.6, ease: "power1.inOut" });
      const items = checklist.length;
      for (let i = 1; i < items; i++) entry.add(() => setChecked((c) => Math.max(c, i + 1)), 0.35 + i * 0.25);

      // idle loop: 4s sine.inOut, 1.5s pause
      const loop = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 1.5 });
      loop.fromTo(scan.current, { y: -160 }, { y: () => sh(), duration: 4, ease: "sine.inOut" });

      ScrollTrigger.create({ trigger: sec, start: "top 60%", once: true, onEnter: () => entry.play() });
      const stop = whenVisible(sec, (v) => {
        if (!v) loop.pause();
        else if (entry.progress() === 1) loop.play();
      });

      return () => {
        stop();
        split.revert();
      };
    },
    { scope: root },
  );

  return (
    <section ref={root} id="audit" className={styles.audit} data-theme="dark" data-section aria-labelledby="audit-title">
      <div ref={bg} className={styles.bg} aria-hidden="true">
        <div className={styles.glow} />
        {Array.from({ length: 11 }, (_, i) => (
          <span key={i} className={styles.vline} style={{ ["--i" as string]: i + 1 }} />
        ))}
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className={styles.hline} style={{ top: i * 120 }} />
        ))}
        <span className={styles.litCell} />
        <div ref={scan} className={styles.scan}>
          <span className={styles.band} />
          <span className={styles.line} />
        </div>
      </div>

      <div className={styles.inner} data-section-inner>
        <div className={styles.copy}>
          <span ref={badge} className={styles.badge}>
            Бесплатно
          </span>
          <h2 ref={title} id="audit-title" className={styles.title}>
            {content ? (
              content.title
            ) : (
              <>
                Уже есть сайт или продукт? Покажем, что{" "}
                <span className={styles.glitch} data-glitch data-text="мешает">
                  мешает
                </span>{" "}
                ему продавать
              </>
            )}
          </h2>
          <p className={styles.desc}>
            {/* non-breaking spaces copied from the Figma text (181:1278) — they define the line breaks */}
            {content?.desc ??
              "Пришлите ссылку, и\u00a0мы\u00a0за\u00a02\u00a0рабочих дня\u00a0бесплатно разберём сайт, магазин или\u00a0сервис и\u00a0пришлём список конкретных правок. Даже\u00a0если потом вы\u00a0не\u00a0станете с\u00a0нами работать"}
          </p>
        </div>

        <div className={styles.side}>
          <ol ref={list} className={styles.list} aria-label="Что проверим">
            {checklist.map((item, i) => {
              const on = i < checked;
              return (
                <li key={item} className={styles.item} data-on={on ? "" : undefined}>
                  <span className={styles.num}>{i + 1}</span>
                  <span className={styles.itemText}>{item}</span>
                  <span className={styles.box} aria-hidden="true">
                    <span className={styles.tick}>
                      <Icon name="check" size={12} stroke={1.25} />
                    </span>
                  </span>
                  <span className="sr-only">{on ? " — проверено" : ""}</span>
                </li>
              );
            })}
          </ol>
          <AuditForm placeholder={content?.placeholder ?? "https://ваш-сайт.ru"} />
        </div>
      </div>
    </section>
  );
}

function AuditForm({ placeholder }: { placeholder: string }) {
  const field = useRef<HTMLDivElement>(null);
  const btnWrap = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const [error, setError] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const valid = URL_RE.test(value.trim());
  const domain = valid ? value.trim().replace(/^https?:\/\//i, "").split(/[/:]/)[0] : "";

  const shake = () => {
    if (prefersReducedMotion()) return;
    gsap.fromTo(field.current, { x: 0 }, { x: 4, duration: 0.05, yoyo: true, repeat: 5, ease: "sine.inOut", clearProps: "x" });
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle") return;
    if (!valid) {
      setError(true);
      shake();
      return;
    }
    setError(false);
    const wrap = btnWrap.current;
    const from = wrap?.offsetWidth ?? 0;
    setStatus("scanning");
    // TODO(backend): POST the URL to the audit endpoint here
    gsap.delayedCall(prefersReducedMotion() ? 0.3 : 1.5, () => {
      setStatus("done");
      if (wrap && !prefersReducedMotion()) {
        requestAnimationFrame(() => {
          const to = wrap.scrollWidth;
          gsap.fromTo(wrap, { width: from }, { width: to, duration: 0.4, ease: "power2.inOut", clearProps: "width" });
        });
      }
    });
  };

  const float = focused || value.length > 0;

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      <div
        ref={field}
        className={styles.field}
        data-focus={focused ? "" : undefined}
        data-error={error ? "" : undefined}
        data-float={float ? "" : undefined}
       
      >
        <label htmlFor="audit-url" className={styles.label}>
          {placeholder}
        </label>
        <input
          id="audit-url"
          className={styles.input}
          type="url"
          inputMode="url"
          autoComplete="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (error) setError(false);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={error || undefined}
          aria-describedby={error ? "audit-url-error" : undefined}
          disabled={status !== "idle"}
        />
        <span className={styles.ok} data-show={valid ? "" : undefined} aria-hidden="true">
          {domain && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`https://${domain}/favicon.ico`}
              alt=""
              width={16}
              height={16}
              onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
            />
          )}
          <Icon name="check" size={14} stroke={1.4} />
        </span>
        {error && (
          <span id="audit-url-error" className="sr-only" role="alert">
            Проверьте ссылку — например, https://ваш-сайт.ru
          </span>
        )}
      </div>
      <div ref={btnWrap} className={styles.submitWrap} data-status={status}>
        {status === "idle" && (
          <Button type="submit" variant="white" size="lg" arrow={12} className={styles.submit}>
            Получить разбор
          </Button>
        )}
        {status === "scanning" && (
          <span className={styles.progress} role="status">
            Сканируем…
            <span className={styles.progressBar} aria-hidden="true" />
          </span>
        )}
        {status === "done" && (
          <span className={styles.done} role="status">
            Разбор будет готов через 2 дня <Icon name="check" size={12} stroke={1.25} />
          </span>
        )}
      </div>
    </form>
  );
}
