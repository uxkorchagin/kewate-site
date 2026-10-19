"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap, useGSAP } from "@/lib/gsap";
import { review } from "@/content/site";
import { canHover, prefersReducedMotion, whenVisible } from "@/lib/env";
import { useLenis } from "@/components/motion/SmoothScroll";
import { Icon } from "@/components/ui/Icon";
import styles from "./VideoReview.module.css";

/**
 * Pavel's video review (181:904). Ring spins (20s/turn, 4s on hover), the circle floats after the
 * cursor and plays a silent preview; click grows it into the round player (600ms expo.inOut).
 * Close: Esc, the × button, a click on the backdrop or a swipe down — it folds back into the circle.
 */
export function VideoReview() {
  const card = useRef<HTMLDivElement>(null);
  const circle = useRef<HTMLButtonElement>(null);
  const ring = useRef<HTMLSpanElement>(null);
  const preview = useRef<HTMLVideoElement>(null);
  const quote = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);

  // ring rotation + quote words
  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const spin = gsap.to(ring.current, { rotation: 360, duration: 20, ease: "none", repeat: -1 });
      const stop = whenVisible(card.current!, (v) => (v ? spin.play() : spin.pause()));
      const words = quote.current!.querySelectorAll("span");
      gsap.from(words, {
        opacity: 0,
        y: 8,
        duration: 0.6,
        stagger: 0.03,
        ease: "expo.out",
        scrollTrigger: { trigger: quote.current, start: "top 90%", once: true },
      });
      const c = card.current!;
      const fast = () => gsap.to(spin, { timeScale: 5, duration: 0.6 });
      const slow = () => gsap.to(spin, { timeScale: 1, duration: 0.8 });
      c.addEventListener("pointerenter", fast);
      c.addEventListener("pointerleave", slow);
      return () => {
        stop();
        c.removeEventListener("pointerenter", fast);
        c.removeEventListener("pointerleave", slow);
      };
    },
    { scope: card },
  );

  // the circle floats after the cursor inside the card (±10px, lerp 0.1) + silent preview
  useEffect(() => {
    const c = card.current;
    const el = circle.current?.parentElement;
    if (!c || !el || !canHover()) return;
    const xTo = gsap.quickTo(el, "x", { duration: 0.6, ease: "power3.out" });
    const yTo = gsap.quickTo(el, "y", { duration: 0.6, ease: "power3.out" });
    const onMove = (e: PointerEvent) => {
      const r = c.getBoundingClientRect();
      xTo(((e.clientX - r.left) / r.width - 0.5) * 20);
      yTo(((e.clientY - r.top) / r.height - 0.5) * 20);
    };
    const v = preview.current;
    // the photo stays until the preview really plays, then the video fades in over it
    const onPlaying = () => v?.setAttribute("data-playing", "");
    const onEnter = () => v?.play().catch(() => {});
    const onLeave = () => {
      xTo(0);
      yTo(0);
      v?.pause();
      v?.removeAttribute("data-playing");
    };
    v?.addEventListener("playing", onPlaying);
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerenter", onEnter);
    c.addEventListener("pointerleave", onLeave);
    return () => {
      v?.removeEventListener("playing", onPlaying);
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerenter", onEnter);
      c.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={card} className={styles.card}>
      <span className={styles.light} aria-hidden="true" />
      <div className={styles.top}>
        <span className={styles.caps}>{review.label}</span>
        <span>{review.duration}</span>
      </div>

      <div className={styles.circleWrap}>
        <button
          ref={circle}
          type="button"
          className={styles.circle}
          onClick={() => setOpen(true)}
          aria-label={`Смотреть видеоотзыв: ${review.author}`}
          aria-haspopup="dialog"
        >
          <span ref={ring} className={styles.ring} aria-hidden="true">
            <Image src="/images/ring.png" alt="" width={170} height={170} />
          </span>
          <span className={styles.photo} data-flip-source>
            <Image src={review.poster} alt="" width={150} height={150} sizes="150px" />
            {review.preview && (
              <video ref={preview} className={styles.previewVideo} src={review.preview} muted loop playsInline preload="none" aria-hidden="true" tabIndex={-1} />
            )}
          </span>
          <span className={styles.play} aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 13 13">
              <path d="M12.25 6.5L2.5 12.13V0.87L12.25 6.5Z" fill="#09090b" />
            </svg>
          </span>
        </button>
      </div>

      <div className={styles.bottom}>
        <p ref={quote} className={styles.quote}>
          {review.quote.split(" ").map((w, i) => (
            <span key={i}>{w} </span>
          ))}
        </p>
        <p className={styles.author}>{review.author}</p>
      </div>

      {open && <Player from={circle} onClose={() => setOpen(false)} />}
    </div>
  );
}

// progress ring: radius in viewBox units (100), a few px outside the video circle
const RING_R = 49.3;
const RING_C = 2 * Math.PI * RING_R;

const fmt = (t: number) => {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * The review is a round «video note» (square file with white corners), so it plays as a big circle:
 * the small circle grows into it (transform only), a mint ring around it shows progress.
 * Click / Space — pause, ← → — ±5 s, M — sound, Esc / × / swipe down — close.
 */
function Player({ from, onClose }: { from: React.RefObject<HTMLButtonElement | null>; onClose: () => void }) {
  const shell = useRef<HTMLDivElement>(null);
  const backdrop = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const chrome = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const toggleBtn = useRef<HTMLButtonElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const progress = useRef<SVGCircleElement>(null);
  const lenis = useLenis();
  const closing = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  /** offset + scale that put the big circle exactly over the small one in the card */
  const fromCard = () => {
    const src = from.current?.querySelector<HTMLElement>("[data-flip-source]")?.getBoundingClientRect();
    const st = stage.current!;
    gsap.set(st, { x: 0, y: 0, scale: 1 });
    const dst = st.getBoundingClientRect();
    if (!src || !dst.width) return { x: 0, y: 0, scale: 0.3 };
    return {
      x: src.left + src.width / 2 - (dst.left + dst.width / 2),
      y: src.top + src.height / 2 - (dst.top + dst.height / 2),
      scale: src.width / dst.width,
    };
  };

  useEffect(() => {
    lenis?.stop();
    document.documentElement.style.overflow = "hidden";
    const prevFocus = document.activeElement as HTMLElement | null;
    if (prefersReducedMotion()) {
      gsap.fromTo(shell.current, { opacity: 0 }, { opacity: 1, duration: 0.2 });
    } else {
      gsap.fromTo(stage.current, fromCard(), { x: 0, y: 0, scale: 1, duration: 0.6, ease: "expo.inOut" });
      gsap.fromTo(backdrop.current, { opacity: 0 }, { opacity: 1, duration: 0.4 });
      gsap.fromTo([chrome.current, closeBtn.current], { opacity: 0 }, { opacity: 1, duration: 0.35, delay: 0.45 });
    }
    toggleBtn.current?.focus({ preventScroll: true });
    // opened by a click, so sound is allowed; if the browser still refuses, start muted
    const v = video.current;
    v?.play().catch(() => {
      if (!v) return;
      v.muted = true;
      setMuted(true);
      v.play().catch(() => {});
    });
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = "";
      prevFocus?.focus({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // progress ring follows the playhead every frame only while playing
  useEffect(() => {
    const v = video.current;
    const ring = progress.current;
    if (!v || !ring) return;
    let raf = 0;
    const draw = () => {
      const p = v.duration ? v.currentTime / v.duration : 0;
      ring.style.strokeDashoffset = String(RING_C * (1 - p));
      if (!v.paused) raf = requestAnimationFrame(draw);
    };
    const onPlay = () => {
      setPlaying(true);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };
    const onPause = () => {
      setPlaying(false);
      draw();
    };
    const onTime = () => setTime(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    const onSeek = () => {
      draw();
      onTime();
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("seeked", onSeek);
    v.addEventListener("loadedmetadata", onMeta);
    if (v.readyState >= 1) onMeta();
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("seeked", onSeek);
      v.removeEventListener("loadedmetadata", onMeta);
    };
  }, []);

  const toggle = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  };
  const seek = (dt: number) => {
    const v = video.current;
    if (v?.duration) v.currentTime = Math.min(v.duration, Math.max(0, v.currentTime + dt));
  };
  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    video.current?.pause();
    if (prefersReducedMotion()) {
      gsap.to(shell.current, { opacity: 0, duration: 0.2, onComplete: onClose });
      return;
    }
    // measure the way back, then continue from wherever a swipe left the circle
    const st = stage.current!;
    const now = { y: gsap.getProperty(st, "y"), scale: gsap.getProperty(st, "scale") };
    const to = fromCard();
    gsap.set(st, now);
    gsap.to([chrome.current, closeBtn.current], { opacity: 0, duration: 0.15 });
    gsap.to(backdrop.current, { opacity: 0, duration: 0.5, delay: 0.1 });
    gsap.to(stage.current, { ...to, duration: 0.6, ease: "expo.inOut", onComplete: onClose });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  // keyboard, focus trap, swipe down
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return close();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        seek(e.key === "ArrowRight" ? 5 : -5);
      }
      if (e.key === "m" || e.key === "M" || e.key === "ь" || e.key === "Ь") toggleSound();
      if (e.key === "Tab") {
        const focusables = shell.current?.querySelectorAll<HTMLElement>("button");
        if (!focusables?.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
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
    const sh = shell.current!;
    let startY = 0;
    let dy = 0;
    let dragging = false;
    let moved = false;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true;
      moved = false;
      startY = e.clientY;
      dy = 0;
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      dy = Math.max(0, e.clientY - startY);
      if (dy > 6) moved = true;
      gsap.set(stage.current, { y: dy, scale: 1 - Math.min(dy / innerHeight, 0.3) * 0.5 });
      gsap.set(backdrop.current, { opacity: 1 - Math.min(dy / 400, 0.7) });
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      if (dy > 120) close();
      else if (moved) {
        gsap.to(stage.current, { y: 0, scale: 1, duration: 0.5, ease: "expo.out" });
        gsap.to(backdrop.current, { opacity: 1, duration: 0.3 });
      }
    };
    // a drag must not also toggle playback
    const click = (e: MouseEvent) => {
      if (moved) {
        e.stopPropagation();
        e.preventDefault();
        moved = false;
      }
    };
    sh.addEventListener("pointerdown", down);
    sh.addEventListener("click", click, true);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      window.removeEventListener("keydown", onKey);
      sh.removeEventListener("pointerdown", down);
      sh.removeEventListener("click", click, true);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [close]);

  const total = duration || 42;
  return createPortal(
    <div ref={shell} className={styles.player} role="dialog" aria-modal="true" aria-label={`Видеоотзыв: ${review.author}`}>
      <div ref={backdrop} className={styles.backdrop} onClick={close} />
      <div className={styles.layout}>
        <div ref={stage} className={styles.stage}>
          <svg className={styles.progress} viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r={RING_R} className={styles.progressTrack} />
            <circle
              ref={progress}
              cx="50"
              cy="50"
              r={RING_R}
              className={styles.progressBar}
              strokeDasharray={RING_C}
              strokeDashoffset={RING_C}
            />
          </svg>
          <button
            ref={toggleBtn}
            type="button"
            className={styles.screen}
            onClick={toggle}
            aria-label={playing ? "Пауза" : "Смотреть"}
            aria-keyshortcuts="Space ArrowLeft ArrowRight M"
          >
            {review.video ? (
              <video ref={video} className={styles.video} src={review.video} poster={review.poster} playsInline preload="auto">
                {review.subtitles && <track kind="subtitles" src={review.subtitles} srcLang="ru" label="Русские" default />}
              </video>
            ) : (
              <Image src={review.poster} alt="" fill sizes="520px" className={styles.video} />
            )}
            <span className={styles.bigPlay} data-show={playing ? undefined : ""} aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 13 13">
                <path d="M12.25 6.5L2.5 12.13V0.87L12.25 6.5Z" fill="#09090b" />
              </svg>
            </span>
          </button>
        </div>

        <div ref={chrome} className={styles.chrome}>
          <div className={styles.controls}>
            <button type="button" className={styles.ctrl} onClick={toggle} aria-label={playing ? "Пауза" : "Воспроизвести"}>
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <rect x="3" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
                  <rect x="8" y="2" width="3" height="10" rx="0.5" fill="currentColor" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 13 13" aria-hidden="true">
                  <path d="M11.5 6.5L3 11.4V1.6L11.5 6.5Z" fill="currentColor" />
                </svg>
              )}
            </button>
            <span className={styles.time} aria-live="off">
              {fmt(time)} / {fmt(total)}
            </span>
            <button type="button" className={styles.ctrl} onClick={toggleSound} aria-label={muted ? "Включить звук" : "Выключить звук"} aria-pressed={muted}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <path d="M2.5 6h2.2L8 3.2v9.6L4.7 10H2.5z" strokeLinejoin="round" />
                {muted ? <path d="M10.6 6l3.4 4M14 6l-3.4 4" strokeLinecap="round" /> : <path d="M10.6 5.6a3.2 3.2 0 010 4.8M12.4 4a5.6 5.6 0 010 8" strokeLinecap="round" />}
              </svg>
            </button>
          </div>
          <p className={styles.playerQuote}>{review.quote}</p>
          <p className={styles.playerAuthor}>{review.author}</p>
        </div>
      </div>
      <button ref={closeBtn} type="button" className={styles.close} onClick={close} aria-label="Закрыть видео">
        <Icon name="close" size={20} stroke={1.6} />
      </button>
    </div>,
    document.body,
  );
}
