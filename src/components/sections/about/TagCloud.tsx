"use client";

import { useEffect, useRef } from "react";
import type * as MatterNS from "matter-js";
import { gsap } from "@/lib/gsap";
import { tagRows } from "@/content/site";
import { canHover, prefersReducedMotion, whenVisible } from "@/lib/env";
import styles from "./TagCloud.module.css";

/**
 * Tag cloud (181:874). Rows drift in opposite directions (~12px/s). On hover the tags come
 * alive: Matter.js (gravity 0, bounce off the card edges, friction 0.05) — grab and throw.
 * 2s after the pointer leaves they glide back into their rows. Touch: drift only.
 */
export function TagCloud({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const rows = Array.from(el.querySelectorAll<HTMLElement>("[data-row]"));
    const drift = rows.map((row, i) =>
      gsap.fromTo(
        row,
        { x: i % 2 ? 16 : -16 },
        { x: i % 2 ? -16 : 16, duration: 2.7, ease: "sine.inOut", yoyo: true, repeat: -1 },
      ),
    );
    const stopVis = whenVisible(el, (v) => drift.forEach((d) => (v ? d.play() : d.pause())));
    if (!canHover()) {
      return () => {
        drift.forEach((d) => d.kill());
        stopVis();
      };
    }

    const card = el.closest<HTMLElement>("[data-card]") ?? el;
    const tags = Array.from(el.querySelectorAll<HTMLElement>("[data-tag]"));
    let Matter: typeof MatterNS | null = null;
    let engine: MatterNS.Engine | null = null;
    let bodies: MatterNS.Body[] = [];
    let home: { x: number; y: number }[] = [];
    let tick: (() => void) | null = null;
    let returnTimer: gsap.core.Tween | null = null;
    let grabbed: { i: number; dx: number; dy: number; lx: number; ly: number; lt: number; vx: number; vy: number } | null = null;
    let alive = false;
    let loading = false;

    const cardBox = () => card.getBoundingClientRect();

    const start = async () => {
      returnTimer?.kill();
      if (alive || loading) return;
      loading = true;
      Matter = Matter ?? (await import("matter-js")).default;
      loading = false;
      if (!card.matches(":hover")) return;
      alive = true;
      drift.forEach((d) => d.pause());
      const cb = cardBox();
      const { Engine, Bodies, Composite, Body } = Matter;
      engine = Engine.create({ gravity: { x: 0, y: 0, scale: 0 } });
      // tags are measured in card space, then frozen out of the flex rows
      home = tags.map((t) => {
        const r = t.getBoundingClientRect();
        return { x: r.left - cb.left + r.width / 2, y: r.top - cb.top + r.height / 2 };
      });
      bodies = tags.map((t, i) => {
        const b = Bodies.rectangle(home[i].x, home[i].y, t.offsetWidth, t.offsetHeight, {
          chamfer: { radius: 10 },
          frictionAir: 0.05,
          friction: 0.05,
          restitution: 0.85,
        });
        Body.setVelocity(b, { x: (Math.random() - 0.5) * 3, y: (Math.random() - 0.5) * 3 });
        Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.04);
        return b;
      });
      const T = 200;
      const walls = [
        Bodies.rectangle(cb.width / 2, -T / 2, cb.width + T * 2, T, { isStatic: true }),
        Bodies.rectangle(cb.width / 2, cb.height + T / 2, cb.width + T * 2, T, { isStatic: true }),
        Bodies.rectangle(-T / 2, cb.height / 2, T, cb.height + T * 2, { isStatic: true }),
        Bodies.rectangle(cb.width + T / 2, cb.height / 2, T, cb.height + T * 2, { isStatic: true }),
      ];
      Composite.add(engine.world, [...bodies, ...walls]);
      el.dataset.alive = "1";
      tick = () => {
        if (!engine || !Matter) return;
        if (grabbed) {
          const b = bodies[grabbed.i];
          Matter.Body.setPosition(b, { x: grabbed.lx - grabbed.dx, y: grabbed.ly - grabbed.dy });
          Matter.Body.setVelocity(b, { x: grabbed.vx / 60, y: grabbed.vy / 60 });
        }
        Matter.Engine.update(engine, 1000 / 60);
        bodies.forEach((b, i) => {
          const t = tags[i];
          gsap.set(t, { x: b.position.x - home[i].x, y: b.position.y - home[i].y, rotation: (b.angle * 180) / Math.PI });
        });
      };
      gsap.ticker.add(tick);
    };

    const goHome = () => {
      if (!alive) return;
      if (tick) gsap.ticker.remove(tick);
      tick = null;
      if (engine) Matter?.Engine.clear(engine);
      engine = null;
      alive = false;
      gsap.to(tags, {
        x: 0,
        y: 0,
        rotation: 0,
        duration: 1,
        ease: "expo.inOut",
        stagger: 0.03,
        onComplete: () => {
          delete el.dataset.alive;
          drift.forEach((d) => d.play());
        },
      });
    };

    const onEnter = () => start();
    const onLeave = () => {
      grabbed = null;
      returnTimer?.kill();
      returnTimer = gsap.delayedCall(2, goHome);
    };
    const onDown = (e: PointerEvent) => {
      const i = tags.indexOf((e.target as Element).closest("[data-tag]") as HTMLElement);
      if (i < 0 || !alive) return;
      e.preventDefault();
      const cb = cardBox();
      const lx = e.clientX - cb.left;
      const ly = e.clientY - cb.top;
      const b = bodies[i];
      grabbed = { i, dx: lx - b.position.x, dy: ly - b.position.y, lx, ly, lt: performance.now(), vx: 0, vy: 0 };
      tags[i].dataset.grabbed = "1";
      card.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!grabbed) return;
      const cb = cardBox();
      const now = performance.now();
      const lx = e.clientX - cb.left;
      const ly = e.clientY - cb.top;
      const dt = Math.max(1, now - grabbed.lt) / 1000;
      grabbed.vx = (lx - grabbed.lx) / dt;
      grabbed.vy = (ly - grabbed.ly) / dt;
      grabbed.lx = lx;
      grabbed.ly = ly;
      grabbed.lt = now;
    };
    const onUp = () => {
      if (!grabbed || !Matter) return;
      const b = bodies[grabbed.i];
      Matter.Body.setVelocity(b, {
        x: gsap.utils.clamp(-30, 30, grabbed.vx / 60),
        y: gsap.utils.clamp(-30, 30, grabbed.vy / 60),
      });
      delete tags[grabbed.i].dataset.grabbed;
      grabbed = null;
    };

    card.addEventListener("pointerenter", onEnter);
    card.addEventListener("pointerleave", onLeave);
    card.addEventListener("pointerdown", onDown);
    card.addEventListener("pointermove", onMove);
    card.addEventListener("pointerup", onUp);
    card.addEventListener("pointercancel", onUp);
    return () => {
      drift.forEach((d) => d.kill());
      stopVis();
      returnTimer?.kill();
      if (tick) gsap.ticker.remove(tick);
      card.removeEventListener("pointerenter", onEnter);
      card.removeEventListener("pointerleave", onLeave);
      card.removeEventListener("pointerdown", onDown);
      card.removeEventListener("pointermove", onMove);
      card.removeEventListener("pointerup", onUp);
      card.removeEventListener("pointercancel", onUp);
    };
  }, []);

  return (
    <div ref={root} className={`${styles.cloud} ${className ?? ""}`}>
      {tagRows.map((row, ri) => (
        <div key={ri} className={styles.row} data-row>
          <ul className={styles.list} style={ri === 1 ? { paddingLeft: 23.228 } : undefined}>
            {row.map((t) => (
              <li
                key={t}
                className={`${styles.tag} ${t === "Сервисы" ? styles.ink : ""}`}
                data-tag
                data-drag
              >
                {t}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
