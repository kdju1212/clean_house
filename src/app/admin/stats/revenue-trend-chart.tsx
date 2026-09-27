"use client";

import { useRef, useState } from "react";
import type { MonthlyRevenuePoint } from "@/lib/admin-stats-service";

const VIEW_W = 328;
const VIEW_H = 150;
const PLOT_LEFT = 40;
const PLOT_RIGHT = VIEW_W - 8;
const PLOT_TOP = 24;
const PLOT_BOTTOM = VIEW_H - 32;

const BLUE = "#346aff";

function formatCompactWon(n: number): string {
  if (n >= 100_000_000) {
    const eok = n / 100_000_000;
    return `${Number.isInteger(eok) ? eok : eok.toFixed(1)}억원`;
  }
  if (n >= 10_000) return `${Math.round(n / 10_000)}만원`;
  return `${n.toLocaleString()}원`;
}

/** Smallest "clean" number (1/2/5 × 10^n) at or above `value`. */
function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const exponent = Math.floor(Math.log10(value));
  const magnitude = 10 ** exponent;
  const residual = value / magnitude;
  const niceResidual = residual <= 1 ? 1 : residual <= 2 ? 2 : residual <= 5 ? 5 : 10;
  return niceResidual * magnitude;
}

/**
 * Single-series line + area trend of monthly 거래액 — see choosing-a-form:
 * "trend over time" → line, area for a single series, sequential (one hue).
 * Hover shows a crosshair + readout, per interaction.md's "an HTML chart is
 * interactive by default."
 */
export function RevenueTrendChart({ data }: { data: MonthlyRevenuePoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const hasData = data.some((d) => d.revenue > 0);
  const maxValue = Math.max(...data.map((d) => d.revenue), 0);
  const niceMax = niceCeil(maxValue * 1.15);

  const n = data.length;
  const x = (i: number) => (n === 1 ? (PLOT_LEFT + PLOT_RIGHT) / 2 : PLOT_LEFT + (i / (n - 1)) * (PLOT_RIGHT - PLOT_LEFT));
  const y = (v: number) => PLOT_BOTTOM - (v / niceMax) * (PLOT_BOTTOM - PLOT_TOP);

  const points = data.map((d, i) => [x(i), y(d.revenue)] as const);
  const linePath = points.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px},${py}`).join(" ");
  const areaPath =
    points.length > 0
      ? `M${points[0][0]},${PLOT_BOTTOM} ` +
        points.map(([px, py]) => `L${px},${py}`).join(" ") +
        ` L${points[points.length - 1][0]},${PLOT_BOTTOM} Z`
      : "";

  function handlePointerMove(clientX: number) {
    const svg = svgRef.current;
    if (!svg || n === 0) return;
    const rect = svg.getBoundingClientRect();
    const relX = ((clientX - rect.left) / rect.width) * VIEW_W;
    let nearest = 0;
    let nearestDist = Infinity;
    for (let i = 0; i < n; i++) {
      const dist = Math.abs(x(i) - relX);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    }
    setHoverIndex(nearest);
  }

  if (!hasData) {
    return (
      <div className="flex h-[150px] items-center justify-center rounded-xl border border-dashed border-neutral-200 text-sm text-neutral-400">
        아직 완료된 예약이 없어요.
      </div>
    );
  }

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const tooltipBoxW = 92;
  const tooltipX = hoverIndex !== null
    ? Math.min(Math.max(x(hoverIndex) - tooltipBoxW / 2, PLOT_LEFT), PLOT_RIGHT - tooltipBoxW)
    : 0;

  const lastPoint = points[points.length - 1];
  const lastValue = data[data.length - 1];

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      className="w-full touch-none select-none"
      onMouseMove={(e) => handlePointerMove(e.clientX)}
      onMouseLeave={() => setHoverIndex(null)}
      onTouchStart={(e) => handlePointerMove(e.touches[0].clientX)}
      onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
      onTouchEnd={() => setHoverIndex(null)}
    >
      {[0, 0.5, 1].map((frac) => {
        const py = PLOT_BOTTOM - frac * (PLOT_BOTTOM - PLOT_TOP);
        return (
          <g key={frac}>
            <line x1={PLOT_LEFT} y1={py} x2={PLOT_RIGHT} y2={py} stroke="#e5e5e5" strokeWidth={1} />
            <text x={PLOT_LEFT - 6} y={py + 3} textAnchor="end" fontSize={9} fill="#a3a3a3">
              {formatCompactWon(niceMax * frac)}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill={BLUE} fillOpacity={0.1} />
      <path d={linePath} fill="none" stroke={BLUE} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

      {lastPoint && (
        <>
          <circle cx={lastPoint[0]} cy={lastPoint[1]} r={4} fill={BLUE} stroke="white" strokeWidth={2} />
          <text
            x={Math.min(lastPoint[0], PLOT_RIGHT - 4)}
            y={lastPoint[1] - 10}
            textAnchor="end"
            fontSize={10}
            fontWeight={600}
            fill="#171717"
          >
            {formatCompactWon(lastValue.revenue)}
          </text>
        </>
      )}

      {data.map((d, i) => (
        <text key={d.label} x={x(i)} y={PLOT_BOTTOM + 16} textAnchor="middle" fontSize={9} fill="#a3a3a3">
          {d.label}
        </text>
      ))}

      {hoverIndex !== null && hovered && (
        <g>
          <line
            x1={x(hoverIndex)}
            y1={PLOT_TOP}
            x2={x(hoverIndex)}
            y2={PLOT_BOTTOM}
            stroke="#d4d4d4"
            strokeWidth={1}
          />
          <circle cx={x(hoverIndex)} cy={y(hovered.revenue)} r={5} fill={BLUE} stroke="white" strokeWidth={2} />
          <rect
            x={tooltipX}
            y={2}
            width={tooltipBoxW}
            height={30}
            rx={6}
            fill="white"
            stroke="#e5e5e5"
            strokeWidth={1}
          />
          <text x={tooltipX + tooltipBoxW / 2} y={15} textAnchor="middle" fontSize={11} fontWeight={700} fill="#171717">
            {formatCompactWon(hovered.revenue)}
          </text>
          <text x={tooltipX + tooltipBoxW / 2} y={26} textAnchor="middle" fontSize={9} fill="#a3a3a3">
            {hovered.label} · 완료 {hovered.count}건
          </text>
        </g>
      )}
    </svg>
  );
}
