import type { SVGProps } from "react";

/** Vector icons exported from the Figma file (icon/* components), kept as inline SVG. */

type IconName =
  | "arrow-up-right"
  | "arrow-left"
  | "arrow-right"
  | "arrow-up"
  | "chevron-down"
  | "check"
  | "close"
  | "minus"
  | "tg"
  | "mail"
  | "ruble";

const PATHS: Record<IconName, { box: number; d: string }> = {
  "arrow-up-right": { box: 12, d: "M2.28 9.72L9.72 2.28M9.72 8.232V2.28H3.768" },
  "arrow-left": { box: 15, d: "M12.8996 7.49995H2.09961M6.14961 11.55L2.09961 7.49995L6.14961 3.44995" },
  "arrow-right": { box: 15, d: "M2.09961 7.49995H12.8996M8.84961 11.55L12.8996 7.49995L8.84961 3.44995" },
  "arrow-up": { box: 12, d: "M6 9.72V2.28M8.79 5.07L6 2.28L3.21 5.07" },
  "chevron-down": { box: 14, d: "M2.66 4.83L7 9.17L11.34 4.83" },
  check: { box: 12, d: "M1.68 6.30857L4.76571 9.08571L10.32 2.91429" },
  close: { box: 20, d: "M3.8 3.8L16.2 16.2M16.2 3.8L3.8 16.2" },
  minus: { box: 20, d: "M3.8 10H16.2" },
  tg: { box: 16, d: "M6.34667 8.82667L3.04 7.72444L12.96 3.86667L11.3067 11.5822L9.10222 9.92889L7.44889 12.1333L6.34667 8.82667ZM6.34667 8.82667L10.7556 5.52" },
  mail: { box: 16, d: "M12.96 4.69333V11.3067H3.04V4.69333H12.96ZM3.04 4.69333L8 8.55111L12.96 4.69333" },
  ruble: { box: 23, d: "M7.8775 19.78V3.22H13.0525C16.1575 3.22 17.71 5.29 17.71 7.8775C17.71 10.465 16.1575 12.535 13.0525 12.535H5.29M5.29 16.1575H13.57" },
};

export function Icon({
  name,
  size = 12,
  stroke = 1.4,
  ...rest
}: { name: IconName; size?: number; stroke?: number } & Omit<SVGProps<SVGSVGElement>, "stroke">) {
  const { box, d } = PATHS[name];
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${box} ${box}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path
        d={d}
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="square"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Two arrows stacked: the visible one flies out ↗, the spare flies in from ↙ (hover swap). */
export function SwapArrow({
  size = 12,
  stroke = 1.25,
  name = "arrow-up-right",
  className,
}: {
  size?: number;
  stroke?: number;
  name?: IconName;
  className?: string;
}) {
  return (
    <span className={`swap-arrow ${className ?? ""}`} style={{ width: size, height: size }} aria-hidden="true">
      <Icon name={name} size={size} stroke={stroke} className="swap-arrow__a" />
      <Icon name={name} size={size} stroke={stroke} className="swap-arrow__b" />
    </span>
  );
}
