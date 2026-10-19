"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { computeSlots, type SlotsState, type Week } from "@/lib/slots";

/**
 * One source of truth for a service page (274:309): the slot calendar, the sticky bar, the week picker
 * and every CTA read the same calculation, and every CTA opens the lead form with a week already chosen.
 */

type OpenOptions = {
  /** ISO week key to preselect; the nearest open week when omitted */
  week?: string;
  /** «Получить демо» marks the request */
  demo?: boolean;
  /** what the visitor clicked, sent with the request (e.g. a service type) */
  topic?: string;
};

type LeadState = {
  now: number;
  /** false until the client clock replaced the build time — dates stay hidden meanwhile (html.js only) */
  ready: boolean;
  slots: SlotsState;
  nearest: Week | null;
  /** weeks the form offers: the nearest open one and the next three */
  pickable: Week[];
  selected: string | null;
  select: (key: string) => void;
  modal: { open: boolean; demo: boolean; topic?: string };
  openLead: (opts?: OpenOptions) => void;
  closeLead: () => void;
};

const Ctx = createContext<LeadState | null>(null);

export function useLead() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useLead outside <LeadProvider>");
  return v;
}

/** Same as useLead, but null outside a service page (shared components use it optionally). */
export const useLeadOptional = () => useContext(Ctx);

export function LeadProvider({
  children,
  initialNow,
  busy,
}: {
  children: ReactNode;
  /** build time: the static HTML is rendered with it, the client switches to the real clock after hydration */
  initialNow: number;
  /** ISO week keys a manager marked «Занято» */
  busy?: string[];
}) {
  const [now, setNow] = useState(initialNow);
  const [ready, setReady] = useState(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const [modal, setModal] = useState<LeadState["modal"]>({ open: false, demo: false });

  // real clock after hydration; the countdown shows minutes, so a 15 s tick is plenty
  useEffect(() => {
    setNow(Date.now());
    setReady(true);
    const id = setInterval(() => setNow(Date.now()), 15_000);
    const wake = () => document.visibilityState === "visible" && setNow(Date.now());
    document.addEventListener("visibilitychange", wake);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", wake);
    };
  }, []);

  // seats/labels only change per minute — keep the object stable between ticks of the same minute
  const minute = Math.floor(now / 60_000);
  // two weeks past the 5-week calendar, so the form can always offer four open weeks
  const all = useMemo(() => computeSlots(minute * 60_000, { busy, size: 7 }), [minute, busy]);
  const slots = useMemo<SlotsState>(() => ({ ...all, weeks: all.weeks.slice(0, 5) }), [all]);
  const nearest = slots.nearest >= 0 ? slots.weeks[slots.nearest] : null;
  const pickable = useMemo(() => all.weeks.filter((w) => w.status !== "busy").slice(0, 4), [all]);

  // a week that has closed meanwhile falls back to the nearest one
  const selected = chosen && pickable.some((w) => w.key === chosen) ? chosen : (nearest?.key ?? null);

  const openLead = useCallback((opts: OpenOptions = {}) => {
    if (opts.week) setChosen(opts.week);
    setModal({ open: true, demo: !!opts.demo, topic: opts.topic });
  }, []);
  const closeLead = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  const value = useMemo<LeadState>(
    () => ({ now, ready, slots, nearest, pickable, selected, select: setChosen, modal, openLead, closeLead }),
    [now, ready, slots, nearest, pickable, selected, modal, openLead, closeLead],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
