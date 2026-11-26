"use client";

import React, { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { AreaLineChart, BarSeriesChart, CandlestickChart, CandlePoint } from "./Charts";
import { MarketBadge } from "./MarketBadge";
import { fmtCompactUsd, fmtPct, fmtPrice, fmtQty, fmtTimestamp } from "@/lib/format";
import { NormalizedMarket } from "@/lib/risex";

interface MarketDetailPayload {
  market: NormalizedMarket | null;
  orderbook: {
    bids: Array<{ price: number; quantity: number; orderCount: number }>;
    asks: Array<{ price: number; quantity: number; orderCount: number }>;
    totalBids: number;
    totalAsks: number;
  };
  trades: Array<{
    id: string;
    side: string;
    price: number;
    size: number;
    timeMs: number;
  }>;
  fundingHistory: Array<{
    ratePct: number;
    aprPct: number;
    indexPrice: number;
    timeMs: number;
  }>;
  candles: CandlePoint[];
}

export function MarketWorkbench({
  markets,
  initialMarketId = "1",
  onSelectMarket,
}: {
  markets: NormalizedMarket[];
  initialMarketId?: string;
  onSelectMarket?: (id: string) => void;
}) {
  const [localId, setLocalId] = useState(initialMarketId);
  const selectedId = onSelectMarket ? initialMarketId : localId;
  const handleMarketChange = (id: string) => {
    if (onSelectMarket) onSelectMarket(id);
    else setLocalId(id);
  };
  const [interval, setIntervalKey] = useState<"15m" | "1h" | "4h" | "1d">("1h");
  const [chartMode, setChartMode] = useState<"candles" | "line">("candles");
  const [detail, setDetail] = useState<MarketDetailPayload | null>(null);
  const [loadedKey, setLoadedKey] = useState<string>("");
  const currentKey = `${selectedId}:${interval}`;
  const loading = loadedKey !== currentKey;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/risex/market/${selectedId}?interval=${interval}`);
        const json = (await res.json()) as MarketDetailPayload;
        if (!cancelled) {
          setDetail(json);
          setLoadedKey(`${selectedId}:${interval}`);
        }
      } catch {
        if (!cancelled) setLoadedKey(`${selectedId}:${interval}`);
      }
    };
    load();
    const timer = setInterval(load, 12000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedId, interval]);

  const activeMarket =
    detail?.market || markets.find((m) => m.id === selectedId) || markets[0];

  const bids = detail?.orderbook.bids.slice(0, 10) || [];
  const asks = detail?.orderbook.asks.slice(0, 10) || [];
  const maxBookQty = Math.max(
    ...bids.map((b) => b.quantity),
    ...asks.map((a) => a.quantity),
    1e-9
  );
  const bestBid = bids[0]?.price || 0;
  const bestAsk = asks[0]?.price || 0;
  const spreadBps =
    bestBid > 0 && bestAsk > 0 ? ((bestAsk - bestBid) / ((bestAsk + bestBid) / 2)) * 10000 : 0;

  return (
    <div className="eco-card p-4 sm:p-5 space-y-5">
      {/* Top Bar: Market Selector + Market Stats */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {activeMarket && <MarketBadge symbol={activeMarket.symbol} size={24} />}
            <select
              value={selectedId}
              onChange={(e) => handleMarketChange(e.target.value)}
              className="w-full sm:w-auto rounded-[7px] border px-3 py-1.5 text-sm font-mono-num font-semibold outline-none cursor-pointer"
              style={{
                background: "var(--tab-bg)",
                borderColor: "var(--line)",
                color: "var(--text)",
              }}
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.symbol}/USDC · {m.label} ({m.sector})
                </option>
              ))}
            </select>
          </div>

          {activeMarket && (
            <div className="flex items-baseline gap-2.5">
              <span className="font-mono-num text-2xl font-semibold">
                {fmtPrice(activeMarket.markPrice)}
              </span>
              <span
                className="font-mono-num text-xs font-semibold px-2 py-0.5 rounded-md"
                style={{
                  color: activeMarket.change24hPct >= 0 ? "var(--up)" : "var(--down)",
                  background:
                    activeMarket.change24hPct >= 0
                      ? "var(--brand-mint-tint)"
                      : "rgba(255,101,101,0.12)",
                }}
              >
                {fmtPct(activeMarket.change24hPct)}
              </span>
            </div>
          )}
        </div>

        {activeMarket && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="rounded-lg px-3 py-2 border" style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}>
              <div style={{ color: "var(--text-dim)" }}>24h Volume</div>
              <div className="font-mono-num font-semibold mt-0.5">
                {fmtCompactUsd(activeMarket.volume24hUsd)}
              </div>
            </div>
            <div className="rounded-lg px-3 py-2 border" style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}>
              <div style={{ color: "var(--text-dim)" }}>Open Interest</div>
              <div className="font-mono-num font-semibold mt-0.5">
                {fmtCompactUsd(activeMarket.openInterestUsd)}
              </div>
            </div>
            <div className="rounded-lg px-3 py-2 border" style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}>
              <div style={{ color: "var(--text-dim)" }}>Funding (1h / APR)</div>
              <div
                className="font-mono-num font-semibold mt-0.5"
                style={{
                  color: activeMarket.funding1hPct >= 0 ? "var(--up)" : "var(--down)",
                }}
              >
                {activeMarket.funding1hPct.toFixed(4)}% ({activeMarket.fundingAprPct.toFixed(1)}%)
              </div>
            </div>
            <div className="rounded-lg px-3 py-2 border" style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}>
              <div style={{ color: "var(--text-dim)" }}>Max Leverage</div>
              <div className="font-mono-num font-semibold mt-0.5">
                {activeMarket.maxLeverage}x · Spread {spreadBps.toFixed(1)} bps
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Chart + Orderbook + Recent Trades */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Chart Column */}
        <div
          className="lg:col-span-7 rounded-xl border p-4 flex flex-col justify-between"
          style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              {(["15m", "1h", "4h", "1d"] as const).map((tf) => (
                <button
                  key={tf}
                  type="button"
                  onClick={() => setIntervalKey(tf)}
                  className="rounded-md px-2.5 py-1 text-xs font-mono-num font-medium cursor-pointer transition-colors"
                  style={{
                    background: interval === tf ? "var(--tab-bg-active)" : "transparent",
                    color: interval === tf ? "var(--mint-bright)" : "var(--text-mute)",
                    border:
                      interval === tf
                        ? "1px solid var(--line-mint)"
                        : "1px solid transparent",
                  }}
                >
                  {tf}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border p-0.5" style={{ borderColor: "var(--line)" }}>
                {(["candles", "line"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setChartMode(mode)}
                    className="rounded-md px-2 py-0.5 text-[11px] font-medium capitalize cursor-pointer"
                    style={{
                      background: chartMode === mode ? "var(--brand-mint-tint)" : "transparent",
                      color: chartMode === mode ? "var(--mint-bright)" : "var(--text-dim)",
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              {loading && (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: "var(--mint)" }} />
              )}
            </div>
          </div>

          {chartMode === "candles" ? (
            <CandlestickChart candles={detail?.candles || []} height={250} />
          ) : (
            <AreaLineChart
              data={(detail?.candles || []).map((c) => ({ timeMs: c.timeMs, value: c.close }))}
              height={250}
              valuePrefix="price"
            />
          )}

          {/* Funding History Mini Chart */}
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "var(--line)" }}>
            <div className="mb-1 text-xs font-medium" style={{ color: "var(--text-mute)" }}>
              Hourly Funding Rate History (% per hour)
            </div>
            <BarSeriesChart
              data={(detail?.fundingHistory || []).map((f) => ({
                timeMs: f.timeMs,
                value: f.ratePct,
              }))}
              height={110}
              formatMode="funding"
              signed
            />
          </div>
        </div>

        {/* Orderbook + Trades Column */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
          {/* Orderbook */}
          <div
            className="rounded-xl border p-3.5"
            style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
          >
            <div className="mb-2.5 flex items-center justify-between text-xs">
              <span className="font-semibold">Live Onchain Orderbook</span>
              <span className="font-mono-num" style={{ color: "var(--text-dim)" }}>
                {detail?.orderbook.totalBids || 0} bids · {detail?.orderbook.totalAsks || 0} asks
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px] font-mono-num">
              {/* Bids */}
              <div>
                <div className="mb-1 flex justify-between" style={{ color: "var(--text-dim)" }}>
                  <span>Size</span>
                  <span>Bid</span>
                </div>
                <div className="space-y-1">
                  {bids.map((b, i) => (
                    <div key={i} className="relative flex justify-between px-1.5 py-0.5 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 right-0"
                        style={{
                          width: `${Math.min(100, (b.quantity / maxBookQty) * 100)}%`,
                          background: "rgba(53, 201, 141, 0.14)",
                        }}
                      />
                      <span className="relative z-10" style={{ color: "var(--text-soft)" }}>
                        {fmtQty(b.quantity)}
                      </span>
                      <span className="relative z-10 font-medium" style={{ color: "var(--up)" }}>
                        {fmtPrice(b.price).replace("$", "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Asks */}
              <div>
                <div className="mb-1 flex justify-between" style={{ color: "var(--text-dim)" }}>
                  <span>Ask</span>
                  <span>Size</span>
                </div>
                <div className="space-y-1">
                  {asks.map((a, i) => (
                    <div key={i} className="relative flex justify-between px-1.5 py-0.5 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0"
                        style={{
                          width: `${Math.min(100, (a.quantity / maxBookQty) * 100)}%`,
                          background: "rgba(228, 106, 123, 0.14)",
                        }}
                      />
                      <span className="relative z-10 font-medium" style={{ color: "var(--down)" }}>
                        {fmtPrice(a.price).replace("$", "")}
                      </span>
                      <span className="relative z-10" style={{ color: "var(--text-soft)" }}>
                        {fmtQty(a.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div
            className="rounded-xl border p-3.5"
            style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
          >
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-semibold">Recent Onchain Fills</span>
              <span className="font-mono-num text-[11px]" style={{ color: "var(--mint)" }}>
                ~1ms match
              </span>
            </div>
            <div className="max-h-[195px] overflow-y-auto space-y-1 text-[11px] font-mono-num">
              {(detail?.trades || []).slice(0, 14).map((t) => (
                <div
                  key={t.id}
                  className="grid grid-cols-3 items-center py-0.5 px-1 rounded hover:bg-[var(--surface-1)]"
                >
                  <span style={{ color: t.side === "BUY" ? "var(--up)" : "var(--down)" }}>
                    {fmtPrice(t.price)}
                  </span>
                  <span className="text-right" style={{ color: "var(--text-soft)" }}>
                    {fmtQty(t.size)}
                  </span>
                  <span className="text-right" style={{ color: "var(--text-dim)" }}>
                    {fmtTimestamp(t.timeMs).split(", ")[1] || fmtTimestamp(t.timeMs)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
