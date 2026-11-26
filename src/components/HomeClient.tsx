"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowUpRight, Search } from "lucide-react";
import { LiveDot, MarketBadge } from "./MarketBadge";
import { MarketWorkbench } from "./MarketWorkbench";
import {
  fmtCompactUsd,
  fmtDuration,
  fmtPct,
  fmtPrice,
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
    }, 30000);
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

  const topOiMarkets = useMemo(() => {
    return [...data.markets]
      .sort((a, b) => b.openInterestUsd - a.openInterestUsd)
      .slice(0, 10);
  }, [data.markets]);

  const maxOi = Math.max(1, topOiMarkets[0]?.openInterestUsd || 1);
  const marqueeItems = data.markets.slice(0, 12);

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

  return (
    <div className="space-y-6 reveal">
      {/* Continuous Marquee Price Strip */}
      <div
        className="marquee-mask rounded-[7px] border py-2 px-3"
        style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
      >
        <div className="marquee-track">
          {[...marqueeItems, ...marqueeItems].map((m, idx) => (
            <Link
              key={`${m.id}-${idx}`}
              href={`/markets?id=${m.id}`}
              className="inline-flex items-center gap-2 text-xs hover:opacity-80"
            >
              <MarketBadge symbol={m.symbol} size={18} />
              <span className="font-semibold tracking-tight">{m.symbol}</span>
              <span className="font-mono-num" style={{ color: "var(--text-mute)" }}>
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

      {/* Minimalist Hero + Search */}
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between pt-1">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <span
              className="inline-flex items-center gap-2 font-mono-num px-2 py-0.5 rounded-[5px] border"
              style={{
                borderColor: "var(--line-mint)",
                background: "var(--brand-mint-tint)",
                color: "var(--mint-bright)",
              }}
            >
              <LiveDot />
              LIVE · 30s pulse
            </span>
            <a
              href="https://x.com/anonfrxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:underline"
              style={{ color: "var(--text-dim)" }}
            >
              made by <span style={{ color: "var(--accent)" }}>anonfrxbt</span>
              <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>

          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            RISEx Market Intelligence
          </h1>
          <p className="text-xs sm:text-sm max-w-xl" style={{ color: "var(--text-mute)" }}>
            Onchain perpetual markets, open interest leaders, funding carry, and wallet analytics on RISE Chain.
          </p>
        </div>

        <form
          onSubmit={handleHeroSearch}
          className="flex items-center gap-2 rounded-[7px] border px-2.5 py-1.5 w-full lg:w-[420px] transition-colors focus-within:border-[var(--line-mint)]"
          style={{ background: "var(--surface-0)", borderColor: "var(--line)" }}
        >
          <Search className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--text-dim)" }} />
          <input
            value={heroSearch}
            onChange={(e) => setHeroSearch(e.target.value)}
            placeholder="Search 0x wallet, trader, or ticker…"
            className="w-full bg-transparent text-base sm:text-xs outline-none placeholder:text-[var(--text-dim)]"
          />
          <button
            type="submit"
            className="shrink-0 rounded-[5px] px-3 py-1 text-xs font-semibold cursor-pointer"
            style={{
              background: "var(--brand-mint-button)",
              color: "var(--brand-mint-button-fg)",
            }}
          >
            Go
          </button>
        </form>
      </section>

      {/* Clean 4-Card KPI Strip */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <div className="eco-card p-3.5 sm:p-4">
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
            24h Volume
          </div>
          <div className="font-mono-num text-xl sm:text-2xl font-semibold mt-1">
            {fmtCompactUsd(data.summary.totalVolume24hUsd)}
          </div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-mute)" }}>
            {data.summary.activeMarketCount} active pairs
          </div>
        </div>

        <div className="eco-card p-3.5 sm:p-4">
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
            Open Interest
          </div>
          <div className="font-mono-num text-xl sm:text-2xl font-semibold mt-1">
            {fmtCompactUsd(data.summary.totalOpenInterestUsd)}
          </div>
          <div className="text-[11px] font-mono-num mt-1" style={{ color: "var(--up)" }}>
            Avg funding {data.summary.avgFundingAprPct.toFixed(1)}% APR
          </div>
        </div>

        <Link href="/projects" className="eco-card p-3.5 sm:p-4 block">
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
            Builders
          </div>
          <div className="font-mono-num text-xl sm:text-2xl font-semibold mt-1">
            {data.summary.totalBuilders}
          </div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-mute)" }}>
            {data.summary.liveCompetitions} live competitions →
          </div>
        </Link>

        <Link href="/points" className="eco-card p-3.5 sm:p-4 block">
          <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-dim)" }}>
            Ignite · {data.pointsEpoch?.epochId || "Season 1"}
          </div>
          <div className="font-mono-num text-xl sm:text-2xl font-semibold mt-1" style={{ color: "var(--accent)" }}>
            {fmtDuration(countdown)}
          </div>
          <div className="text-[11px] mt-1" style={{ color: "var(--text-mute)" }}>
            200k pts/wk · Rank lookup →
          </div>
        </Link>
      </section>

      {/* OI Leader Grid (Top 10 Markets) */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: "var(--text-mute)" }}>
            Open Interest Leaders
          </span>
          <Link href="/markets" className="inline-flex items-center gap-1 hover:underline" style={{ color: "var(--accent)" }}>
            All markets <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="oi-leader-grid">
          {topOiMarkets.map((m) => {
            const pct = Math.max(6, (m.openInterestUsd / maxOi) * 100);
            return (
              <Link
                key={m.id}
                href={`/markets?id=${m.id}`}
                className="eco-card p-2.5 sm:p-3 flex flex-col justify-between gap-2 hover:bg-[var(--bg-hover)]"
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <MarketBadge symbol={m.symbol} size={18} />
                    <span className="text-xs font-semibold truncate">{m.symbol}</span>
                  </div>
                  <span
                    className="font-mono-num text-[10px]"
                    style={{ color: m.change24hPct >= 0 ? "var(--up)" : "var(--down)" }}
                  >
                    {fmtPct(m.change24hPct)}
                  </span>
                </div>

                <div>
                  <div className="font-mono-num text-sm font-semibold">
                    {fmtCompactUsd(m.openInterestUsd)}
                  </div>
                  <div className="mt-1.5 h-[2.5px] w-full rounded-full overflow-hidden" style={{ background: "var(--surface-2)" }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: "var(--accent)" }}
                    />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Live Market Workbench */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold uppercase tracking-wider text-[11px]" style={{ color: "var(--text-mute)" }}>
            Live Orderbook &amp; Chart
          </span>
          <Link href="/markets" className="inline-flex items-center gap-1 hover:underline" style={{ color: "var(--accent)" }}>
            Funding matrix <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <MarketWorkbench markets={data.markets} initialMarketId="1" />
      </section>

      {/* Clean Markets Screener + Top Wallets */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Screener */}
        <div className="lg:col-span-7 eco-card p-3.5 sm:p-4 space-y-3">
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-1">
              {(["All", "Crypto", "Equities & ETFs", "Commodities"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSector(tab)}
                  className="rounded-[6px] px-2.5 py-1 text-xs font-medium cursor-pointer transition-colors"
                  style={{
                    background: sector === tab ? "var(--tab-bg-active)" : "transparent",
                    color: sector === tab ? "var(--mint-bright)" : "var(--text-mute)",
                  }}
                >
                  {tab === "Equities & ETFs" ? "Equities" : tab}
                </button>
              ))}
            </div>

            <div
              className="flex items-center gap-2 rounded-[6px] border px-2.5 py-1 text-xs"
              style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
            >
              <Search className="h-3 w-3" style={{ color: "var(--text-dim)" }} />
              <input
                value={marketQuery}
                onChange={(e) => setMarketQuery(e.target.value)}
                placeholder="Filter ticker…"
                className="bg-transparent outline-none w-full sm:w-28 text-base sm:text-xs"
              />
            </div>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y" style={{ borderColor: "var(--line-soft)" }}>
            {filteredMarkets.slice(0, 10).map((m) => (
              <Link
                key={m.id}
                href={`/markets?id=${m.id}`}
                className="flex items-center justify-between py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <MarketBadge symbol={m.symbol} size={22} />
                  <div className="min-w-0">
                    <div className="text-xs font-semibold">{m.symbol}</div>
                    <div className="text-[11px] font-mono-num" style={{ color: "var(--text-dim)" }}>
                      Vol {fmtCompactUsd(m.volume24hUsd)} · {m.maxLeverage}x
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-mono-num text-xs font-semibold">{fmtPrice(m.markPrice)}</div>
                  <div
                    className="font-mono-num text-[11px]"
                    style={{ color: m.change24hPct >= 0 ? "var(--up)" : "var(--down)" }}
                  >
                    {fmtPct(m.change24hPct)}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase tracking-wider" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                  <th className="py-2 pr-3 font-medium">Market</th>
                  <th className="py-2 px-2 font-medium text-right">Price</th>
                  <th className="py-2 px-2 font-medium text-right">24h %</th>
                  <th className="py-2 px-2 font-medium text-right">Volume</th>
                  <th className="py-2 px-2 font-medium text-right">OI</th>
                  <th className="py-2 pl-2 font-medium text-right">APR</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line-soft)" }}>
                {filteredMarkets.slice(0, 12).map((m) => (
                  <tr
                    key={m.id}
                    onClick={() => router.push(`/markets?id=${m.id}`)}
                    className="cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                  >
                    <td className="py-2.5 pr-3">
                      <div className="flex items-center gap-2">
                        <MarketBadge symbol={m.symbol} size={20} />
                        <span className="font-semibold">{m.symbol}</span>
                        <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
                          {m.maxLeverage}x
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">{fmtPrice(m.markPrice)}</td>
                    <td
                      className="py-2.5 px-2 text-right font-mono-num"
                      style={{ color: m.change24hPct >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {fmtPct(m.change24hPct)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num font-medium">
                      {fmtCompactUsd(m.volume24hUsd)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num" style={{ color: "var(--text-mute)" }}>
                      {fmtCompactUsd(m.openInterestUsd)}
                    </td>
                    <td
                      className="py-2.5 pl-2 text-right font-mono-num"
                      style={{ color: m.fundingAprPct >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {m.fundingAprPct >= 0 ? "+" : ""}
                      {m.fundingAprPct.toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Traders */}
        <div className="lg:col-span-5 eco-card p-3.5 sm:p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[11px]" style={{ color: "var(--text-mute)" }}>
              Top Wallets (All-Time PnL)
            </span>
            <Link href="/explorer" className="text-xs hover:underline" style={{ color: "var(--accent)" }}>
              Explorer →
            </Link>
          </div>

          <div className="divide-y" style={{ borderColor: "var(--line-soft)" }}>
            {data.leaderboard.slice(0, 10).map((t) => (
              <Link
                key={t.address}
                href={`/explorer?address=${t.address}`}
                className="flex items-center justify-between py-2.5 px-1 rounded-[5px] transition-colors hover:bg-[var(--bg-hover)]"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="font-mono-num text-[11px] w-5" style={{ color: "var(--text-dim)" }}>
                    #{t.rank}
                  </span>
                  {t.avatarUrl ? (
                    <Image
                      src={t.avatarUrl}
                      alt=""
                      width={22}
                      height={22}
                      className="h-5 w-5 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <span
                      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-mono-num"
                      style={{ background: "var(--surface-2)", color: "var(--accent)" }}
                    >
                      {t.address.slice(2, 4)}
                    </span>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-medium truncate">
                      {t.xHandle ? `@${t.xHandle}` : t.username || shortAddr(t.address)}
                    </div>
                    <div className="text-[11px] font-mono-num" style={{ color: "var(--text-dim)" }}>
                      Vol {fmtCompactUsd(t.combinedVolumeUsd)} · {t.winRatePct.toFixed(0)}% WR
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div
                    className="font-mono-num text-xs font-semibold"
                    style={{ color: t.notionalPnlUsd >= 0 ? "var(--up)" : "var(--down)" }}
                  >
                    {fmtCompactUsd(t.notionalPnlUsd, true)}
                  </div>
                  <div
                    className="font-mono-num text-[11px]"
                    style={{ color: t.roiPct >= 0 ? "var(--up)" : "var(--down)" }}
                  >
                    {fmtPct(t.roiPct)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
