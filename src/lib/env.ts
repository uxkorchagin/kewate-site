"use client";

/** Media-query helpers shared by every motion hook. Safe to call during render on the server. */

export const MQ = {
  reduced: "(prefers-reduced-motion: reduce)",
  fine: "(hover: hover) and (pointer: fine)",
  mobile: "(max-width: 767px)",
} as const;

const mq = (q: string) =>
  typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(q).matches;

export const prefersReducedMotion = () => mq(MQ.reduced);
export const hasFinePointer = () => mq(MQ.fine);
export const isMobileViewport = () => mq(MQ.mobile);

/** true when heavy pointer-driven interactivity is allowed (desktop mouse, motion enabled) */
export const canHover = () => hasFinePointer() && !prefersReducedMotion();

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Pause work for elements outside the viewport. Returns a disposer. */
export function whenVisible(el: Element, onChange: (visible: boolean) => void, rootMargin = "100px") {
  if (typeof IntersectionObserver === "undefined") {
    onChange(true);
    return () => {};
  }
  const io = new IntersectionObserver(([entry]) => onChange(entry.isIntersecting), { rootMargin });
  io.observe(el);
  return () => io.disconnect();
}

export const toast = (message: string) =>
  window.dispatchEvent(new CustomEvent("kewate:toast", { detail: message }));

export async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
