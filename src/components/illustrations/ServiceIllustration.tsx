import type { CSSProperties, ReactNode } from "react";
import type { IllustrationKind } from "@/content/site";
import styles from "./ServiceIllustration.module.css";

/**
 * Layered HTML compositions of the 8 service mini-illustrations (Figma 181:1052…181:1221).
 * Geometry is authored on the desktop 306×200 stage and scaled for mobile (0.78) and
 * mega-menu thumbs (0.3137) via --ill-scale. Every card is its own layer: `data-depth`
 * drives the hover parallax (4 / 8 / 14 px), `data-accent` marks the mint element.
 */

type Box = { x: number; y: number; w: number; h: number };
const pos = ({ x, y, w, h }: Box): CSSProperties => ({ left: x, top: y, width: w, height: h });

function Card({
  box,
  depth,
  children,
  r = 8,
  bg,
  rotate,
  opacity,
  accent,
}: {
  box: Box;
  depth: 1 | 2 | 3;
  children?: ReactNode;
  r?: number;
  bg?: string;
  rotate?: number;
  opacity?: number;
  accent?: boolean;
}) {
  return (
    <div
      className={styles.layer}
      data-depth={depth}
      data-accent={accent ? "" : undefined}
      style={{ ...pos(box), ["--rot" as string]: rotate ? `${rotate}deg` : undefined, opacity }}
    >
      <div className={styles.card} style={{ borderRadius: r, background: bg }}>
        {children}
      </div>
    </div>
  );
}

/** a filled rectangle inside a card (coordinates relative to the card's padding box) */
function R({ x, y, w, h, c, r, accent, border }: Box & { c: string; r?: number; accent?: boolean; border?: boolean }) {
  return (
    <span
      className={styles.r}
      data-accent={accent ? "" : undefined}
      style={{
        ...pos({ x, y, w, h }),
        background: c,
        borderRadius: r,
        boxShadow: border ? "inset 0 0 0 1px #e4e4e7" : undefined,
      }}
    />
  );
}

const MINT = "#6aeec7";
const INK = "#18181b";
const G1 = "#f4f4f5";
const G2 = "#d4d4d8";

function Shop({ x, y, accent, depth }: { x: number; y: number; accent?: boolean; depth: 1 | 2 | 3 }) {
  return (
    <Card box={{ x, y, w: 74, h: 110 }} depth={depth}>
      <R x={7} y={7} w={58} h={52} c={G1} r={8} />
      <R x={7} y={67} w={50} h={5} c={G2} />
      <R x={7} y={77} w={30} h={5} c={G1} />
      <R x={7} y={89} w={58} h={12} c={accent ? MINT : G1} r={2} accent={accent} />
    </Card>
  );
}

function Screen({ x, depth, ink, accent }: { x: number; depth: 1 | 2 | 3; ink?: boolean; accent?: boolean }) {
  return (
    <Card box={{ x, y: 52, w: 60, h: 96 }} depth={depth} r={6}>
      <R x={7} y={9} w={44} h={6} c={ink ? INK : G2} />
      <R x={7} y={21} w={44} h={30} c={G1} r={2} />
      <R x={7} y={59} w={30} h={4} c={G2} />
      <R x={7} y={75} w={44} h={10} c={accent ? MINT : G1} r={2} accent={accent} />
    </Card>
  );
}

function Connector({ x }: { x: number }) {
  return (
    <span className={styles.layer} data-depth={2} style={pos({ x, y: 98, w: 20, h: 5 })}>
      <span className={styles.r} style={{ left: 0, top: 2, width: 18, height: 1, background: G2 }} />
      <span className={styles.r} style={{ left: 15, top: 0, width: 5, height: 5, background: INK, borderRadius: 3 }} />
    </span>
  );
}

const SCENES: Record<IllustrationKind, ReactNode> = {
  sites: (
    <Card box={{ x: 53, y: 32, w: 200, h: 136 }} depth={2}>
      <R x={-1} y={-1} w={200} h={18} c={G1} />
      {[7, 15, 23].map((x) => (
        <R key={x} x={x} y={5} w={5} h={5} c={G2} r={3} />
      ))}
      <R x={15} y={35} w={110} h={10} c={INK} r={1} />
      <R x={15} y={51} w={80} h={10} c={G2} r={1} />
      <R x={15} y={71} w={150} h={5} c={G1} />
      <R x={15} y={80} w={120} h={5} c={G1} />
      <R x={15} y={101} w={56} h={16} c={MINT} r={2} accent />
    </Card>
  ),
  shops: (
    <>
      <Shop x={30} y={49} depth={1} />
      <Shop x={116} y={41} depth={3} accent />
      <Shop x={202} y={49} depth={2} />
    </>
  ),
  apps: (
    <>
      <Card box={{ x: 89, y: 36, w: 84, h: 140 }} depth={1} r={12} opacity={0.6}>
        <R x={9} y={13} w={64} h={8} c={G1} />
      </Card>
      <Card box={{ x: 133, y: 20, w: 84, h: 160 }} depth={3} r={12}>
        <R x={27} y={5} w={28} h={5} c={G1} r={2.5} />
        {[25, 53, 81, 109].map((y, i) => (
          <span key={y}>
            <R x={9} y={y} w={16} h={16} c={i === 0 ? MINT : G1} r={8} accent={i === 0} />
            <R x={31} y={y + 3} w={40} h={4} c={G2} />
            <R x={31} y={y + 10} w={26} h={4} c={G1} />
          </span>
        ))}
        <R x={9} y={133} w={64} h={14} c={INK} r={3} />
      </Card>
    </>
  ),
  services: (
    <Card box={{ x: 43, y: 31, w: 220, h: 138 }} depth={2}>
      <R x={-1} y={-1} w={44} h={138} c={G1} r={8} />
      {[13, 29, 45, 61].map((y, i) => (
        <R key={y} x={9} y={y} w={24} h={4} c={i === 0 ? INK : G2} />
      ))}
      {[55, 111, 167].map((x, i) => (
        <span key={x} className={styles.sub} data-depth={3} style={pos({ x, y: 11, w: 46, h: 30 })}>
          <R x={5} y={6} w={18} h={4} c={G2} />
          <R x={5} y={15} w={28} h={6} c={i === 0 ? INK : G1} />
        </span>
      ))}
      {[
        [57, 103, 22],
        [82, 91, 34],
        [107, 97, 28],
        [132, 79, 46],
        [157, 87, 38],
      ].map(([x, y, h]) => (
        <R key={x} x={x} y={y} w={14} h={h} c={G2} />
      ))}
      <R x={182} y={65} w={14} h={60} c={MINT} accent />
    </Card>
  ),
  graphic: (
    <>
      <Card box={{ x: 58.78, y: 36.3, w: 88, h: 118 }} depth={1} rotate={-8}>
        <R x={9} y={9} w={68} h={60} c={G1} r={8} />
        <R x={9} y={79} w={40} h={5} c={G2} />
      </Card>
      <Card box={{ x: 158.36, y: 48.55, w: 88, h: 118 }} depth={2} rotate={8} bg={MINT} accent>
        <R x={9} y={89} w={68} h={6} c="#fff" />
        <R x={9} y={99} w={36} h={6} c="#fff" />
      </Card>
      <Card box={{ x: 109, y: 27, w: 88, h: 118 }} depth={3}>
        <R x={21} y={17} w={44} h={44} c={INK} r={22} />
        <R x={13} y={77} w={60} h={6} c={G2} />
        <R x={13} y={89} w={40} h={6} c={G1} />
      </Card>
    </>
  ),
  marketing: (
    <>
      <Card box={{ x: 37, y: 41, w: 118, h: 96 }} depth={1}>
        <R x={7} y={7} w={102} h={46} c={G1} r={8} />
        <R x={7} y={61} w={70} h={5} c={G2} />
        <R x={7} y={71} w={46} h={5} c={G1} />
        <R x={7} y={81} w={34} h={8} c={MINT} r={2} accent />
      </Card>
      <Card box={{ x: 163, y: 63, w: 106, h: 96 }} depth={3}>
        {[
          [9, 69, 16],
          [27, 59, 26],
          [45, 63, 22],
          [63, 47, 38],
        ].map(([x, y, h]) => (
          <R key={x} x={x} y={y} w={11} h={h} c={G2} />
        ))}
        <R x={81} y={33} w={11} h={52} c={MINT} accent />
        <R x={9} y={9} w={40} h={5} c={INK} />
      </Card>
    </>
  ),
  brand: (
    <>
      <Card box={{ x: 35, y: 40, w: 112, h: 120 }} depth={2} bg={INK}>
        <R x={29} y={23} w={52} h={52} c={MINT} r={26} accent />
        <R x={23} y={89} w={64} h={5} c="#3a3a3a" />
      </Card>
      <Card box={{ x: 155, y: 40, w: 112, h: 56 }} depth={3}>
        <R x={9} y={15} w={20} h={24} c={MINT} r={2} />
        <R x={33} y={15} w={20} h={24} c={INK} r={2} />
        <R x={57} y={15} w={20} h={24} c={G2} r={2} />
        <R x={81} y={15} w={20} h={24} c="#fff" r={2} border />
      </Card>
      <Card box={{ x: 155, y: 104, w: 112, h: 56 }} depth={1}>
        <R x={11} y={13} w={30} h={26} c={INK} r={2} />
        <R x={49} y={15} w={48} h={5} c={G2} />
        <R x={49} y={25} w={34} h={5} c={G1} />
      </Card>
    </>
  ),
  product: (
    <>
      <Screen x={35} depth={1} />
      <Connector x={99} />
      <Screen x={121} depth={2} ink />
      <Connector x={185} />
      <Screen x={207} depth={3} accent />
    </>
  ),
};

export function ServiceIllustration({ kind, className }: { kind: IllustrationKind; className?: string }) {
  return (
    <div className={`${styles.stage} ${className ?? ""}`} aria-hidden="true" data-illustration={kind}>
      {SCENES[kind]}
    </div>
  );
}
