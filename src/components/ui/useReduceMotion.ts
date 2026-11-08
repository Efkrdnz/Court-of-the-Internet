"use client";

import { useSyncExternalStore } from "react";
import { useReducedMotionConfig } from "motion/react";

const noopSubscribe = () => () => {};

/**
 * Reduced-motion preference (OS setting or the player's own setting via MotionConfig),
 * but always `false` during server render and hydration so markup matches.
 */
export function useReduceMotion(): boolean {
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const reduce = useReducedMotionConfig();
  return hydrated && !!reduce;
}
