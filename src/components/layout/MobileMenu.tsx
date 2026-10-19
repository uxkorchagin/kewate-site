"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { gsap } from "@/lib/gsap";
import { contacts, megaMenuGroups, services } from "@/content/site";
import { prefersReducedMotion } from "@/lib/env";
import { useLenis } from "@/components/motion/SmoothScroll";
import { Logo } from "@/components/ui/Logo";
import { Icon } from "@/components/ui/Icon";
import { Button } from "@/components/ui/Button";
import styles from "./MobileMenu.module.css";

const byId = Object.fromEntries(services.map((s) => [s.id, s]));

/** Fullscreen mobile menu (200:309): panel slides down, items stagger 40ms, «Услуги» accordion. */
export function MobileMenu({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (href: string) => (e: MouseEvent) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const acc = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const lenis = useLenis();

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  useEffect(() => {
    const el = root.current;
    if (!mounted || !el) return;
    const items = el.querySelectorAll("[data-mm-item]");
    const reduced = prefersReducedMotion();
    if (open) {
      lenis?.stop();
      document.documentElement.style.overflow = "hidden";
      const tl = gsap.timeline({ onComplete: () => closeBtn.current?.focus() });
      if (reduced) tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
      else
        tl.fromTo(el, { autoAlpha: 1, clipPath: "inset(0% 0% 100% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.5, ease: "expo.out" })
          .fromTo(items, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.04, ease: "expo.out" }, 0.12);
      return () => {
        tl.kill();
      };
    }
    lenis?.start();
    document.documentElement.style.overflow = "";
    const tl = gsap.timeline({ onComplete: () => setMounted(false) });
    if (reduced) tl.to(el, { autoAlpha: 0, duration: 0.2 });
    else tl.to(el, { clipPath: "inset(0% 0% 100% 0%)", duration: 0.35, ease: "power2.in" });
    document.querySelector<HTMLButtonElement>('[aria-controls="mobile-menu"]')?.focus();
    return () => {
      tl.kill();
    };
  }, [open, mounted, lenis]);

  // accordion height
  useEffect(() => {
    const a = acc.current;
    if (!a || !mounted) return;
    gsap.to(a, {
      height: expanded ? "auto" : 0,
      opacity: expanded ? 1 : 0,
      duration: prefersReducedMotion() ? 0 : 0.4,
      ease: "power2.inOut",
    });
  }, [expanded, mounted]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && root.current) {
        const f = root.current.querySelectorAll<HTMLElement>("a, button");
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div ref={root} id="mobile-menu" className={styles.menu} role="dialog" aria-modal="true" aria-label="Меню">
      <span className={styles.glow} aria-hidden="true" />
      <span className={styles.cols} aria-hidden="true" />
      <div className={styles.top}>
        <a href="#top" onClick={onNavigate("#top")} aria-label="Kewate — на главную">
          <Logo width={115} color="#fff" title={null} />
        </a>
        <button ref={closeBtn} type="button" className={styles.close} onClick={onClose} aria-label="Закрыть меню">
          <Icon name="close" size={20} stroke={1.6} />
        </button>
      </div>

      <nav className={styles.nav} aria-label="Мобильная навигация">
        <div className={styles.row} data-mm-item>
          <button
            type="button"
            className={styles.rowBtn}
            aria-expanded={expanded}
            aria-controls="mm-services"
            onClick={() => setExpanded((v) => !v)}
          >
            <span className={styles.rowLabel}>
              Услуги <span className={styles.count}>8</span>
            </span>
            <span className={styles.toggle} data-open={expanded ? "1" : undefined} aria-hidden="true">
              <span />
              <span />
            </span>
          </button>
        </div>
        <div ref={acc} id="mm-services" className={styles.acc} role="region" aria-label="Услуги">
          <div className={styles.accInner}>
            {megaMenuGroups.map((g) => (
              <div key={g.id} className={styles.group}>
                <p className={styles.groupLabel}>{g.label}</p>
                <ul>
                  {g.items.map((k) => (
                    <li key={k}>
                      <Link href={byId[k].href} prefetch={false} className={styles.sub} onClick={onClose}>
                        {byId[k].title}
                        <Icon name="arrow-up-right" size={14} stroke={1.4} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        {[
          { label: "Проекты", href: "#projects", count: 5 },
          { label: "О студии", href: "#about" },
          { label: "Контакты", href: "#contacts" },
        ].map((l) => (
          <div key={l.href} className={styles.row} data-mm-item>
            <a href={l.href} className={styles.rowBtn} onClick={onNavigate(l.href)}>
              <span className={styles.rowLabel}>
                {l.label} {l.count && <span className={styles.count}>{l.count}</span>}
              </span>
              <Icon name="arrow-up-right" size={20} stroke={1.4} />
            </a>
          </div>
        ))}
      </nav>

      <div className={styles.bottom}>
        <div data-mm-item>
          <Button href="#contacts" variant="white" block arrow={14} arrowStroke={1.4} onClick={onNavigate("#contacts")}>
            Обсудить задачу
          </Button>
        </div>
        <div className={styles.pair} data-mm-item>
          <a href={contacts.telegram} className={`${styles.ghost} swap-host`} target="_blank" rel="noopener noreferrer">
            Telegram <Icon name="arrow-up-right" size={12} stroke={1.25} />
          </a>
          <a href={contacts.phoneHref} className={`${styles.ghost} swap-host`}>
            Позвонить <Icon name="arrow-up-right" size={12} stroke={1.25} />
          </a>
        </div>
        <p className={styles.meta} data-mm-item>
          {contacts.email} · {contacts.phone}
        </p>
      </div>
    </div>
  );
}
