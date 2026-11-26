"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Check,
  Copy,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { AreaLineChart, BarSeriesChart, PnlCalendarHeatmap } from "./Charts";
import {
  fmtCompactUsd,
  fmtDuration,
  fmtPct,
  fmtPrice,
  fmtQty,
  fmtTimestamp,
  fmtUsd,
  num,
  shortAddr,
} from "@/lib/format";
import { LeaderboardEntry, RISE_EXPLORER_URL } from "@/lib/risex";

interface WalletPayload {
  address: string;
  overview: {
    accountValueUsd: number;
    crossMarginBalanceUsd: number;
    totalUnrealizedPnl: number;
    totalAllTimePnl: number;
    totalPositionNotional: number;
    totalMarginUsed: number;
    marginUsagePct: number;
    longCount: number;
    shortCount: number;
    longPnl: number;
    shortPnl: number;
  };
  header: {
    h24?: { volume?: string; volume_rank?: string };
    d7?: { volume?: string; volume_rank?: string };
    d30?: { volume?: string; volume_rank?: string };
    all_time?: { volume?: string; volume_rank?: string };
  } | null;
  stats: {
    winRatePct: number;
    maxDrawdownPct: number;
    sharpeRatio: number;
    profitFactor: number;
    longestWinStreak: number;
    avgTradeDurationSec: number;
    medianTradeDurationSec: number;
  };
  tradingTotals: {
    tradedVolumeUsd: number;
    liquidationVolumeUsd: number;
    totalVolumeUsd: number;
    totalFeeUsd: number;
    tradeCount: number;
    lastTradeMs: number;
  } | null;
  charts: {
    equityChart: Array<{ timeMs: number; value: number }>;
    pnlChart: Array<{ timeMs: number; value: number }>;
    volumeChart: Array<{ timeMs: number; value: number }>;
    pnlCalendar: Array<{ timeMs: number; pnl: number }>;
  };
  positions: Array<{
    marketId: string;
    symbol: string;
    pair: string;
    side: "LONG" | "SHORT";
    marginMode: "Cross" | "Isolated";
    size: number;
    notionalUsd: number;
    entryPrice: number;
    markPrice: number;
    leverage: number;
    marginUsedUsd: number;
    unrealizedPnlUsd: number;
    roePct: number;
    unsettledFundingUsd: number;
  }>;
  trades: Array<{
    id: string;
    marketId: string;
    symbol: string;
    side: string;
    positionSide: string;
    price: number;
    size: number;
    fee: number;
    liquidity: string;
    realizedPnl: number;
    realizedPnlPct: number;
    leverage: number;
    isLiquidation: boolean;
    timeMs: number;
    txHash: string | null;
  }>;
  openOrders: Array<{
    orderId: string;
    marketId: string;
    symbol: string;
    side: string;
    price: number;
    size: number;
    filledSize: number;
    orderType: string;
    timeMs: number;
  }>;
  fundingPayments: Array<{
    marketId: string;
    symbol: string;
    paymentUsd: number;
    positionSize: number;
    side: string;
    fundingRatePct: number;
    isSettled: boolean;
    timeMs: number;
  }>;
  error?: string;
}

const DEFAULT_SAMPLE = "0x7079b5814032C0b02425135F06F32A0084cdf2d2";

export function ExplorerClient({
  topTraders,
}: {
  topTraders: LeaderboardEntry[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeAddr =
    searchParams.get("address") || topTraders[0]?.address || DEFAULT_SAMPLE;
  const urlTx = searchParams.get("tx") || "";

  const [queryInput, setQueryInput] = useState(urlTx || activeAddr);
  const [period, setPeriod] = useState<"1D" | "1W" | "1M" | "3M" | "1Y" | "ALL">("ALL");
  const [chartTab, setChartTab] = useState<"equity" | "pnl" | "volume" | "calendar">("equity");
  const [tableTab, setTableTab] = useState<"positions" | "trades" | "orders" | "funding" | "tx">(
    urlTx ? "tx" : "positions"
  );
  const [walletData, setWalletData] = useState<WalletPayload | null>(null);
  const [loadedWalletKey, setLoadedWalletKey] = useState<string>("");
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [txInput, setTxInput] = useState(urlTx);
  const [txResult, setTxResult] = useState<Record<string, unknown> | null>(null);
  const [txErr, setTxErr] = useState<string | null>(null);

  const walletKey = `${activeAddr}:${period}`;
  const loading = loadedWalletKey !== walletKey;

  useEffect(() => {
    if (!activeAddr) return;
    let cancelled = false;
    fetch(`/api/risex/wallet/${encodeURIComponent(activeAddr)}?period=${period}`)
      .then((r) => r.json())
      .then((json: WalletPayload) => {
        if (cancelled) return;
        if (json.error) {
          setErr(json.error);
          setWalletData(null);
        } else {
          setErr(null);
          setWalletData(json);
        }
        setLoadedWalletKey(`${activeAddr}:${period}`);
      })
      .catch((e) => {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : "Failed to load wallet");
          setLoadedWalletKey(`${activeAddr}:${period}`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [activeAddr, period]);

  useEffect(() => {
    if (!txInput || !/^0x[a-fA-F0-9]{64}$/.test(txInput.trim())) return;
    let cancelled = false;
    fetch(`/api/risex/tx/${txInput.trim()}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.error) setTxErr(d.error);
        else {
          setTxErr(null);
          setTxResult(d.tx);
        }
      })
      .catch(() => {
        if (!cancelled) setTxErr("Failed to decode tx");
      });
    return () => {
      cancelled = true;
    };
  }, [txInput]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = queryInput.trim();
    if (!q) return;
    if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
      setTxInput(q);
      setTableTab("tx");
      router.replace(`/explorer?tx=${q}`);
      return;
    }
    router.replace(`/explorer?address=${encodeURIComponent(q)}`);
  };

  const copyAddr = () => {
    navigator.clipboard?.writeText(walletData?.address || activeAddr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const d = walletData;

  return (
    <div className="space-y-6 reveal">
      {/* Header + Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-[11px] font-mono-num uppercase tracking-wider" style={{ color: "var(--mint)" }}>
            RISEx Wallet &amp; Tx Explorer
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
            Inspect any RISEx account
          </h1>
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="flex items-center gap-2 rounded-xl border p-1.5 w-full md:max-w-lg focus-within:border-[var(--line-mint)]"
          style={{ borderColor: "var(--line)", background: "var(--card-bg-opaque)" }}
        >
          <Search className="ml-2 h-4 w-4 shrink-0" style={{ color: "var(--mint)" }} />
          <input
            value={queryInput}
            onChange={(e) => setQueryInput(e.target.value)}
            placeholder="0x wallet address, username, or 0x tx hash…"
            className="w-full bg-transparent px-1.5 py-1.5 text-base sm:text-sm font-mono-num outline-none"
          />
          <button
            type="submit"
            className="rounded-lg px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
            style={{
              background: "var(--brand-mint-button)",
              color: "var(--brand-mint-button-fg)",
            }}
          >
            Inspect
          </button>
        </form>
      </div>

      {/* Quick-pick top traders */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span style={{ color: "var(--text-dim)" }}>Top accounts:</span>
        {topTraders.slice(0, 6).map((t) => {
          const isCurrent =
            t.address.toLowerCase() === (d?.address || activeAddr).toLowerCase();
          return (
            <button
              key={t.address}
              type="button"
              onClick={() => {
                setQueryInput(t.address);
                router.replace(`/explorer?address=${t.address}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 transition-colors cursor-pointer"
              style={{
                borderColor: isCurrent ? "var(--line-mint)" : "var(--line)",
                background: isCurrent ? "var(--brand-mint-tint)" : "var(--surface-1)",
                color: isCurrent ? "var(--mint-bright)" : "var(--text-soft)",
              }}
            >
              <span className="font-mono-num text-[10px]" style={{ color: "var(--text-dim)" }}>
                #{t.rank}
              </span>
              <span>{t.xHandle ? `@${t.xHandle}` : t.username || shortAddr(t.address)}</span>
              <span className="font-mono-num" style={{ color: t.notionalPnlUsd >= 0 ? "var(--up)" : "var(--down)" }}>
                {fmtCompactUsd(t.notionalPnlUsd, true)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Address Banner */}
      <div className="eco-card p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
            style={{
              borderColor: "var(--line-mint)",
              background: "var(--brand-mint-tint)",
              color: "var(--mint-bright)",
            }}
          >
            <Wallet className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono-num text-sm sm:text-base font-semibold truncate">
                {d?.address || activeAddr}
              </span>
              <button
                type="button"
                onClick={copyAddr}
                className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                title="Copy address"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5" style={{ color: "var(--mint)" }} />
                ) : (
                  <Copy className="h-3.5 w-3.5" style={{ color: "var(--text-dim)" }} />
                )}
              </button>
            </div>
            <div className="text-xs flex flex-wrap items-center gap-3 mt-0.5" style={{ color: "var(--text-mute)" }}>
              {d?.tradingTotals && (
                <span>
                  {d.tradingTotals.tradeCount.toLocaleString()} fills · Fees paid:{" "}
                  <strong className="font-mono-num">{fmtCompactUsd(d.tradingTotals.totalFeeUsd)}</strong>
                </span>
              )}
              {d?.header?.all_time?.volume_rank && Number(d.header.all_time.volume_rank) > 0 && (
                <span className="font-mono-num" style={{ color: "var(--mint)" }}>
                  All-time Volume Rank #{d.header.all_time.volume_rank}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {loading && (
            <RefreshCw className="h-4 w-4 animate-spin" style={{ color: "var(--mint)" }} />
          )}
          <a
            href={`${RISE_EXPLORER_URL}/address/${d?.address || activeAddr}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs hover:border-[var(--line-mint)]"
            style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
          >
            RISE Explorer <ArrowUpRight className="h-3 w-3" />
          </a>
        </div>
      </div>

      {err && (
        <div
          className="rounded-xl border p-4 text-sm"
          style={{
            borderColor: "rgba(255,101,101,0.4)",
            background: "rgba(255,101,101,0.08)",
            color: "var(--down)",
          }}
        >
          {err}
        </div>
      )}

      {d && (
        <>
          {/* hl.eco Explorer KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="eco-card p-4">
              <div className="text-xs" style={{ color: "var(--text-mute)" }}>
                Account Value
              </div>
              <div className="font-mono-num text-2xl font-semibold mt-1">
                {fmtUsd(d.overview.accountValueUsd)}
              </div>
              <div className="text-[11px] font-mono-num mt-1" style={{ color: "var(--text-dim)" }}>
                Cross bal: {fmtUsd(d.overview.crossMarginBalanceUsd)}
              </div>
            </div>

            <div className="eco-card p-4">
              <div className="text-xs" style={{ color: "var(--text-mute)" }}>
                All-Time Realized PnL
              </div>
              <div
                className="font-mono-num text-2xl font-semibold mt-1"
                style={{ color: d.overview.totalAllTimePnl >= 0 ? "var(--up)" : "var(--down)" }}
              >
                {fmtCompactUsd(d.overview.totalAllTimePnl, true)}
              </div>
              <div
                className="text-[11px] font-mono-num mt-1"
                style={{
                  color: d.overview.totalUnrealizedPnl >= 0 ? "var(--up)" : "var(--down)",
                }}
              >
                Unrealized: {fmtUsd(d.overview.totalUnrealizedPnl, true)}
              </div>
            </div>

            <div className="eco-card p-4">
              <div className="text-xs" style={{ color: "var(--text-mute)" }}>
                Win Rate &amp; Risk
              </div>
              <div className="font-mono-num text-2xl font-semibold mt-1">
                {d.stats.winRatePct.toFixed(1)}%
              </div>
              <div className="text-[11px] font-mono-num mt-1" style={{ color: "var(--text-dim)" }}>
                Sharpe {d.stats.sharpeRatio.toFixed(2)} · PF {d.stats.profitFactor.toFixed(1)}
              </div>
            </div>

            <div className="eco-card p-4">
              <div className="text-xs" style={{ color: "var(--text-mute)" }}>
                Total Volume
              </div>
              <div className="font-mono-num text-2xl font-semibold mt-1">
                {fmtCompactUsd(
                  d.tradingTotals?.totalVolumeUsd || num(d.header?.all_time?.volume)
                )}
              </div>
              <div className="text-[11px] font-mono-num mt-1" style={{ color: "var(--text-dim)" }}>
                24h: {fmtCompactUsd(num(d.header?.h24?.volume))} · 7d:{" "}
                {fmtCompactUsd(num(d.header?.d7?.volume))}
              </div>
            </div>

            <div className="eco-card p-4 col-span-2 lg:col-span-1">
              <div className="text-xs" style={{ color: "var(--text-mute)" }}>
                Margin &amp; Streaks
              </div>
              <div className="font-mono-num text-2xl font-semibold mt-1">
                {d.overview.marginUsagePct.toFixed(1)}%
              </div>
              <div className="text-[11px] font-mono-num mt-1" style={{ color: "var(--text-dim)" }}>
                Best streak: {d.stats.longestWinStreak}W · Avg hold{" "}
                {fmtDuration(d.stats.avgTradeDurationSec)}
              </div>
            </div>
          </div>

          {/* Long vs Short Exposure + Charts */}
          <div className="eco-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["equity", "Account Equity"],
                    ["pnl", "PnL Curve"],
                    ["volume", "Volume History"],
                    ["calendar", "PnL Calendar"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setChartTab(k)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer"
                    style={{
                      background: chartTab === k ? "var(--tab-bg-active)" : "var(--surface-1)",
                      color: chartTab === k ? "var(--mint-bright)" : "var(--text-mute)",
                      border:
                        chartTab === k
                          ? "1px solid var(--line-mint)"
                          : "1px solid var(--line)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                {(["1D", "1W", "1M", "3M", "1Y", "ALL"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPeriod(p)}
                    className="rounded-md px-2 py-1 text-[11px] font-mono-num cursor-pointer"
                    style={{
                      background: period === p ? "var(--brand-mint-tint)" : "transparent",
                      color: period === p ? "var(--mint-bright)" : "var(--text-dim)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {chartTab === "equity" && (
              <AreaLineChart data={d.charts.equityChart} height={220} valuePrefix="usd" />
            )}
            {chartTab === "pnl" && (
              <AreaLineChart
                data={d.charts.pnlChart}
                height={220}
                valuePrefix="usd"
                showZeroLine
              />
            )}
            {chartTab === "volume" && (
              <BarSeriesChart data={d.charts.volumeChart} height={220} formatMode="compact" />
            )}
            {chartTab === "calendar" && (
              <PnlCalendarHeatmap days={d.charts.pnlCalendar} />
            )}
          </div>

          {/* Positions / Trades / Open Orders / Funding / Tx Decoder */}
          <div className="eco-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ["positions", `Positions (${d.positions.length})`],
                    ["trades", `Trades (${d.trades.length})`],
                    ["orders", `Open Orders (${d.openOrders.length})`],
                    ["funding", `Funding (${d.fundingPayments.length})`],
                    ["tx", "Tx Decoder"],
                  ] as const
                ).map(([k, label]) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTableTab(k)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer"
                    style={{
                      background: tableTab === k ? "var(--tab-bg-active)" : "var(--surface-1)",
                      color: tableTab === k ? "var(--mint-bright)" : "var(--text-mute)",
                      border:
                        tableTab === k
                          ? "1px solid var(--line-mint)"
                          : "1px solid var(--line)",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 text-xs font-mono-num">
                <span style={{ color: "var(--up)" }}>
                  Long ({d.overview.longCount}): {fmtUsd(d.overview.longPnl, true)}
                </span>
                <span style={{ color: "var(--down)" }}>
                  Short ({d.overview.shortCount}): {fmtUsd(d.overview.shortPnl, true)}
                </span>
              </div>
            </div>

            {tableTab === "positions" && (
              <div>
                {d.positions.length === 0 ? (
                  <div className="py-8 text-center text-xs" style={{ color: "var(--text-dim)" }}>
                    No open perpetual positions on this wallet.
                  </div>
                ) : (
                  <>
                    {/* Mobile Positions Cards */}
                    <div className="sm:hidden space-y-2.5">
                      {d.positions.map((p) => (
                        <Link
                          key={p.marketId}
                          href={`/markets?id=${p.marketId}`}
                          className="block rounded-xl border p-3 space-y-2"
                          style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono-num text-sm font-semibold">
                                {p.symbol}/USDC
                              </span>
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono-num font-semibold"
                                style={{
                                  background:
                                    p.side === "LONG"
                                      ? "var(--brand-mint-tint)"
                                      : "rgba(255,101,104,0.12)",
                                  color: p.side === "LONG" ? "var(--up)" : "var(--down)",
                                }}
                              >
                                {p.side} {p.leverage.toFixed(0)}x
                              </span>
                            </div>
                            <span
                              className="font-mono-num text-xs font-semibold"
                              style={{
                                color: p.unrealizedPnlUsd >= 0 ? "var(--up)" : "var(--down)",
                              }}
                            >
                              {fmtUsd(p.unrealizedPnlUsd, true)} ({fmtPct(p.roePct)})
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono-num" style={{ color: "var(--text-mute)" }}>
                            <div>
                              <div style={{ color: "var(--text-dim)" }}>Notional</div>
                              <div>{fmtCompactUsd(p.notionalUsd)}</div>
                            </div>
                            <div>
                              <div style={{ color: "var(--text-dim)" }}>Entry</div>
                              <div>{fmtPrice(p.entryPrice)}</div>
                            </div>
                            <div className="text-right">
                              <div style={{ color: "var(--text-dim)" }}>Mark</div>
                              <div>{fmtPrice(p.markPrice)}</div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>

                    <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                        <th className="py-2 pr-3 font-medium">Market</th>
                        <th className="py-2 px-2 font-medium">Side / Lev</th>
                        <th className="py-2 px-2 font-medium text-right">Size</th>
                        <th className="py-2 px-2 font-medium text-right">Notional</th>
                        <th className="py-2 px-2 font-medium text-right">Entry</th>
                        <th className="py-2 px-2 font-medium text-right">Mark</th>
                        <th className="py-2 px-2 font-medium text-right">Unrealized PnL</th>
                        <th className="py-2 pl-2 font-medium text-right">Margin</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                      {d.positions.map((p) => (
                        <tr key={p.marketId} className="hover:bg-[var(--bg-hover)]">
                          <td className="py-2.5 pr-3 font-mono-num font-semibold">
                            <Link href={`/markets?id=${p.marketId}`} className="hover:underline">
                              {p.symbol}/USDC
                            </Link>
                          </td>
                          <td className="py-2.5 px-2 font-mono-num">
                            <span
                              className="px-1.5 py-0.5 rounded text-[11px] font-semibold"
                              style={{
                                background:
                                  p.side === "LONG"
                                    ? "var(--brand-mint-tint)"
                                    : "rgba(255,101,101,0.12)",
                                color: p.side === "LONG" ? "var(--up)" : "var(--down)",
                              }}
                            >
                              {p.side} {p.leverage.toFixed(0)}x
                            </span>{" "}
                            <span className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                              {p.marginMode}
                            </span>
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-num">{fmtQty(p.size)}</td>
                          <td className="py-2.5 px-2 text-right font-mono-num">
                            {fmtCompactUsd(p.notionalUsd)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-num">
                            {fmtPrice(p.entryPrice)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono-num">
                            {fmtPrice(p.markPrice)}
                          </td>
                          <td
                            className="py-2.5 px-2 text-right font-mono-num font-semibold"
                            style={{
                              color: p.unrealizedPnlUsd >= 0 ? "var(--up)" : "var(--down)",
                            }}
                          >
                            {fmtUsd(p.unrealizedPnlUsd, true)} ({fmtPct(p.roePct)})
                          </td>
                          <td className="py-2.5 pl-2 text-right font-mono-num">
                            {fmtCompactUsd(p.marginUsedUsd)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                    </div>
                  </>
                )}
              </div>
            )}

            {tableTab === "trades" && (
              <div>
                {/* Mobile Trade Cards */}
                <div className="sm:hidden space-y-2">
                  {d.trades.map((t) => (
                    <div
                      key={t.id}
                      className="rounded-xl border p-3 space-y-1.5"
                      style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-num text-xs font-semibold">{t.symbol}</span>
                          <span
                            className="font-mono-num text-[11px] font-semibold"
                            style={{ color: t.side === "BUY" ? "var(--up)" : "var(--down)" }}
                          >
                            {t.side} · {t.liquidity}
                          </span>
                        </div>
                        <span
                          className="font-mono-num text-xs font-semibold"
                          style={{ color: t.realizedPnl >= 0 ? "var(--up)" : "var(--down)" }}
                        >
                          {t.realizedPnl !== 0 ? fmtUsd(t.realizedPnl, true) : fmtPrice(t.price)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] font-mono-num" style={{ color: "var(--text-dim)" }}>
                        <span>{fmtQty(t.size)} @ {fmtPrice(t.price)}</span>
                        <span>{fmtTimestamp(t.timeMs)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                      <th className="py-2 pr-3 font-medium">Time</th>
                      <th className="py-2 px-2 font-medium">Market</th>
                      <th className="py-2 px-2 font-medium">Side</th>
                      <th className="py-2 px-2 font-medium text-right">Price</th>
                      <th className="py-2 px-2 font-medium text-right">Size</th>
                      <th className="py-2 px-2 font-medium text-right">Realized PnL</th>
                      <th className="py-2 px-2 font-medium text-right">Fee</th>
                      <th className="py-2 pl-2 font-medium text-right">Tx</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {d.trades.map((t) => (
                      <tr key={t.id} className="hover:bg-[var(--bg-hover)]">
                        <td className="py-2 pr-3 font-mono-num" style={{ color: "var(--text-dim)" }}>
                          {fmtTimestamp(t.timeMs)}
                        </td>
                        <td className="py-2 px-2 font-mono-num font-semibold">{t.symbol}</td>
                        <td
                          className="py-2 px-2 font-mono-num"
                          style={{ color: t.side === "BUY" ? "var(--up)" : "var(--down)" }}
                        >
                          {t.side} · {t.liquidity}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-num">{fmtPrice(t.price)}</td>
                        <td className="py-2 px-2 text-right font-mono-num">{fmtQty(t.size)}</td>
                        <td
                          className="py-2 px-2 text-right font-mono-num"
                          style={{ color: t.realizedPnl >= 0 ? "var(--up)" : "var(--down)" }}
                        >
                          {t.realizedPnl !== 0 ? fmtUsd(t.realizedPnl, true) : "—"}
                        </td>
                        <td className="py-2 px-2 text-right font-mono-num" style={{ color: "var(--text-mute)" }}>
                          {fmtUsd(t.fee, false, 4)}
                        </td>
                        <td className="py-2 pl-2 text-right">
                          {t.txHash ? (
                            <a
                              href={`${RISE_EXPLORER_URL}/tx/${t.txHash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-0.5 font-mono-num hover:underline"
                              style={{ color: "var(--mint)" }}
                            >
                              {shortAddr(t.txHash, 6, 4)} <ArrowUpRight className="h-3 w-3" />
                            </a>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            )}

            {tableTab === "orders" && (
              <div className="overflow-x-auto">
                {d.openOrders.length === 0 ? (
                  <div className="py-8 text-center text-xs" style={{ color: "var(--text-dim)" }}>
                    No resting open limit orders for this account.
                  </div>
                ) : (
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                        <th className="py-2 pr-3 font-medium">Market</th>
                        <th className="py-2 px-2 font-medium">Side / Type</th>
                        <th className="py-2 px-2 font-medium text-right">Limit Price</th>
                        <th className="py-2 px-2 font-medium text-right">Size</th>
                        <th className="py-2 pl-2 font-medium text-right">Filled</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                      {d.openOrders.map((o) => (
                        <tr key={o.orderId}>
                          <td className="py-2 pr-3 font-mono-num font-semibold">{o.symbol}</td>
                          <td
                            className="py-2 px-2 font-mono-num"
                            style={{ color: o.side === "BUY" ? "var(--up)" : "var(--down)" }}
                          >
                            {o.side} · {o.orderType}
                          </td>
                          <td className="py-2 px-2 text-right font-mono-num">{fmtPrice(o.price)}</td>
                          <td className="py-2 px-2 text-right font-mono-num">{fmtQty(o.size)}</td>
                          <td className="py-2 pl-2 text-right font-mono-num">{fmtQty(o.filledSize)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}

            {tableTab === "funding" && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                      <th className="py-2 pr-3 font-medium">Time</th>
                      <th className="py-2 px-2 font-medium">Market</th>
                      <th className="py-2 px-2 font-medium">Side</th>
                      <th className="py-2 px-2 font-medium text-right">Rate</th>
                      <th className="py-2 pl-2 font-medium text-right">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {d.fundingPayments.map((f, idx) => (
                      <tr key={idx}>
                        <td className="py-2 pr-3 font-mono-num" style={{ color: "var(--text-dim)" }}>
                          {fmtTimestamp(f.timeMs)}
                        </td>
                        <td className="py-2 px-2 font-mono-num font-semibold">{f.symbol}</td>
                        <td className="py-2 px-2 uppercase font-mono-num">{f.side}</td>
                        <td className="py-2 px-2 text-right font-mono-num">
                          {f.fundingRatePct.toFixed(5)}%
                        </td>
                        <td
                          className="py-2 pl-2 text-right font-mono-num"
                          style={{ color: f.paymentUsd >= 0 ? "var(--up)" : "var(--down)" }}
                        >
                          {fmtUsd(f.paymentUsd, true, 4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {tableTab === "tx" && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    value={txInput}
                    onChange={(e) => setTxInput(e.target.value)}
                    placeholder="Paste a 0x transaction hash (64 hex chars) to decode via /v1/tx…"
                    className="w-full rounded-lg border px-3 py-2 text-xs font-mono-num bg-transparent outline-none focus:border-[var(--line-mint)]"
                    style={{ borderColor: "var(--line)" }}
                  />
                </div>
                {txErr && (
                  <div className="text-xs" style={{ color: "var(--down)" }}>
                    {txErr}
                  </div>
                )}
                {txResult && (
                  <pre
                    className="rounded-xl border p-3 text-xs font-mono-num overflow-x-auto"
                    style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
                  >
                    {JSON.stringify(txResult, null, 2)}
                  </pre>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
