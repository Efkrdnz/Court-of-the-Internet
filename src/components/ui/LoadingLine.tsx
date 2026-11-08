"use client";

import { useEffect, useState } from "react";

const LINES = [
  "Powdering the wigs…",
  "Waking the jury cats…",
  "Locating the missing fry…",
  "Reading the confession aloud, dramatically…",
  "Bribing the bailiff with a sandwich…",
  "Polishing the gavel…",
];

/** Cycles through funny loading messages. */
export function LoadingLine() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % LINES.length), 1600);
    return () => clearInterval(t);
  }, []);
  return <p className="font-display text-xl italic text-parchment/80">{LINES[i]}</p>;
}
