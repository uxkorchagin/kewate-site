"use client";

import type { ReactNode } from "react";
import { SmoothScroll } from "./SmoothScroll";
import { Preloader } from "./Preloader";
import { SectionTransitions } from "./SectionTransitions";
import { Toaster } from "@/components/ui/Toast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SmoothScroll>
      <Preloader />
      {children}
      <SectionTransitions />
      <Toaster />
    </SmoothScroll>
  );
}
