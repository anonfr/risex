"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Award,
  Layers,
  Search,
  Sparkles,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import { MarketWorkbench } from "./MarketWorkbench";
import {
  fmtCompactUsd,
  fmtDuration,
  fmtPct,
  fmtPrice,
  fmtUsd,
  shortAddr,
} from "@/lib/format";
import {
  BuilderEntry,
  CompetitionEntry,
  LeaderboardEntry,
  MarketSector,
  NormalizedMarket,
  PointsEpoch,
} from "@/lib/risex";

export interface OverviewPayload {
  fetchedAt: number;
  summary: {
    totalVolume24hUsd: number;
    totalOpenInterestUsd: number;
    activeMarketCount: number;
    avgFundingAprPct: number;
    totalBuilders: number;
    activeBuilders: number;
    liveCompetitions: number;
    sectorBreakdown: Array<{
      sector: string;
      count: number;
      volume24hUsd: number;
      openInterestUsd: number;
    }>;
  };
  markets: NormalizedMarket[];
  leaderboard: LeaderboardEntry[];
  builders: BuilderEntry[];
  competitions: CompetitionEntry[];
  pointsEpoch: PointsEpoch | null;
}

export function HomeClient({ initialData }: { initialData: OverviewPayload }) {
  const router = useRouter();
  const [data, setData] = useState<OverviewPayload>(initialData);
  const [sector, setSector] = useState<"All" | MarketSector>("All");
  const [marketQuery, setMarketQuery] = useState("");
  const [heroSearch, setHeroSearch] = useState("");
  const [countdown, setCountdown] = useState(
    initialData.pointsEpoch?.secondsUntilDistribution || 0
  );

  // Refresh overview every 25s
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/risex/overview");
        if (res.ok) {
          const json = (await res.json()) as OverviewPayload;
          setData(json);
          if (json.pointsEpoch) {
            setCountdown(json.pointsEpoch.secondsUntilDistribution);
          }
        }
      } catch {
        // ignore
      }
    }, 25000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const filteredMarkets = useMemo(() => {
    const q = marketQuery.trim().toLowerCase();
    return data.markets.filter((m) => {
      if (sector !== "All" && m.sector !== sector) return false;
      if (!q) return true;
      return (
        m.symbol.toLowerCase().includes(q) ||
        m.label.toLowerCase().includes(q) ||
        m.sector.toLowerCase().includes(q)
      );
    });
  }, [data.markets, sector, marketQuery]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroSearch.trim();
    if (!q) return;
    if (/^0x[a-fA-F0-9]{40}$/.test(q)) {
      router.push(`/explorer?address=${q}`);
      return;
    }
    if (/^0x[a-fA-F0-9]{64}$/.test(q)) {
      router.push(`/explorer?tx=${q}`);
      return;
    }
    const matched = data.markets.find(
      (m) =>
        m.symbol.toLowerCase() === q.toLowerCase() ||
        m.symbol.toLowerCase().includes(q.toLowerCase()) ||
        m.label.toLowerCase().includes(q.toLowerCase())
    );
    if (matched) {
      router.push(`/markets?id=${matched.id}`);
    } else {
      router.push(`/explorer?address=${encodeURIComponent(q)}`);
    }
  };

  const tickerMarkets = data.markets.slice(0, 10);
  const totalSectorVol = Math.max(
    1,
    data.summary.sectorBreakdown.reduce((s, b) => s + b.volume24hUsd, 0)
  );
  const liveCompetitions = data.competitions.filter((c) => c.state === "live");

  return (
    <div className="space-y-8">
      {/* Live Ticker Strip */}
      <div
        className="flex items-center gap-3 overflow-x-auto rounded-xl border px-3 py-2 text-xs"
        style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
      >
        <span
          className="shrink-0 inline-flex items-center gap-1.5 font-mono-num font-semibold px-2 py-0.5 rounded-md"
          style={{
            background: "var(--brand-mint-tint)",
            color: "var(--mint-bright)",
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full live-dot"
            style={{ background: "var(--mint)" }}
          />
          LIVE
        </span>
        <div className="flex items-center gap-5 overflow-x-auto no-scrollbar">
          {tickerMarkets.map((m) => (
            <Link
              key={m.id}
              href={`/markets?id=${m.id}`}
              className="shrink-0 flex items-center gap-2 hover:opacity-80"
            >
              <span className="font-mono-num font-semibold">{m.symbol}</span>
              <span className="font-mono-num" style={{ color: "var(--text-soft)" }}>
                {fmtPrice(m.markPrice)}
              </span>
              <span
                className="font-mono-num"
                style={{ color: m.change24hPct >= 0 ? "var(--up)" : "var(--down)" }}
              >
                {fmtPct(m.change24hPct)}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-7 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                borderColor: "var(--line-mint)",
                background: "var(--brand-mint-tint)",
                color: "var(--mint-bright)",
              }}
            >
              <Zap className="h-3 w-3" />
              RISE Mainnet · ~1ms Onchain Orderbook
            </span>
            <a
              href="https://x.com/anonfrxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors hover:border-[var(--line-mint)]"
              style={{
                borderColor: "var(--line)",
                background: "var(--surface-1)",
                color: "var(--text-mute)",
              }}
            >
              made by <strong style={{ color: "var(--mint-bright)" }}>anonfrxbt</strong>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-normal tracking-tight leading-[1.08]">
            House of all{" "}
            <span style={{ color: "var(--mint-bright)" }}>RISEx</span>
          </h1>

          <p className="max-w-2xl text-sm sm:text-base leading-relaxed" style={{ color: "var(--text-mute)" }}>
            Real-time analytics, wallet explorer, live orderbook depth, funding matrices,
            registered builders, and protocol intelligence for RISEx — the fully onchain
            unified exchange on RISE Chain.
          </p>

          {/* Hero Search Bar */}
          <form
            onSubmit={handleHeroSearch}
            className="flex items-center gap-2 rounded-xl border p-1.5 max-w-xl transition-colors focus-within:border-[var(--line-mint)]"
            style={{ background: "var(--card-bg-opaque)", borderColor: "var(--line)" }}
          >
            <Search className="ml-2.5 h-4 w-4 shrink-0" style={{ color: "var(--mint)" }} />
            <input
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              placeholder="Search 0x wallet, trader username, tx hash, or market (BTC, NVDA, XAU)…"
              className="w-full bg-transparent px-2 py-2 text-sm outline-none placeholder:text-[var(--text-dim)]"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg px-4 py-2 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90"
              style={{
                background: "var(--brand-mint-button)",
                color: "var(--brand-mint-button-fg)",
              }}
            >
              Explore
            </button>
          </form>
        </div>

        {/* Points Season 1 + XLP Vault Quick Card */}
        <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
          <div className="eco-card p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--mint-bright)" }}>
                <Sparkles className="h-3.5 w-3.5" />
                Season 1: Ignite Points
              </span>
              <span
                className="font-mono-num text-[11px] px-2 py-0.5 rounded border"
                style={{
                  borderColor: "var(--line-mint)",
                  background: "var(--brand-mint-tint)",
                  color: "var(--mint)",
                }}
              >
                {data.pointsEpoch?.epochId || "Live Epoch"}
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div>
                <div className="font-mono-num text-xl font-semibold">200,000 pts / wk</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--text-mute)" }}>
                  {data.pointsEpoch?.description || "Weekly trader, LP & builder allocation"}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                  Next drop
                </div>
                <div className="font-mono-num text-sm font-semibold" style={{ color: "var(--mint)" }}>
                  {fmtDuration(countdown)}
                </div>
              </div>
            </div>
          </div>

          <div className="eco-card p-4 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="text-xs font-semibold" style={{ color: "var(--text-soft)" }}>
                XLP Vault (ERC-4626) · Yearn V3
              </div>
              <div className="text-xs" style={{ color: "var(--text-mute)" }}>
                70% Crypto MM · 25% RWA MM · 5% Liquidation Insurance
              </div>
            </div>
            <Link
              href="/projects"
              className="shrink-0 inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-xs font-medium hover:border-[var(--line-mint)]"
              style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
            >
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </div>
      </section>

      {/* Protocol KPI Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="eco-card p-4">
          <div className="text-xs" style={{ color: "var(--text-mute)" }}>
            24h Exchange Volume
          </div>
          <div className="font-mono-num text-2xl sm:text-3xl font-semibold mt-1">
            {fmtCompactUsd(data.summary.totalVolume24hUsd)}
          </div>
          <div className="text-[11px] mt-1 font-mono-num" style={{ color: "var(--mint)" }}>
            Across {data.summary.activeMarketCount} live markets
          </div>
        </div>

        <div className="eco-card p-4">
          <div className="text-xs" style={{ color: "var(--text-mute)" }}>
            Total Open Interest
          </div>
          <div className="font-mono-num text-2xl sm:text-3xl font-semibold mt-1">
            {fmtCompactUsd(data.summary.totalOpenInterestUsd)}
          </div>
          <div className="text-[11px] mt-1 font-mono-num" style={{ color: "var(--text-dim)" }}>
            Avg Funding: {data.summary.avgFundingAprPct.toFixed(1)}% APR
          </div>
        </div>

        <div className="eco-card p-4">
          <div className="text-xs" style={{ color: "var(--text-mute)" }}>
            Registered Builders
          </div>
          <div className="font-mono-num text-2xl sm:text-3xl font-semibold mt-1">
            {data.summary.totalBuilders}
          </div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>
            {data.summary.activeBuilders} active builder codes
          </div>
        </div>

        <div className="eco-card p-4">
          <div className="text-xs" style={{ color: "var(--text-mute)" }}>
            Active Competitions
          </div>
          <div className="font-mono-num text-2xl sm:text-3xl font-semibold mt-1">
            {data.summary.liveCompetitions}
          </div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-dim)" }}>
            {data.competitions.length} total seasons &amp; cups
          </div>
        </div>
      </section>

      {/* Asset Class Mix Bar */}
      <section className="eco-card p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">Unified Exchange Asset Mix (24h Volume)</h2>
            <p className="text-xs" style={{ color: "var(--text-mute)" }}>
              Crypto, Equities/ETFs, and Commodities settling atomically on one orderbook
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {data.summary.sectorBreakdown.map((s) => (
              <div key={s.sector} className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-sm"
                  style={{
                    background:
                      s.sector === "Crypto"
                        ? "var(--mint)"
                        : s.sector === "Equities & ETFs"
                          ? "var(--rise-purple)"
                          : "var(--amber)",
                  }}
                />
                <span>
                  {s.sector} ({s.count})
                </span>
                <span className="font-mono-num font-semibold">
                  {fmtCompactUsd(s.volume24hUsd)}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="h-3 w-full overflow-hidden rounded-full flex" style={{ background: "var(--surface-2)" }}>
          {data.summary.sectorBreakdown.map((s) => {
            const pct = (s.volume24hUsd / totalSectorVol) * 100;
            const col =
              s.sector === "Crypto"
                ? "var(--mint)"
                : s.sector === "Equities & ETFs"
                  ? "var(--rise-purple)"
                  : "var(--amber)";
            return (
              <div
                key={s.sector}
                style={{ width: `${pct}%`, background: col }}
                title={`${s.sector}: ${pct.toFixed(1)}% (${fmtCompactUsd(s.volume24hUsd)})`}
              />
            );
          })}
        </div>
      </section>

      {/* Live Market Depth & Chart Workbench */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-2xl font-normal">Live Market Terminal</h2>
            <p className="text-xs" style={{ color: "var(--text-mute)" }}>
              Switch any of the {data.markets.length} active pairs for real-time orderbook depth, OHLC candles, fills &amp; funding
            </p>
          </div>
          <Link
            href="/markets"
            className="inline-flex items-center gap-1 text-xs font-medium hover:underline"
            style={{ color: "var(--mint-bright)" }}
          >
            Full Markets &amp; Funding Matrix <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <MarketWorkbench markets={data.markets} initialMarketId="1" />
      </section>

      {/* Markets Table */}
      <section className="eco-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {(["All", "Crypto", "Equities & ETFs", "Commodities"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setSector(tab)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors"
                style={{
                  background: sector === tab ? "var(--tab-bg-active)" : "var(--surface-1)",
                  color: sector === tab ? "var(--mint-bright)" : "var(--text-mute)",
                  border:
                    sector === tab
                      ? "1px solid var(--line-mint)"
                      : "1px solid var(--line)",
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          <div
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
          >
            <Search className="h-3.5 w-3.5" style={{ color: "var(--text-dim)" }} />
            <input
              value={marketQuery}
              onChange={(e) => setMarketQuery(e.target.value)}
              placeholder="Filter ticker…"
              className="bg-transparent outline-none w-36 placeholder:text-[var(--text-dim)]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                <th className="py-2.5 pr-4 font-medium">Market</th>
                <th className="py-2.5 px-3 font-medium">Sector</th>
                <th className="py-2.5 px-3 font-medium text-right">Mark Price</th>
                <th className="py-2.5 px-3 font-medium text-right">24h %</th>
                <th className="py-2.5 px-3 font-medium text-right">24h Volume</th>
                <th className="py-2.5 px-3 font-medium text-right">Open Interest</th>
                <th className="py-2.5 px-3 font-medium text-right">Funding (APR)</th>
                <th className="py-2.5 pl-3 font-medium text-right">Lev</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
              {filteredMarkets.slice(0, 18).map((m) => (
                <tr
                  key={m.id}
                  onClick={() => router.push(`/markets?id=${m.id}`)}
                  className="cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                >
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num font-semibold">{m.symbol}/USDC</span>
                      <span className="hidden sm:inline" style={{ color: "var(--text-dim)" }}>
                        {m.label}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className="rounded-md px-2 py-0.5 text-[10px] font-medium"
                      style={{
                        background:
                          m.sector === "Crypto"
                            ? "var(--brand-mint-tint)"
                            : m.sector === "Equities & ETFs"
                              ? "var(--rise-purple-tint)"
                              : "rgba(245, 182, 107, 0.14)",
                        color:
                          m.sector === "Crypto"
                            ? "var(--mint-bright)"
                            : m.sector === "Equities & ETFs"
                              ? "var(--rise-purple)"
                              : "var(--amber)",
                      }}
                    >
                      {m.sector}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num">{fmtPrice(m.markPrice)}</td>
                  <td
                    className="py-2.5 px-3 text-right font-mono-num"
                    style={{ color: m.change24hPct >= 0 ? "var(--up)" : "var(--down)" }}
                  >
                    {fmtPct(m.change24hPct)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num font-medium">
                    {fmtCompactUsd(m.volume24hUsd)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono-num">
                    {fmtCompactUsd(m.openInterestUsd)}
                  </td>
                  <td
                    className="py-2.5 px-3 text-right font-mono-num"
                    style={{ color: m.fundingAprPct >= 0 ? "var(--up)" : "var(--down)" }}
                  >
                    {m.fundingAprPct >= 0 ? "+" : ""}
                    {m.fundingAprPct.toFixed(1)}%
                  </td>
                  <td className="py-2.5 pl-3 text-right font-mono-num" style={{ color: "var(--text-mute)" }}>
                    {m.maxLeverage}x
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-between items-center pt-1 text-xs" style={{ color: "var(--text-mute)" }}>
          <span>Showing top {Math.min(18, filteredMarkets.length)} of {filteredMarkets.length} markets</span>
          <Link href="/markets" className="font-medium hover:underline" style={{ color: "var(--mint-bright)" }}>
            View all {data.markets.length} markets →
          </Link>
        </div>
      </section>

      {/* Top Traders Leaderboard + Live Competitions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-8 eco-card p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" style={{ color: "var(--mint)" }} />
              <h2 className="text-base font-semibold">Top RISEx Traders (All-Time PnL)</h2>
            </div>
            <Link
              href="/explorer"
              className="text-xs font-medium hover:underline"
              style={{ color: "var(--mint-bright)" }}
            >
              Open Wallet Explorer →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                  <th className="py-2 pr-3 font-medium">#</th>
                  <th className="py-2 px-2 font-medium">Trader</th>
                  <th className="py-2 px-2 font-medium text-right">PnL</th>
                  <th className="py-2 px-2 font-medium text-right">ROI</th>
                  <th className="py-2 px-2 font-medium text-right">Win Rate</th>
                  <th className="py-2 px-2 font-medium text-right">Volume</th>
                  <th className="py-2 pl-2 font-medium text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {data.leaderboard.slice(0, 10).map((t) => (
                  <tr key={t.address} className="hover:bg-[var(--bg-hover)]">
                    <td className="py-2.5 pr-3 font-mono-num" style={{ color: "var(--text-dim)" }}>
                      {t.rank}
                    </td>
                    <td className="py-2.5 px-2">
                      <Link
                        href={`/explorer?address=${t.address}`}
                        className="flex items-center gap-2 hover:underline"
                      >
                        {t.avatarUrl ? (
                          <Image
                            src={t.avatarUrl}
                            alt=""
                            width={20}
                            height={20}
                            className="h-5 w-5 rounded-full object-cover border"
                            style={{ borderColor: "var(--line)" }}
                          />
                        ) : (
                          <span
                            className="grid h-5 w-5 place-items-center rounded-full text-[10px] font-mono-num"
                            style={{ background: "var(--surface-2)", color: "var(--mint)" }}
                          >
                            {t.address.slice(2, 4)}
                          </span>
                        )}
                        <span className="font-medium">
                          {t.xHandle ? `@${t.xHandle}` : t.username || shortAddr(t.address)}
                        </span>
                      </Link>
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
                      {fmtCompactUsd(t.combinedVolumeUsd)}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <Link
                        href={`/explorer?address=${t.address}`}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border hover:border-[var(--line-mint)]"
                        style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
                      >
                        <Wallet className="h-3 w-3" style={{ color: "var(--mint)" }} />
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Competitions & Ecosystem Highlights */}
        <div className="lg:col-span-4 space-y-4">
          <div className="eco-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" style={{ color: "var(--amber)" }} />
                <h2 className="text-base font-semibold">Live Competitions</h2>
              </div>
              <Link href="/projects" className="text-xs" style={{ color: "var(--mint-bright)" }}>
                All →
              </Link>
            </div>

            <div className="space-y-2.5">
              {liveCompetitions.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="rounded-xl border p-3 flex items-center justify-between gap-3"
                  style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
                >
                  <div>
                    <div className="text-xs font-semibold">{c.name}</div>
                    <div className="text-[11px] font-mono-num mt-0.5" style={{ color: "var(--text-dim)" }}>
                      {c.participant_count.toLocaleString()} traders
                    </div>
                  </div>
                  <div className="text-right">
                    {Number(c.prize_pool) > 0 ? (
                      <span
                        className="font-mono-num text-xs font-semibold px-2 py-0.5 rounded"
                        style={{
                          background: "rgba(245, 182, 107, 0.14)",
                          color: "var(--amber)",
                        }}
                      >
                        {fmtUsd(Number(c.prize_pool), false, 0)}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-mono-num uppercase px-2 py-0.5 rounded"
                        style={{
                          background: "var(--brand-mint-tint)",
                          color: "var(--mint)",
                        }}
                      >
                        Live
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="eco-card p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4" style={{ color: "var(--mint)" }} />
                <h2 className="text-base font-semibold">Featured Builders</h2>
              </div>
              <Link href="/projects" className="text-xs" style={{ color: "var(--mint-bright)" }}>
                {data.builders.length} total →
              </Link>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {data.builders
                .filter((b) => b.is_active)
                .slice(0, 14)
                .map((b) => (
                  <Link
                    key={b.builder_id}
                    href={`/projects?builder=${encodeURIComponent(b.slug)}`}
                    className="rounded-lg border px-2.5 py-1 text-xs transition-colors hover:border-[var(--line-mint)]"
                    style={{ borderColor: "var(--line)", background: "var(--surface-1)" }}
                  >
                    <span className="font-medium">{b.name}</span>{" "}
                    <span className="font-mono-num text-[10px]" style={{ color: "var(--text-dim)" }}>
                      #{b.builder_id}
                    </span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
