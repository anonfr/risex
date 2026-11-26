"use client";

import React, { useId, useMemo, useState } from "react";
import { fmtCompactUsd, fmtPrice, fmtTimestamp, fmtUsd } from "@/lib/format";

export interface TimePoint {
  timeMs: number;
  value: number;
}

export function AreaLineChart({
  data,
  height = 220,
  valuePrefix = "usd",
  color = "var(--mint)",
  showZeroLine = false,
}: {
  data: TimePoint[];
  height?: number;
  valuePrefix?: "usd" | "compact" | "price" | "pct";
  color?: string;
  showZeroLine?: boolean;
}) {
  const gradId = useId();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const fmtVal = (v: number) => {
    if (valuePrefix === "compact") return fmtCompactUsd(v);
    if (valuePrefix === "price") return fmtPrice(v);
    if (valuePrefix === "pct") return `${v >= 0 ? "+" : ""}${v.toFixed(4)}%`;
    return fmtUsd(v, showZeroLine);
  };

  const { points, areaPath, linePath, zeroY, minV, maxV } = useMemo(() => {
    if (!data || data.length === 0) {
      return { points: [], areaPath: "", linePath: "", zeroY: null, minV: 0, maxV: 0 };
    }
    const vals = data.map((d) => d.value);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || Math.abs(max) * 0.02 || 1;
    const padMin = min - span * 0.08;
    const padMax = max + span * 0.08;
    const W = 680;
    const H = height;
    const padX = 8;
    const padY = 14;
    const usableW = W - padX * 2;
    const usableH = H - padY * 2;

    const pts = data.map((d, i) => {
      const x =
        data.length === 1 ? padX + usableW / 2 : padX + (i / (data.length - 1)) * usableW;
      const y = padY + (1 - (d.value - padMin) / (padMax - padMin)) * usableH;
      return { x, y, ...d };
    });

    const line = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
    const area =
      pts.length > 1
        ? `${line} L ${pts[pts.length - 1].x.toFixed(2)} ${(H - padY).toFixed(2)} L ${pts[0].x.toFixed(2)} ${(H - padY).toFixed(2)} Z`
        : "";

    const zy =
      showZeroLine && padMin < 0 && padMax > 0
        ? padY + (1 - (0 - padMin) / (padMax - padMin)) * usableH
        : null;

    return { points: pts, areaPath: area, linePath: line, zeroY: zy, minV: min, maxV: max };
  }, [data, height, showZeroLine]);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border text-xs"
        style={{ height, borderColor: "var(--line)", color: "var(--text-dim)" }}
      >
        No chart series available for this range
      </div>
    );
  }

  const active = hoverIdx !== null && points[hoverIdx] ? points[hoverIdx] : points[points.length - 1];

  return (
    <div className="relative select-none">
      <div className="mb-2 flex items-center justify-between text-xs">
        <div className="font-mono-num font-semibold" style={{ color }}>
          {fmtVal(active.value)}
        </div>
        <div className="font-mono-num" style={{ color: "var(--text-dim)" }}>
          {active.timeMs ? fmtTimestamp(active.timeMs) : ""} · Range: {fmtVal(minV)} → {fmtVal(maxV)}
        </div>
      </div>
      <svg
        viewBox={`0 0 680 ${height}`}
        className="w-full overflow-visible touch-pan-y"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchEnd={() => setHoverIdx(null)}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (!touch) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (touch.clientX - rect.left) / rect.width;
          const idx = Math.max(0, Math.min(points.length - 1, Math.round(relX * (points.length - 1))));
          setHoverIdx(idx);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width;
          const idx = Math.max(0, Math.min(points.length - 1, Math.round(relX * (points.length - 1))));
          setHoverIdx(idx);
        }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {zeroY !== null && (
          <line
            x1="8"
            x2="672"
            y1={zeroY}
            y2={zeroY}
            stroke="var(--line-mid)"
            strokeDasharray="4 4"
            strokeWidth="1"
          />
        )}

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {active && (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1="10"
              y2={height - 10}
              stroke="var(--line-mid)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="4.5"
              fill={color}
              stroke="var(--bg)"
              strokeWidth="2"
            />
          </>
        )}
      </svg>
    </div>
  );
}

export interface CandlePoint {
  timeMs: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function CandlestickChart({
  candles,
  height = 260,
}: {
  candles: CandlePoint[];
  height?: number;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!candles || candles.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border text-xs"
        style={{ height, borderColor: "var(--line)", color: "var(--text-dim)" }}
      >
        No OHLC candles returned for this timeframe
      </div>
    );
  }

  const W = 720;
  const priceH = height - 46;
  const volH = 34;
  const padX = 10;
  const padY = 10;

  const lows = candles.map((c) => c.low);
  const highs = candles.map((c) => c.high);
  const minP = Math.min(...lows);
  const maxP = Math.max(...highs);
  const span = maxP - minP || maxP * 0.01 || 1;
  const pMin = minP - span * 0.06;
  const pMax = maxP + span * 0.06;
  const maxVol = Math.max(...candles.map((c) => c.volume), 1e-9);

  const stepW = (W - padX * 2) / candles.length;
  const bodyW = Math.max(2.5, Math.min(12, stepW * 0.62));
  const yOf = (p: number) => padY + (1 - (p - pMin) / (pMax - pMin)) * (priceH - padY);

  const active =
    hoverIdx !== null && candles[hoverIdx] ? candles[hoverIdx] : candles[candles.length - 1];

  return (
    <div className="relative select-none">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-num">
        <div className="flex items-center gap-3 flex-wrap">
          <span style={{ color: "var(--text-mute)" }}>
            O <strong style={{ color: "var(--text)" }}>{fmtPrice(active.open)}</strong>
          </span>
          <span style={{ color: "var(--text-mute)" }}>
            H <strong style={{ color: "var(--up)" }}>{fmtPrice(active.high)}</strong>
          </span>
          <span style={{ color: "var(--text-mute)" }}>
            L <strong style={{ color: "var(--down)" }}>{fmtPrice(active.low)}</strong>
          </span>
          <span style={{ color: "var(--text-mute)" }}>
            C{" "}
            <strong
              style={{
                color: active.close >= active.open ? "var(--up)" : "var(--down)",
              }}
            >
              {fmtPrice(active.close)}
            </strong>
          </span>
        </div>
        <span style={{ color: "var(--text-dim)" }}>
          {fmtTimestamp(active.timeMs)}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full overflow-visible touch-pan-y"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchEnd={() => setHoverIdx(null)}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (!touch) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (touch.clientX - rect.left) / rect.width;
          const idx = Math.max(0, Math.min(candles.length - 1, Math.floor(relX * candles.length)));
          setHoverIdx(idx);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width;
          const idx = Math.max(0, Math.min(candles.length - 1, Math.floor(relX * candles.length)));
          setHoverIdx(idx);
        }}
      >
        {/* Subtle horizontal price guides */}
        {[0.25, 0.5, 0.75].map((f) => {
          const y = padY + f * (priceH - padY);
          return (
            <line
              key={f}
              x1={padX}
              x2={W - padX}
              y1={y}
              y2={y}
              stroke="var(--line)"
              strokeWidth="1"
            />
          );
        })}

        {candles.map((c, i) => {
          const cx = padX + i * stepW + stepW / 2;
          const isUp = c.close >= c.open;
          const col = isUp ? "var(--up)" : "var(--down)";
          const yHigh = yOf(c.high);
          const yLow = yOf(c.low);
          const yOpen = yOf(c.open);
          const yClose = yOf(c.close);
          const rectY = Math.min(yOpen, yClose);
          const rectH = Math.max(1.8, Math.abs(yClose - yOpen));
          const vH = (c.volume / maxVol) * volH;

          return (
            <g key={c.timeMs + "-" + i} opacity={hoverIdx === null || hoverIdx === i ? 1 : 0.65}>
              <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={col} strokeWidth="1.2" />
              <rect
                x={cx - bodyW / 2}
                y={rectY}
                width={bodyW}
                height={rectH}
                rx="1"
                fill={col}
              />
              <rect
                x={cx - bodyW / 2}
                y={height - vH}
                width={bodyW}
                height={Math.max(1, vH)}
                rx="1"
                fill={col}
                opacity="0.32"
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function BarSeriesChart({
  data,
  height = 170,
  formatMode = "compact",
  signed = false,
}: {
  data: TimePoint[];
  height?: number;
  formatMode?: "compact" | "funding";
  signed?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border text-xs"
        style={{ height, borderColor: "var(--line)", color: "var(--text-dim)" }}
      >
        No data series
      </div>
    );
  }

  const W = 680;
  const padX = 8;
  const padY = 12;
  const vals = data.map((d) => d.value);
  const maxAbs = Math.max(...vals.map((v) => Math.abs(v)), 1e-9);
  const stepW = (W - padX * 2) / data.length;
  const barW = Math.max(3, Math.min(22, stepW * 0.65));
  const midY = signed ? height / 2 : height - padY;

  const active = hoverIdx !== null && data[hoverIdx] ? data[hoverIdx] : data[data.length - 1];
  const labelVal =
    formatMode === "funding"
      ? `${active.value >= 0 ? "+" : ""}${active.value.toFixed(4)}%`
      : fmtCompactUsd(active.value);

  return (
    <div className="select-none">
      <div className="mb-2 flex items-center justify-between text-xs font-mono-num">
        <span
          className="font-semibold"
          style={{
            color:
              signed && active.value < 0 ? "var(--down)" : "var(--mint)",
          }}
        >
          {labelVal}
        </span>
        <span style={{ color: "var(--text-dim)" }}>{fmtTimestamp(active.timeMs)}</span>
      </div>

      <svg
        viewBox={`0 0 ${W} ${height}`}
        className="w-full touch-pan-y"
        style={{ height }}
        onMouseLeave={() => setHoverIdx(null)}
        onTouchEnd={() => setHoverIdx(null)}
        onTouchMove={(e) => {
          const touch = e.touches[0];
          if (!touch) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (touch.clientX - rect.left) / rect.width;
          const idx = Math.max(0, Math.min(data.length - 1, Math.floor(relX * data.length)));
          setHoverIdx(idx);
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const relX = (e.clientX - rect.left) / rect.width;
          const idx = Math.max(0, Math.min(data.length - 1, Math.floor(relX * data.length)));
          setHoverIdx(idx);
        }}
      >
        <line x1={padX} x2={W - padX} y1={midY} y2={midY} stroke="var(--line-mid)" strokeWidth="1" />
        {data.map((d, i) => {
          const x = padX + i * stepW + (stepW - barW) / 2;
          const avail = signed ? height / 2 - padY : height - padY * 2;
          const h = Math.max(2, (Math.abs(d.value) / maxAbs) * avail);
          const y = signed ? (d.value >= 0 ? midY - h : midY) : midY - h;
          const col = signed && d.value < 0 ? "var(--down)" : "var(--mint)";
          return (
            <rect
              key={d.timeMs + "-" + i}
              x={x}
              y={y}
              width={barW}
              height={h}
              rx="2"
              fill={col}
              opacity={hoverIdx === null || hoverIdx === i ? 0.9 : 0.45}
            />
          );
        })}
      </svg>
    </div>
  );
}

export function PnlCalendarHeatmap({
  days,
}: {
  days: Array<{ timeMs: number; pnl: number }>;
}) {
  const [hovered, setHovered] = useState<{ timeMs: number; pnl: number } | null>(null);
  if (!days || days.length === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-center text-xs"
        style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}
      >
        No daily PnL history found for this address.
      </div>
    );
  }

  const maxAbs = Math.max(...days.map((d) => Math.abs(d.pnl)), 1);
  const recent = days.slice(-56);
  const wins = recent.filter((d) => d.pnl > 0).length;
  const losses = recent.filter((d) => d.pnl < 0).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-3">
          <span style={{ color: "var(--text-mute)" }}>
            Last {recent.length} active days:{" "}
            <strong style={{ color: "var(--up)" }}>{wins} green</strong> ·{" "}
            <strong style={{ color: "var(--down)" }}>{losses} red</strong>
          </span>
        </div>
        <div className="font-mono-num" style={{ color: "var(--text-soft)" }}>
          {hovered ? (
            <>
              {new Date(hovered.timeMs).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
              :{" "}
              <strong
                style={{ color: hovered.pnl >= 0 ? "var(--up)" : "var(--down)" }}
              >
                {fmtUsd(hovered.pnl, true)}
              </strong>
            </>
          ) : (
            <span style={{ color: "var(--text-dim)" }}>Hover a day to inspect PnL</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-7 sm:grid-cols-14 gap-1.5">
        {recent.map((d, i) => {
          const intensity = Math.min(1, Math.max(0.18, Math.abs(d.pnl) / maxAbs));
          const bg =
            d.pnl > 0
              ? `rgba(46, 232, 142, ${intensity.toFixed(2)})`
              : d.pnl < 0
                ? `rgba(228, 106, 123, ${intensity.toFixed(2)})`
                : "var(--surface-2)";
          return (
            <div
              key={d.timeMs + "-" + i}
              onClick={() => setHovered(d)}
              onMouseEnter={() => setHovered(d)}
              onMouseLeave={() => setHovered(null)}
              className="h-8 sm:h-7 rounded-md border transition-transform hover:scale-110 cursor-pointer flex items-center justify-center text-[10px] font-mono-num"
              style={{
                background: bg,
                borderColor: "var(--line)",
                color: intensity > 0.55 ? "#03100f" : "var(--text-soft)",
              }}
              title={`${new Date(d.timeMs).toLocaleDateString()}: ${fmtUsd(d.pnl, true)}`}
            >
              {new Date(d.timeMs).getUTCDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
