"use client";

import { useEffect, useRef, useState } from "react";

interface CountUpProps {
  /** Valor alvo. Mudanças disparam tween a partir do valor anterior. */
  to: number;
  /** Função de formatação (ex: formatBRL, Math.round). */
  format?: (value: number) => string;
  /** Duração do tween em ms. */
  duration?: number;
  /** Se true, primeiro mount vai do 0 → to. Senão, primeiro render mostra `to` direto. */
  animateInitial?: boolean;
}

/**
 * Anima transições de números (ease-out cúbico).
 * Usado em KPIs e totais pra feedback delicioso quando o valor muda.
 */
export function CountUp({
  to,
  format = (n) => Math.round(n).toString(),
  duration = 700,
  animateInitial = true,
}: CountUpProps) {
  const [value, setValue] = useState(animateInitial ? 0 : to);
  const fromRef = useRef(animateInitial ? 0 : to);
  const firstRender = useRef(true);

  useEffect(() => {
    // Em primeiro render, se animateInitial=false, não tween
    if (firstRender.current && !animateInitial) {
      firstRender.current = false;
      fromRef.current = to;
      setValue(to);
      return;
    }
    firstRender.current = false;

    const from = fromRef.current;
    if (from === to) return;

    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = from + (to - from) * eased;
      setValue(current);
      if (progress < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [to, duration, animateInitial]);

  return <>{format(value)}</>;
}
