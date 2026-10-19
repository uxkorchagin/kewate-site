"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { Flip } from "gsap/Flip";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText, Flip, useGSAP);
  gsap.defaults({ ease: "expo.out", duration: 0.9 });
  ScrollTrigger.config({ ignoreMobileResize: true });
}

export const EASE = {
  out: "expo.out",
  state: "power2.inOut",
  back: "back.out(1.7)",
  spring: "elastic.out(1, 0.55)",
} as const;

export { gsap, ScrollTrigger, SplitText, Flip, useGSAP };
