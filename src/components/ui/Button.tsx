"use client";

import Link from "next/link";
import { forwardRef, useImperativeHandle, useRef, type ReactNode, type MouseEvent, type PointerEvent } from "react";
import { useMagnetic } from "@/components/motion/hooks";
import { SwapArrow } from "./Icon";
import styles from "./Button.module.css";

export type ButtonVariant = "white" | "outline" | "dark" | "mint";
type Size = "sm" | "md" | "lg";

type Props = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: Size;
  block?: boolean;
  href?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  magnet?: number;
  arrow?: number | false;
  arrowStroke?: number;
  /** colour that floods in from the pointer entry point */
  fill?: "mint" | "white" | "white-10" | "ink" | "none";
  border?: "run" | "none";
  icon?: ReactNode;
  /** no magnet, flood fill, running border or arrow swap — only a colour change on hover */
  plain?: boolean;
  className?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  "aria-label"?: string;
  "aria-describedby"?: string;
  external?: boolean;
};

const defaults: Record<ButtonVariant, Pick<Props, "fill" | "border">> = {
  white: { fill: "mint", border: "none" },
  outline: { fill: "white-10", border: "run" },
  dark: { fill: "white", border: "none" },
  mint: { fill: "none", border: "none" },
};

/**
 * Magnetic CTA: pulls toward the cursor, the arrow flies out ↗ and a fresh one flies in ↙,
 * the background floods from the pointer entry point (clip-path circle, 400ms expo.out).
 */
export const Button = forwardRef<HTMLElement, Props>(function Button(
  {
    children,
    variant = "white",
    size = "md",
    block,
    href,
    type = "button",
    disabled,
    magnet = 10,
    arrow = 13,
    arrowStroke = 1.25,
    fill,
    border,
    icon,
    plain,
    className,
    onClick,
    external,
    ...aria
  },
  forwarded,
) {
  const ref = useRef<HTMLElement>(null);
  const label = useRef<HTMLSpanElement>(null);
  useImperativeHandle(forwarded, () => ref.current as HTMLElement);
  useMagnetic(ref, { strength: plain ? 0 : magnet, inner: label, innerStrength: plain ? 0 : magnet / 2 });

  const f = plain ? "none" : (fill ?? defaults[variant].fill);
  const b = plain ? "none" : (border ?? defaults[variant].border);

  const setOrigin = (e: PointerEvent<HTMLElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--fx", `${e.clientX - r.left}px`);
    el.style.setProperty("--fy", `${e.clientY - r.top}px`);
  };

  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    block && styles.block,
    f && f !== "none" && styles[`fill-${f}`],
    plain ? styles.plain : "swap-host",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inner = (
    <>
      {f !== "none" && <span className={styles.fill} aria-hidden="true" />}
      {b === "run" && (
        <svg className={styles.run} aria-hidden="true">
          <rect x="0" y="0" width="100%" height="100%" rx="12" pathLength={100} />
        </svg>
      )}
      <span ref={label} className={styles.label}>
        <span className={styles.text}>
          {icon && <span className={styles.lead}>{icon}</span>}
          {children}
        </span>
        {arrow !== false && <SwapArrow size={arrow} stroke={arrowStroke} />}
      </span>
    </>
  );

  const common = {
    className: cls,
    onPointerEnter: setOrigin,
    onPointerLeave: setOrigin,
    onClick,
    ...aria,
  };

  if (href) {
    if (external || href.startsWith("http") || href.startsWith("tel:") || href.startsWith("mailto:")) {
      return (
        <a
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          {...common}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {inner}
        </a>
      );
    }
    return (
      <Link ref={ref as React.Ref<HTMLAnchorElement>} href={href} {...common}>
        {inner}
      </Link>
    );
  }
  return (
    <button ref={ref as React.Ref<HTMLButtonElement>} type={type} disabled={disabled} {...common}>
      {inner}
    </button>
  );
});
