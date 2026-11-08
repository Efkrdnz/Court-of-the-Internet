"use client";

import { MotionConfig } from "motion/react";

/** Applies the player's "reduce motion" setting on top of the OS preference. */
export function MotionProvider({ reduce, children }: { reduce: boolean; children: React.ReactNode }) {
  return <MotionConfig reducedMotion={reduce ? "always" : "user"}>{children}</MotionConfig>;
}
