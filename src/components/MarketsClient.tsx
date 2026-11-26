"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, Search, Wallet } from "lucide-react";
import { MarketWorkbench } from "./MarketWorkbench";
import {
  fmtCompactUsd,
  fmtPct,
  fmtPrice,
  shortAddr,
} from "@/lib/format";
import { LeaderboardEntry, MarketSector, NormalizedMarket } from "@/lib/risex";

type SortKey = "volume" | "oi" | "change" | "funding" | "leverage";

export function MarketsClient({
  markets,
  initialLeaderboard,
}: {
  markets: NormalizedMarket[];
  initialLeaderboard: LeaderboardEntry[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedMarketId = searchParams.get("id") || markets[0]?.id || "1";

  const [tab, setTab] = useState<"markets" | "funding" | "leaderboard">("markets");
  const [sector, setSector] = useState<"All" | MarketSector>("All");
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("volume");
  const [sortAsc, setSortAsc] = useState(false);

  // Leaderboard controls
  const [lbTimeframe, setLbTimeframe] = useState<"24H" | "7D" | "30D" | "ALL">("ALL");
  const [lbSort, setLbSort] = useState<"PNL" | "ROI" | "VOLUME" | "WIN_RATE" | "TRADES">("PNL");
  const [lbEntries, setLbEntries] = useState<LeaderboardEntry[]>(initialLeaderboard);
  const [loadedLbKey, setLoadedLbKey] = useState<string>("ALL:PNL");
  const lbKey = `${lbTimeframe}:${lbSort}`;
  const lbLoading = tab === "leaderboard" && loadedLbKey !== lbKey;

  useEffect(() => {
    if (tab !== "leaderboard") return;
    let cancelled = false;
    fetch(`/api/risex/leaderboard?timeframe=${lbTimeframe}&sort=${lbSort}&limit=50`)
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          if (Array.isArray(d.entries)) setLbEntries(d.entries);
          setLoadedLbKey(`${lbTimeframe}:${lbSort}`);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadedLbKey(`${lbTimeframe}:${lbSort}`);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, lbTimeframe, lbSort]);

  const sortedMarkets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = markets.filter((m) => {
      if (sector !== "All" && m.sector !== sector) return false;
      if (!q) return true;
      return (
        m.symbol.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        m.sector.toLowerCase().includes(q)
      );
    });
    const mult = sortAsc ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortBy === "oi") return (a.openInterestUsd - b.openInterestUsd) * mult;
      if (sortBy === "change") return (a.change24hPct - b.change24hPct) * mult;
      if (sortBy === "funding") return (a.fundingAprPct - b.fundingAprPct) * mult;
      if (sortBy === "leverage") return (a.maxLeverage - b.maxLeverage) * mult;
      return (a.volume24hUsd - b.volume24hUsd) * mult;
    });
  }, [markets, sector, query, sortBy, sortAsc]);

  const fundingSorted = useMemo(() => {
    return [...markets].sort((a, b) => Math.abs(b.fundingAprPct) - Math.abs(a.fundingAprPct));
  }, [markets]);

  const toggleSort = (k: SortKey) => {
    if (sortBy === k) setSortAsc(!sortAsc);
    else {
      setSortBy(k);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs font-mono-num uppercase tracking-wider" style={{ color: "var(--mint)" }}>
          Markets, Depth &amp; Financials
        </div>
        <h1 className="font-display text-3xl sm:text-4xl font-normal mt-1">
          RISEx Market Matrix
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-mute)" }}>
          {markets.length} active perpetual markets across Crypto, US Equities/ETFs, and Commodities.
        </p>
      </div>

      {/* Interactive Workbench */}
      <MarketWorkbench
        markets={markets}
        initialMarketId={selectedMarketId}
        onSelectMarket={(id) => router.replace(`/markets?id=${id}`)}
      />

      {/* View Switcher */}
      <div className="eco-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                ["markets", `All Markets (${markets.length})`],
                ["funding", "Funding Rate Matrix"],
                ["leaderboard", "Trader Leaderboard"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => setTab(k)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer"
                style={{
                  background: tab === k ? "var(--tab-bg-active)" : "var(--surface-1)",
                  color: tab === k ? "var(--mint-bright)" : "var(--text-mute)",
                  border:
                    tab === k ? "1px solid var(--line-mint)" : "1px solid var(--line)",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "markets" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {(["All", "Crypto", "Equities & ETFs", "Commodities"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSector(s)}
                    className="rounded-md px-2.5 py-1 text-[11px] font-medium cursor-pointer"
                    style={{
                      background: sector === s ? "var(--brand-mint-tint)" : "transparent",
                      color: sector === s ? "var(--mint-bright)" : "var(--text-dim)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
              <div
                className="flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs"
                style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
              >
                <Search className="h-3.5 w-3.5" style={{ color: "var(--text-dim)" }} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Filter pair…"
                  className="bg-transparent outline-none w-28"
                />
              </div>
            </div>
          )}

          {tab === "leaderboard" && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {(["24H", "7D", "30D", "ALL"] as const).map((tf) => (
                  <button
                    key={tf}
                    type="button"
                    onClick={() => setLbTimeframe(tf)}
                    className="rounded-md px-2.5 py-1 text-[11px] font-mono-num cursor-pointer"
                    style={{
                      background: lbTimeframe === tf ? "var(--brand-mint-tint)" : "transparent",
                      color: lbTimeframe === tf ? "var(--mint-bright)" : "var(--text-dim)",
                    }}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              <select
                value={lbSort}
                onChange={(e) => setLbSort(e.target.value as typeof lbSort)}
                className="rounded-lg border px-2.5 py-1 text-xs outline-none cursor-pointer"
                style={{
                  background: "var(--tab-bg)",
                  borderColor: "var(--line)",
                  color: "var(--text)",
                }}
              >
                <option value="PNL">Sort: PnL</option>
                <option value="VOLUME">Sort: Volume</option>
                <option value="ROI">Sort: ROI %</option>
                <option value="WIN_RATE">Sort: Win Rate</option>
                <option value="TRADES">Sort: Trades</option>
              </select>
            </div>
          )}
        </div>

        {tab === "markets" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                  <th className="py-2.5 pr-3 font-medium">Market</th>
                  <th className="py-2.5 px-2 font-medium">Sector</th>
                  <th className="py-2.5 px-2 font-medium text-right">Mark Price</th>
                  <th className="py-2.5 px-2 font-medium text-right">
                    <button type="button" onClick={() => toggleSort("change")} className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text)]">
                      24h % <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-2 font-medium text-right">
                    <button type="button" onClick={() => toggleSort("volume")} className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text)]">
                      24h Volume <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-2 font-medium text-right">
                    <button type="button" onClick={() => toggleSort("oi")} className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text)]">
                      Open Interest <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2.5 px-2 font-medium text-right">OI Cap %</th>
                  <th className="py-2.5 px-2 font-medium text-right">
                    <button type="button" onClick={() => toggleSort("funding")} className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text)]">
                      Funding APR <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                  <th className="py-2.5 pl-2 font-medium text-right">
                    <button type="button" onClick={() => toggleSort("leverage")} className="inline-flex items-center gap-1 cursor-pointer hover:text-[var(--text)]">
                      Max Lev <ArrowUpDown className="h-3 w-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {sortedMarkets.map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => router.replace(`/markets?id=${m.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                    style={{
                      background:
                        m.id === selectedMarketId ? "var(--brand-mint-tint)" : undefined,
                    }}
                  >
                    <td className="py-2.5 pr-3">
                      <div className="font-mono-num font-semibold">{m.symbol}/USDC</div>
                      <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                        {m.label}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px]"
                        style={{ background: "var(--surface-2)", color: "var(--text-mute)" }}
                      >
                        {m.sector}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {fmtPrice(m.markPrice)}
                    </td>
                    <td
                      className="py-2.5 px-2 text-right font-mono-num"
                      style={{ color: m.change24hPct >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {fmtPct(m.change24hPct)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num font-medium">
                      {fmtCompactUsd(m.volume24hUsd)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {fmtCompactUsd(m.openInterestUsd)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num" style={{ color: "var(--text-mute)" }}>
                      {m.oiUtilizationPct.toFixed(1)}%
                    </td>
                    <td
                      className="py-2.5 px-2 text-right font-mono-num"
                      style={{ color: m.fundingAprPct >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {m.fundingAprPct >= 0 ? "+" : ""}
                      {m.fundingAprPct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono-num">{m.maxLeverage}x</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "funding" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fundingSorted.map((m) => {
              const pos = m.fundingAprPct >= 0;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => router.replace(`/markets?id=${m.id}`)}
                  className="text-left rounded-xl border p-3.5 transition-colors hover:border-[var(--line-mint)] cursor-pointer"
                  style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num font-semibold text-sm">{m.symbol}/USDC</span>
                    <span
                      className="font-mono-num text-xs font-semibold px-2 py-0.5 rounded"
                      style={{
                        background: pos
                          ? "var(--brand-mint-tint)"
                          : "rgba(255,101,101,0.12)",
                        color: pos ? "var(--up)" : "var(--down)",
                      }}
                    >
                      {pos ? "+" : ""}
                      {m.fundingAprPct.toFixed(2)}% APR
                    </span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-mono-num" style={{ color: "var(--text-mute)" }}>
                    <span>1h: {m.funding1hPct.toFixed(4)}%</span>
                    <span>8h: {m.funding8hPct.toFixed(4)}%</span>
                    <span>OI: {fmtCompactUsd(m.openInterestUsd)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === "leaderboard" && (
          <div className="overflow-x-auto">
            {lbLoading && (
              <div className="py-4 text-xs" style={{ color: "var(--mint)" }}>
                Refreshing {lbTimeframe} leaderboard…
              </div>
            )}
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 px-2 font-medium">Trader</th>
                  <th className="py-2 px-2 font-medium text-right">Account Value</th>
                  <th className="py-2 px-2 font-medium text-right">PnL</th>
                  <th className="py-2 px-2 font-medium text-right">ROI</th>
                  <th className="py-2 px-2 font-medium text-right">Win Rate</th>
                  <th className="py-2 px-2 font-medium text-right">Trades</th>
                  <th className="py-2 px-2 font-medium text-right">Volume</th>
                  <th className="py-2 pl-2 font-medium text-right">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {lbEntries.map((t) => (
                  <tr key={t.address} className="hover:bg-[var(--bg-hover)]">
                    <td className="py-2.5 pr-3 font-mono-num">{t.rank}</td>
                    <td className="py-2.5 px-2">
                      <Link
                        href={`/explorer?address=${t.address}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {t.avatarUrl ? (
                          <Image src={t.avatarUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                        ) : null}
                        <span className="font-medium">
                          {t.xHandle ? `@${t.xHandle}` : t.username || shortAddr(t.address)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {fmtCompactUsd(t.accountValueUsd)}
                    </td>
                    <td
                      className="py-2.5 px-2 text-right font-mono-num font-semibold"
                      style={{ color: t.notionalPnlUsd >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {fmtCompactUsd(t.notionalPnlUsd, true)}
                    </td>
                    <td
                      className="py-2.5 px-2 text-right font-mono-num"
                      style={{ color: t.roiPct >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {fmtPct(t.roiPct)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {t.winRatePct.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {t.trades.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {fmtCompactUsd(t.combinedVolumeUsd)}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <Link
                        href={`/explorer?address=${t.address}`}
                        className="inline-flex items-center gap-1 rounded px-2 py-1 border hover:border-[var(--line-mint)]"
                        style={{ borderColor: "var(--line)" }}
                      >
                        <Wallet className="h-3 w-3" style={{ color: "var(--mint)" }} />
                        Inspect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
