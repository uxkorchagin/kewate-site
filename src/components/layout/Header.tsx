"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { nav } from "@/content/site";
import { canHover } from "@/lib/env";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { Roll } from "@/components/ui/Roll";
import { scrollToTarget, useLenis } from "@/components/motion/SmoothScroll";
import { MegaMenu } from "./MegaMenu";
import { MobileMenu } from "./MobileMenu";
import styles from "./Header.module.css";

/**
 * Header (181:780): glass background after 40px, hides on scroll down (>80px),
 * returns on any scroll up, inverts over light sections (`data-theme="light"`).
 */
type NavItem = { id: string; label: string; href: string };

type HeaderProps = {
  /** anchors of the current page; the main page uses `nav` from the content file */
  items?: readonly NavItem[];
  /** the logo leads here; on the main page it scrolls to the top */
  home?: string;
  /** service pages: «Обсудить задачу» opens the lead form instead of scrolling to #contacts */
  onCta?: () => void;
};

export function Header({ items = nav, home = "#top", onCta }: HeaderProps = {}) {
  const root = useRef<HTMLElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const logo = useRef<HTMLAnchorElement>(null);
  const lenis = useLenis();
  const [megaOpen, setMegaOpen] = useState(false);
  const [megaFocus, setMegaFocus] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // scroll states: scrolled / hidden / theme
  useGSAP(() => {
    const el = root.current;
    if (!el) return;
    let lastY = window.scrollY;
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => {
        const y = self.scroll();
        el.dataset.scrolled = y > 40 ? "1" : "0";
        const goingDown = y > lastY;
        if (!el.dataset.locked) el.dataset.hidden = goingDown && y > 80 ? "1" : "0";
        lastY = y;
      },
    });

    // invert over light sections: read the theme of whatever sits under the header's centre line
    // (handles nested blocks such as the dark footer card inside the light contacts section)
    const probe = () => {
      const r = el.getBoundingClientRect(); // the header sits lower while the «Демо» banner is on screen
      const y = r.top + r.height / 2;
      const stack = document.elementsFromPoint(Math.min(24, window.innerWidth / 2), y);
      const host = stack.find((n) => !el.contains(n) && n.closest("[data-theme]"))?.closest<HTMLElement>("[data-theme]");
      if (host) el.dataset.theme = host.dataset.theme ?? "dark";
    };
    const themeTrigger = ScrollTrigger.create({ start: 0, end: "max", onUpdate: probe, onRefresh: probe });
    probe();

    // scroll-spy for nav items
    const spy = items.map((item) => {
      const target = document.getElementById(item.href.slice(1));
      if (!target) return null;
      return ScrollTrigger.create({
        trigger: target,
        start: "top 50%",
        end: "bottom 50%",
        refreshPriority: -1,
        onToggle: (self) => {
          if (self.isActive) setActive(item.id);
          else setActive((cur) => (cur === item.id ? null : cur));
        },
      });
    });
    const servicesSpy = document.getElementById("services")
      ? ScrollTrigger.create({
          trigger: "#services",
          start: "top 50%",
          end: "bottom 50%",
          refreshPriority: -1,
          onToggle: (self) => self.isActive && setActive("prices"),
        })
      : null;

    return () => {
      st.kill();
      themeTrigger.kill();
      spy.forEach((t) => t?.kill());
      servicesSpy?.kill();
    };
  }, [items]);

  // Logo hover: mark rotates 12° on a spring, letters wave
  useEffect(() => {
    const a = logo.current;
    if (!a || !canHover()) return;
    const mark = a.querySelector(".logo-mark");
    const letters = a.querySelectorAll(".logo-letter");
    const enter = () => {
      gsap.to(mark, { rotation: 12, duration: 0.8, ease: "elastic.out(1, 0.45)", svgOrigin: "10.4 11.7" });
      gsap.fromTo(letters, { y: 0 }, { y: -3, duration: 0.2, stagger: 0.03, yoyo: true, repeat: 1, ease: "sine.out" });
    };
    const leave = () => gsap.to(mark, { rotation: 0, duration: 0.8, ease: "elastic.out(1, 0.45)", svgOrigin: "10.4 11.7" });
    a.addEventListener("pointerenter", enter);
    a.addEventListener("pointerleave", leave);
    return () => {
      a.removeEventListener("pointerenter", enter);
      a.removeEventListener("pointerleave", leave);
    };
  }, []);

  const clearTimers = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };
  const scheduleOpen = () => {
    if (!canHover()) return;
    clearTimers();
    openTimer.current = setTimeout(() => {
      setMegaFocus(false);
      setMegaOpen(true);
    }, 120);
  };
  const scheduleClose = () => {
    clearTimers();
    closeTimer.current = setTimeout(() => setMegaOpen(false), 250);
  };
  const closeMega = useCallback((focusTrigger = false) => {
    clearTimers();
    setMegaOpen(false);
    setMegaFocus(false);
    if (focusTrigger) trigger.current?.focus();
  }, []);

  // keep the header visible while a menu is open
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (megaOpen || mobileOpen) {
      el.dataset.locked = "1";
      el.dataset.hidden = "0";
    } else delete el.dataset.locked;
  }, [megaOpen, mobileOpen]);

  const go = (href: string) => (e: React.MouseEvent) => {
    if (!href.startsWith("#")) return;
    e.preventDefault();
    closeMega();
    if (mobileOpen) {
      // the open menu stops Lenis and locks the page; scroll once it has unlocked
      setMobileOpen(false);
      setTimeout(() => scrollToTarget(lenis, href, { duration: 1.2 }), 60);
    } else {
      scrollToTarget(lenis, href, { duration: 1.2 });
    }
    history.replaceState(null, "", href);
  };

  return (
    <>
      <header
        ref={root}
        className={styles.header}
        data-theme="dark"
        data-scrolled="0"
        data-hidden="0"
        data-mega={megaOpen ? "1" : "0"}
      >
        <div className={styles.bar}>
          <a ref={logo} href={home} className={styles.logo} onClick={go(home)} aria-label="Kewate — на главную">
            <Logo width={138} title={null} />
          </a>

          <nav className={styles.nav} aria-label="Основная навигация">
            <ul className={styles.navList}>
              <li onPointerEnter={scheduleOpen} onPointerLeave={scheduleClose}>
                <button
                  ref={trigger}
                  type="button"
                  className={`${styles.navItem} ${styles.trigger} roll-host`}
                  aria-expanded={megaOpen}
                  aria-controls="mega-menu"
                  aria-haspopup="true"
                  data-open={megaOpen ? "1" : undefined}
                  onClick={() => {
                    clearTimers();
                    setMegaFocus(false);
                    setMegaOpen((v) => !v);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      clearTimers(); // a pending hover-close must not undo a keyboard open
                      if (megaOpen) document.querySelector<HTMLElement>("#mega-menu [data-mega-item]")?.focus();
                      setMegaFocus(true);
                      setMegaOpen(true);
                    }
                  }}
                >
                  <Roll text="Услуги" letters />
                  <Icon name="chevron-down" size={14} className={styles.chevron} />
                </button>
              </li>
              {items.map((item) => (
                <li key={item.id}>
                  <a
                    href={item.href}
                    onClick={go(item.href)}
                    className={`${styles.navItem} underline roll-host`}
                    data-active={active === item.id ? "1" : active ? "0" : undefined}
                    aria-current={active === item.id ? "location" : undefined}
                  >
                    <Roll text={item.label} letters />
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <Button
            href="#contacts"
            size="sm"
            variant="white"
            magnet={8}
            arrow={12}
            className={styles.cta}
            onClick={
              onCta
                ? (e: React.MouseEvent) => {
                    e.preventDefault();
                    onCta();
                  }
                : go("#contacts")
            }
          >
            Обсудить задачу
          </Button>

          <button
            type="button"
            className={styles.burger}
            aria-label="Открыть меню"
            aria-expanded={mobileOpen}
            aria-controls="mobile-menu"
            onClick={() => setMobileOpen(true)}
          >
            <span />
            <span />
          </button>
        </div>
        <div className={styles.line} aria-hidden="true" />

        <MegaMenu
          open={megaOpen}
          focusFirst={megaFocus}
          onClose={closeMega}
          onPointerEnter={() => clearTimers()}
          onPointerLeave={scheduleClose}
          onNavigate={go}
        />
      </header>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} onNavigate={go} />
    </>
  );
}
