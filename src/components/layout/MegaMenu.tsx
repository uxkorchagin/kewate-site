"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { gsap } from "@/lib/gsap";
import { megaMenuGroups, services } from "@/content/site";
import { prefersReducedMotion } from "@/lib/env";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { ServiceIllustration } from "@/components/illustrations/ServiceIllustration";
import { usePointerLight, useLayerParallax } from "@/components/motion/hooks";
import styles from "./MegaMenu.module.css";

const byId = Object.fromEntries(services.map((s) => [s.id, s]));

type Props = {
  open: boolean;
  /** move focus to the first item once the panel opens (keyboard opening) */
  focusFirst?: boolean;
  onClose: (focusTrigger?: boolean) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onNavigate: (href: string) => (e: MouseEvent) => void;
};

/** Mega menu «Услуги» (232:403): panel drops 8px with clip-path, columns stagger 40ms, items 30ms. */
export function MegaMenu({ open, focusFirst, onClose, onPointerEnter, onPointerLeave, onNavigate }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);
  const promo = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [hover, setHover] = useState<string | null>("sites");
  usePointerLight(promo, { lerp: 0.08 });

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  // open / close choreography
  useEffect(() => {
    const p = panel.current;
    const o = overlay.current;
    if (!mounted || !p || !o) return;
    const cols = p.querySelectorAll("[data-col]");
    const items = p.querySelectorAll("[data-mega-item], [data-group-label]");
    const aside = p.querySelector("[data-aside]");
    const reduced = prefersReducedMotion();
    gsap.killTweensOf([p, o, cols, items, aside]);
    if (open) {
      if (reduced) {
        gsap.fromTo([o, p], { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 });
        if (focusFirst) {
          gsap.set(p, { visibility: "visible" });
          p.querySelector<HTMLElement>("[data-mega-item]")?.focus({ preventScroll: true });
        }
        return;
      }
      const tl = gsap.timeline();
      tl.fromTo(o, { autoAlpha: 0, backdropFilter: "blur(0px)" }, { autoAlpha: 1, backdropFilter: "blur(14px)", duration: 0.3, ease: "power2.out" }, 0)
        .fromTo(
          p,
          { autoAlpha: 0, y: -8, clipPath: "inset(0% 0% 100% 0% round 28px)" },
          { autoAlpha: 1, y: 0, clipPath: "inset(0% 0% 0% 0% round 28px)", duration: 0.35, ease: "expo.out" },
          0,
        )
        // opacity (not autoAlpha) keeps items focusable while they fade in
        .fromTo(cols, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.04 }, 0.05)
        .fromTo(items, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.35, stagger: 0.03 }, 0.08)
        .fromTo(aside, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 }, ">-0.2")
        .call(() => focusFirst && p.querySelector<HTMLElement>("[data-mega-item]")?.focus({ preventScroll: true }), [], 0.02);
      return () => {
        tl.kill();
      };
    }
    const tl = gsap.timeline({ onComplete: () => setMounted(false) });
    if (reduced) {
      tl.to([o, p], { autoAlpha: 0, duration: 0.2 });
    } else {
      tl.to([aside, ...Array.from(items).reverse()], { opacity: 0, y: -4, duration: 0.15, stagger: 0.01, ease: "power2.in" }, 0)
        .to(p, { autoAlpha: 0, y: -8, clipPath: "inset(0% 0% 100% 0% round 28px)", duration: 0.2, ease: "power2.in" }, 0.05)
        .to(o, { autoAlpha: 0, backdropFilter: "blur(0px)", duration: 0.2, ease: "power2.in" }, 0.05);
    }
    return () => {
      tl.kill();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mounted]);

  // shared hover plate glides to the item under the pointer
  useEffect(() => {
    const g = grid.current;
    const pl = plate.current;
    if (!g || !pl || !mounted) return;
    const item = g.querySelector<HTMLElement>(`[data-mega-item="${hover}"]`);
    if (!item) return;
    const gr = g.getBoundingClientRect();
    const r = item.getBoundingClientRect();
    gsap.to(pl, {
      x: r.left - gr.left,
      y: r.top - gr.top,
      width: r.width,
      height: r.height,
      autoAlpha: 1,
      duration: prefersReducedMotion() ? 0 : 0.25,
      ease: "power3.out",
    });
  }, [hover, mounted]);

  // keyboard: ↑↓ move between items, Esc closes and returns focus to the trigger
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose(true);
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const list = Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>("[data-mega-item]") ?? []);
    const i = list.indexOf(document.activeElement as HTMLAnchorElement);
    const next = e.key === "ArrowDown" ? (i + 1) % list.length : (i - 1 + list.length) % list.length;
    e.preventDefault();
    list[next]?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onClose(true);
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!mounted) return null;

  return (
    <div ref={wrap} className={styles.root}>
      <div ref={overlay} className={styles.overlay} onClick={() => onClose()} aria-hidden="true" />
      <div
        ref={panel}
        id="mega-menu"
        className={styles.panel}
        role="region"
        aria-label="Услуги"
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onKeyDown={onKeyDown}
      >
        <div ref={grid} className={styles.grid}>
          <div ref={plate} className={styles.plate} aria-hidden="true" />
          <div className={styles.col} data-col>
            <Group id="dev" hover={hover} setHover={setHover} onClose={onClose} />
          </div>
          <div className={`${styles.col} ${styles.colStack}`} data-col>
            <Group id="design" hover={hover} setHover={setHover} onClose={onClose} />
            <Group id="marketing" hover={hover} setHover={setHover} onClose={onClose} />
          </div>
          <div className={styles.divider} aria-hidden="true" />
          <aside className={styles.aside} data-aside>
            <div ref={promo} className={styles.promo}>
              <span className={styles.promoGlow} aria-hidden="true" />
              <div className={styles.promoText}>
                <p className={styles.promoTitle}>Не знаете, что выбрать?</p>
                <p className={styles.promoLead}>Расскажите о задаче и соберём нужные направления в один проект</p>
              </div>
              <div className={styles.promoActions}>
                <Button href="#contacts" variant="white" block size="sm" arrow={14} arrowStroke={1.4} onClick={onNavigate("#contacts")}>
                  Обсудить задачу
                </Button>
                <Button
                  href="#contacts"
                  variant="outline"
                  block
                  size="sm"
                  arrow={14}
                  arrowStroke={1.4}
                  className={styles.outline}
                  onClick={onNavigate("#contacts")}
                >
                  Рассчитать стоимость
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Group({
  id,
  hover,
  setHover,
  onClose,
}: {
  id: "dev" | "design" | "marketing";
  hover: string | null;
  setHover: (v: string) => void;
  onClose: () => void;
}) {
  const group = megaMenuGroups.find((g) => g.id === id)!;
  return (
    <div className={styles.group}>
      <p className={styles.groupLabel} data-group-label>
        <span>{group.label}</span>
        <span className={styles.groupCount}>{group.items.length}</span>
      </p>
      <ul>
        {group.items.map((kind) => (
          <li key={kind}>
            <Item kind={kind} active={hover === kind} onHover={() => setHover(kind)} onClose={onClose} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function Item({
  kind,
  active,
  onHover,
  onClose,
}: {
  kind: string;
  active: boolean;
  onHover: () => void;
  onClose: () => void;
}) {
  const s = byId[kind];
  const thumb = useRef<HTMLSpanElement>(null);
  useLayerParallax(thumb, 0.3137);
  return (
    <Link
      prefetch={false}
      href={s.href}
      className={`${styles.item} swap-host`}
      data-mega-item={kind}
      data-active={active ? "1" : undefined}
      onPointerEnter={onHover}
      onFocus={onHover}
      onClick={() => onClose()}
    >
      <span ref={thumb} className={styles.thumb}>
        <ServiceIllustration kind={s.id} />
      </span>
      <span className={styles.itemText}>
        <span className={styles.itemHead}>
          <span className={styles.itemTitle}>{s.title}</span>
          <span className={styles.price}>{s.price}</span>
        </span>
        <span className={styles.itemDesc}>{s.desc}</span>
      </span>
      <span className={styles.arrow}>
        <Icon name="arrow-up-right" size={16} stroke={1.4} />
      </span>
    </Link>
  );
}
