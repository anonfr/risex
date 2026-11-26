"use client";

import React from "react";

const TICKER_COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#718096",
  BNB: "#f0b90b",
  SOL: "#14f195",
  HYPE: "#2ee88e",
  XRP: "#64748b",
  TAO: "#9ba5b1",
  ZEC: "#ecb244",
  NEAR: "#8d98a6",
  VVV: "#7d6cff",
  LIT: "#42bdf5",
  DOGE: "#c2a633",
  AERO: "#5b8def",
  AAVE: "#a65bc8",
  PUMP: "#35d58a",
  XAU: "#d9aa3d",
  XAG: "#aeb7c3",
  CL: "#d59c3a",
  BZ: "#4bb58a",
  SNDK: "#ef533f",
  SPCX: "#7899ff",
  DRAM: "#9b6cff",
  MU: "#3f78d6",
  QQQ: "#db4168",
  SPY: "#d9535f",
  INTC: "#3f8ee8",
  NVDA: "#76b900",
  GOOGL: "#4285f4",
  AAPL: "#a1abb7",
  AMZN: "#ff9900",
  TSLA: "#e31937",
  META: "#0668e1",
  AMD: "#ed1c24",
  MON: "#836ef9",
  ARB: "#28a0f0",
  ENA: "#a1abb7",
  WLD: "#cbd5e1",
  XMR: "#ff6600",
};

export function MarketBadge({
  symbol,
  size = 22,
}: {
  symbol: string;
  size?: number;
}) {
  const clean = (symbol || "?").split("/")[0].toUpperCase();
  const color = TICKER_COLORS[clean] || "var(--accent)";
  const label = clean.length > 4 ? clean.slice(0, 3) : clean.slice(0, 3);

  return (
    <span
      role="img"
      aria-label={`${clean} badge`}
      style={{
        width: size,
        height: size,
        flex: "0 0 auto",
        display: "inline-grid",
        placeItems: "center",
        borderRadius: "9999px",
        background: `color-mix(in oklab, ${color} 16%, rgba(255,255,255,0.03))`,
        border: `1px solid color-mix(in oklab, ${color} 42%, transparent)`,
        color,
        fontSize: Math.max(7, Math.round(size * 0.34)),
        fontWeight: 700,
        lineHeight: 1,
        letterSpacing: "-0.04em",
        fontFamily: "var(--font-mono)",
      }}
    >
      {label}
    </span>
  );
}

export function LiveDot({ paused = false }: { paused?: boolean }) {
  return (
    <span className={`live-dot ${paused ? "paused" : ""}`} aria-hidden="true">
      <i className="ping" />
      <i />
    </span>
  );
}
