"use client";

import { useEffect, useState } from "react";

interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: string;
  /** Label do segmento que deve estar destacado (sync externo). */
  hoveredLabel?: string | null;
  /** Callback quando o hover muda no donut (pra sincar com legenda). */
  onHoverChange?: (label: string | null) => void;
  /** Formato pra valor exibido no centro quando um segmento estiver em hover. */
  hoveredCenterFormat?: (segment: DonutSegment, pct: number) => {
    value: string;
    label: string;
  };
}

const HOVER_SCALE = 1.06;
const HOVER_THICKNESS_BONUS = 4;

/**
 * Donut SVG puro com hover "alto relevo".
 * Limita a 6 segmentos (resto vira "Outros") seguindo charts guideline #3.
 */
export function DonutChart({
  segments,
  size = 200,
  thickness = 32,
  centerLabel,
  centerValue,
  hoveredLabel,
  onHoverChange,
  hoveredCenterFormat,
}: DonutChartProps) {
  // Estado interno só usado se onHoverChange não for fornecido
  const [internalHover, setInternalHover] = useState<string | null>(null);
  const activeHover = hoveredLabel !== undefined ? hoveredLabel : internalHover;

  function setHover(label: string | null) {
    if (onHoverChange) onHoverChange(label);
    else setInternalHover(label);
  }

  const radius = (size - thickness - HOVER_THICKNESS_BONUS * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  const total = segments.reduce((s, seg) => s + seg.value, 0);

  // Agrupar pra no max 6 segmentos
  let displaySegments = segments;
  if (segments.length > 6) {
    const sorted = [...segments].sort((a, b) => b.value - a.value);
    const top = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const restTotal = rest.reduce((s, seg) => s + seg.value, 0);
    displaySegments = [
      ...top,
      { label: `Outros (${rest.length})`, value: restTotal, color: "#94a3b8" },
    ];
  }

  // Anima do zero no mount
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  let cumulativePct = 0;
  const arcs = displaySegments.map((seg, i) => {
    const pct = total > 0 ? seg.value / total : 0;
    const length = pct * circumference;
    const offset = -cumulativePct * circumference;
    cumulativePct += pct;
    return { seg, length, offset, pct, key: `${seg.label}-${i}` };
  });

  // Determina conteúdo do centro
  const hoveredArc = activeHover
    ? arcs.find((a) => a.seg.label === activeHover)
    : null;
  let displayValue = centerValue ?? "";
  let displayLabel = centerLabel ?? "";
  if (hoveredArc && hoveredCenterFormat) {
    const formatted = hoveredCenterFormat(hoveredArc.seg, hoveredArc.pct * 100);
    displayValue = formatted.value;
    displayLabel = formatted.label;
  } else if (hoveredArc) {
    displayValue = `${(hoveredArc.pct * 100).toFixed(hoveredArc.pct < 0.1 ? 1 : 0)}%`;
    displayLabel = hoveredArc.seg.label;
  }

  if (total === 0) {
    return (
      <div
        className="relative grid place-items-center"
        style={{ width: size, height: size }}
      >
        <svg width={size} height={size}>
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={thickness}
            strokeDasharray="4 4"
            opacity={0.5}
          />
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <p className="text-xs text-[color:var(--muted-foreground)]">Sem dados</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90 overflow-visible"
        onMouseLeave={() => setHover(null)}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={thickness}
        />
        {/* Segments — animam dasharray + scale/stroke no hover */}
        {arcs.map(({ seg, length, offset, key }) => {
          const isHovered = activeHover === seg.label;
          const isDimmed = activeHover !== null && !isHovered;
          const animatedLength = mounted ? length : 0;
          return (
            <circle
              key={key}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={isHovered ? thickness + HOVER_THICKNESS_BONUS : thickness}
              strokeDasharray={`${animatedLength} ${circumference - animatedLength}`}
              strokeDashoffset={offset}
              strokeLinecap="butt"
              className="cursor-pointer"
              onMouseEnter={() => setHover(seg.label)}
              style={{
                transition:
                  "stroke-dasharray 800ms cubic-bezier(0.22, 1, 0.36, 1), stroke-width 200ms ease-out, opacity 200ms ease-out, filter 200ms ease-out, transform 250ms cubic-bezier(0.22, 1, 0.36, 1)",
                opacity: isDimmed ? 0.4 : 1,
                filter: isHovered
                  ? "drop-shadow(0 0 8px rgba(0,0,0,0.35)) brightness(1.08)"
                  : "none",
                transform: isHovered ? `scale(${HOVER_SCALE})` : "scale(1)",
                transformOrigin: `${cx}px ${cy}px`,
                transformBox: "view-box",
              }}
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center pointer-events-none px-6">
        <div className="transition-opacity duration-200">
          {displayValue && (
            <p
              className={`font-semibold tabular-nums leading-tight transition-all duration-200 ${
                hoveredArc ? "text-xl" : "text-xl"
              }`}
            >
              {displayValue}
            </p>
          )}
          {displayLabel && (
            <p
              className={`text-[10px] uppercase tracking-wide mt-1 transition-colors duration-200 line-clamp-2 ${
                hoveredArc
                  ? "text-[color:var(--foreground)] font-medium"
                  : "text-[color:var(--muted-foreground)]"
              }`}
            >
              {displayLabel}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
