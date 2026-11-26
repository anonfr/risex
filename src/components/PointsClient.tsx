"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  Award,
  Crown,
  KeyRound,
  Search,
  Shield,
  Sparkles,
  Trophy,
  Wallet,
} from "lucide-react";
import {
  fmtCompactUsd,
  fmtDuration,
  fmtUsd,
  num,
  shortAddr,
} from "@/lib/format";
import { CompetitionEntry, PointsEpoch } from "@/lib/risex";
import type { CompetitionScoreRow, FeeTierHolder } from "@/app/api/risex/points/route";

interface InitialPointsData {
  pointsEpoch: PointsEpoch | null;
  competitions: CompetitionEntry[];
  activeSlug: string;
  competitionTotal: number;
  scoreRows: CompetitionScoreRow[];
  feeTierHolders: FeeTierHolder[];
}

interface Eip1193Provider {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
}

export function PointsClient({ initial }: { initial: InitialPointsData }) {
  const [subTab, setSubTab] = useState<"scores" | "tiers" | "private">("scores");
  const [slug, setSlug] = useState(initial.activeSlug || "perpkin");
  const [scoreRows, setScoreRows] = useState<CompetitionScoreRow[]>(initial.scoreRows);
  const [compTotal, setCompTotal] = useState(initial.competitionTotal);
  const [loadingComp, setLoadingComp] = useState(false);

  // Search controls: supports rank (#1, 42), min score / points (>=50), 0x address, or username
  const [searchQuery, setSearchQuery] = useState("");
  const [rankLookup, setRankLookup] = useState("");
  const [minThreshold, setMinThreshold] = useState("");
  const [tierFilter, setTierFilter] = useState<number>(0);

  // Countdown
  const [countdown, setCountdown] = useState(
    initial.pointsEpoch?.secondsUntilDistribution || 0
  );

  // Optional Authenticated RISEx Points (/v1/points/leaderboard & /v1/points/{wallet})
  const [jwtToken, setJwtToken] = useState("");
  const [connectedWallet, setConnectedWallet] = useState("");
  const [authStatus, setAuthStatus] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [privateLb, setPrivateLb] = useState<Array<Record<string, unknown>>>([]);
  const [privateLbNote, setPrivateLbNote] = useState<string | null>(null);
  const [myPoints, setMyPoints] = useState<Record<string, unknown> | null>(null);
  const [myHistory, setMyHistory] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const loadCompetition = async (nextSlug: string) => {
    setSlug(nextSlug);
    setLoadingComp(true);
    try {
      const res = await fetch(
        `/api/risex/points?slug=${encodeURIComponent(nextSlug)}&limit=100`
      );
      const json = await res.json();
      if (Array.isArray(json.scoreRows)) {
        setScoreRows(json.scoreRows);
        setCompTotal(json.competitionTotal || json.scoreRows.length);
      }
    } catch {
      // ignore
    } finally {
      setLoadingComp(false);
    }
  };

  // Filter score rows by address, username, exact rank, or minimum score/points
  const filteredScores = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetRank = rankLookup.trim() ? Number(rankLookup.replace("#", "").trim()) : null;
    const minVal = minThreshold.trim() ? Number(minThreshold.trim()) : null;

    return scoreRows.filter((r) => {
      if (targetRank !== null && Number.isFinite(targetRank) && targetRank > 0) {
        if (r.rank !== targetRank) return false;
      }
      if (minVal !== null && Number.isFinite(minVal)) {
        if (r.tradingScore < minVal) return false;
      }
      if (!q) return true;
      if (/^\d+$/.test(q.replace("#", ""))) {
        return String(r.rank) === q.replace("#", "");
      }
      return (
        r.address.toLowerCase().includes(q) ||
        r.username.toLowerCase().includes(q) ||
        (r.xHandle ? r.xHandle.toLowerCase().includes(q) : false)
      );
    });
  }, [scoreRows, searchQuery, rankLookup, minThreshold]);

  // Filter Fee Tier holders by tier, rank, min 2w volume, or address/handle
  const filteredTierHolders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetRank = rankLookup.trim() ? Number(rankLookup.replace("#", "").trim()) : null;

    return initial.feeTierHolders.filter((h) => {
      if (tierFilter > 0 && h.feeTier !== tierFilter) return false;
      if (targetRank !== null && Number.isFinite(targetRank) && targetRank > 0) {
        if (h.rank !== targetRank) return false;
      }
      if (!q) return true;
      if (/^\d+$/.test(q.replace("#", ""))) {
        return String(h.rank) === q.replace("#", "");
      }
      return (
        h.address.toLowerCase().includes(q) ||
        h.username.toLowerCase().includes(q) ||
        (h.xHandle ? h.xHandle.toLowerCase().includes(q) : false)
      );
    });
  }, [initial.feeTierHolders, tierFilter, searchQuery, rankLookup]);

  const filteredPrivateLb = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const targetRank = rankLookup.trim() ? Number(rankLookup.replace("#", "").trim()) : null;
    const minPts = minThreshold.trim() ? Number(minThreshold.trim()) : null;

    return privateLb.filter((row, idx) => {
      const rankVal = num((row.rank as string | number) ?? idx + 1);
      const ptsVal = num((row.total_points as string | number) ?? (row.points as string | number));
      const addr = String(row.wallet_address || row.address || "").toLowerCase();
      const uname = String(row.username || "").toLowerCase();
      if (targetRank !== null && Number.isFinite(targetRank) && targetRank > 0 && rankVal !== targetRank) {
        return false;
      }
      if (minPts !== null && Number.isFinite(minPts) && ptsVal < minPts) {
        return false;
      }
      if (!q) return true;
      if (/^\d+$/.test(q.replace("#", ""))) {
        return String(rankVal) === q.replace("#", "");
      }
      return addr.includes(q) || uname.includes(q);
    });
  }, [privateLb, searchQuery, rankLookup, minThreshold]);

  const tierDistribution = useMemo(() => {
    const counts = new Map<number, number>();
    for (const h of initial.feeTierHolders) {
      counts.set(h.feeTier, (counts.get(h.feeTier) || 0) + 1);
    }
    return [6, 5, 4, 3, 2, 1].map((t) => ({
      tier: t,
      count: counts.get(t) || 0,
    }));
  }, [initial.feeTierHolders]);

  const queryAuthenticatedPoints = async (token: string, account?: string) => {
    setAuthLoading(true);
    setAuthStatus(null);
    setPrivateLbNote(null);
    try {
      const res = await fetch("/api/risex/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, account }),
      });
      const json = await res.json();
      if (json.error) {
        setAuthStatus(json.error);
        return;
      }
      const lb = json.leaderboard;
      if (lb?.status === 200 && lb.data?.data) {
        const entries =
          lb.data.data.entries || lb.data.data.rows || lb.data.data.leaderboard || [];
        setPrivateLb(Array.isArray(entries) ? entries : []);
        if (!Array.isArray(entries) || entries.length === 0) {
          setPrivateLbNote("Points leaderboard returned 0 entries for this session.");
        }
      } else {
        setPrivateLb([]);
        setPrivateLbNote(
          lb?.data?.error?.message ||
            `GET /v1/points/leaderboard returned HTTP ${lb?.status || 401}`
        );
      }

      const wp = json.walletPoints;
      if (wp?.status === 200 && wp.data?.data) {
        setMyPoints(wp.data.data);
      }
      const wh = json.walletHistory;
      if (wh?.status === 200 && Array.isArray(wh.data?.data?.entries)) {
        setMyHistory(wh.data.data.entries);
      }
    } catch (e) {
      setAuthStatus(e instanceof Error ? e.message : "Failed to query points");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleWalletSignIn = async () => {
    const eth = (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
    if (!eth) {
      setAuthStatus("No EVM wallet detected in this browser. Paste a RISEx JWT below or open in a wallet browser.");
      return;
    }
    setAuthLoading(true);
    setAuthStatus(null);
    try {
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      const account = accounts?.[0];
      if (!account) throw new Error("No wallet account selected");

      const prepRes = await fetch("/api/risex/auth");
      const prep = await prepRes.json();
      if (!prep.domain || !prep.nonce) {
        throw new Error(prep.error || "Could not fetch RISEx login nonce");
      }

      const deadline = Math.floor(Date.now() / 1000) + 3600;
      const nonceDecimal = BigInt(prep.nonce).toString(10);

      const typedData = {
        types: {
          EIP712Domain: [
            { name: "name", type: "string" },
            { name: "version", type: "string" },
            { name: "chainId", type: "uint256" },
            { name: "verifyingContract", type: "address" },
          ],
          Login: [
            { name: "account", type: "address" },
            { name: "nonce", type: "uint256" },
            { name: "deadline", type: "uint32" },
          ],
        },
        primaryType: "Login",
        domain: {
          name: prep.domain.name,
          version: prep.domain.version,
          chainId: Number(prep.domain.chain_id),
          verifyingContract: prep.domain.verifying_contract,
        },
        message: {
          account,
          nonce: nonceDecimal,
          deadline,
        },
      };

      const signature = (await eth.request({
        method: "eth_signTypedData_v4",
        params: [account, JSON.stringify(typedData)],
      })) as string;

      const loginRes = await fetch("/api/risex/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          nonce: prep.nonce,
          deadline,
          signature,
        }),
      });
      const loginJson = await loginRes.json();
      if (!loginRes.ok || !loginJson.access_token) {
        throw new Error(loginJson.error || "RISEx login failed");
      }

      setConnectedWallet(account);
      setJwtToken(loginJson.access_token);
      setSubTab("private");
      await queryAuthenticatedPoints(loginJson.access_token, account);
    } catch (e) {
      setAuthStatus(e instanceof Error ? e.message : "Wallet sign-in cancelled");
    } finally {
      setAuthLoading(false);
    }
  };

  const competitionsWithRows = initial.competitions.filter(
    (c) => c.participant_count > 0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="text-xs font-mono-num uppercase tracking-wider" style={{ color: "var(--mint)" }}>
            Season 1: Ignite · Scores, Ranks &amp; Tiers
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-normal mt-1">
            Points, Rank Lookup &amp; Tier Holders
          </h1>
          <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--text-mute)" }}>
            Inspect top competition score holders, volume fee-tier holders, search any
            rank number (`#1`, `#42`) or minimum score to find the associated wallet, or
            sign in with your RISEx wallet to query private Season 1 points.
          </p>
        </div>

        <div className="eco-card px-4 py-3 shrink-0 flex items-center gap-4">
          <div>
            <div className="text-[11px]" style={{ color: "var(--text-dim)" }}>
              {initial.pointsEpoch?.epochId || "Season 1: Ignite"} · 200k pts/wk
            </div>
            <div className="font-mono-num text-sm font-semibold" style={{ color: "var(--mint)" }}>
              Next drop in {fmtDuration(countdown)}
            </div>
          </div>
          <Sparkles className="h-5 w-5" style={{ color: "var(--mint)" }} />
        </div>
      </div>

      {/* Honest API Scope Banner */}
      <div
        className="rounded-xl border p-3.5 text-xs flex items-start gap-2.5"
        style={{
          borderColor: "var(--line-mint)",
          background: "var(--brand-mint-tint)",
          color: "var(--text-soft)",
        }}
      >
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--mint)" }} />
        <div className="space-y-1">
          <div>
            <strong>Public vs. Authenticated RISEx Data:</strong> RISEx gates raw Season 1
            Points balances (<code>/v1/points/leaderboard</code> &amp;{" "}
            <code>/v1/points/&#123;wallet&#125;</code>) behind a signed-in RISEx JWT, and does
            not publish Discord role-holder lists (<code>/v1/tiers</code> is currently empty).
          </div>
          <div style={{ color: "var(--text-mute)" }}>
            Below you get live, unauthenticated <strong>Competition Score &amp; Ticket Holders</strong>{" "}
            (<code>{compTotal}</code> ranked wallets) and{" "}
            <strong>14-Day Volume Fee-Tier Holders (Tier 1–6)</strong> — plus a{" "}
            <strong>Wallet Sign-In</strong> tab to query your authenticated RISEx points directly.
          </div>
        </div>
      </div>

      {/* Sub-Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["scores", "Score & Rank Holders", Trophy],
            ["tiers", "Fee Tier Holders (Tier 1–6)", Crown],
            ["private", "RISEx Points Auth (JWT)", KeyRound],
          ] as const
        ).map(([k, label, Icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setSubTab(k)}
            className="inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium cursor-pointer transition-colors"
            style={{
              background: subTab === k ? "var(--tab-bg-active)" : "var(--surface-1)",
              color: subTab === k ? "var(--mint-bright)" : "var(--text-mute)",
              border:
                subTab === k
                  ? "1px solid var(--line-mint)"
                  : "1px solid var(--line)",
            }}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Unified Search Controls (Rank #, Min Score/Points, Address/Handle) */}
      <div className="eco-card p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-12 gap-2.5">
        <div
          className="sm:col-span-6 flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--mint)" }} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search 0x address, X handle, or #rank…"
            className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:text-[var(--text-dim)]"
          />
        </div>

        <div
          className="sm:col-span-3 flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
        >
          <span className="text-xs font-mono-num shrink-0" style={{ color: "var(--text-dim)" }}>
            Rank #
          </span>
          <input
            type="number"
            min={1}
            value={rankLookup}
            onChange={(e) => setRankLookup(e.target.value)}
            placeholder="e.g. 1, 25"
            className="w-full bg-transparent text-base sm:text-sm font-mono-num outline-none placeholder:text-[var(--text-dim)]"
          />
        </div>

        <div
          className="sm:col-span-3 flex items-center gap-2 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
        >
          <span className="text-xs font-mono-num shrink-0" style={{ color: "var(--text-dim)" }}>
            {subTab === "private" ? "Min Pts" : "Min Score"}
          </span>
          <input
            type="number"
            step="any"
            value={minThreshold}
            onChange={(e) => setMinThreshold(e.target.value)}
            placeholder="e.g. 10"
            className="w-full bg-transparent text-base sm:text-sm font-mono-num outline-none placeholder:text-[var(--text-dim)]"
          />
        </div>
      </div>

      {/* TAB 1: Live Competition Score & Rank Holders */}
      {subTab === "scores" && (
        <div className="eco-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4" style={{ color: "var(--mint)" }} />
              <h2 className="text-base font-semibold">
                Top Score &amp; Ticket Holders ({filteredScores.length} shown / {compTotal} total)
              </h2>
            </div>

            <select
              value={slug}
              onChange={(e) => loadCompetition(e.target.value)}
              className="w-full sm:w-auto rounded-xl border px-3 py-2 text-xs font-medium outline-none cursor-pointer"
              style={{
                background: "var(--tab-bg)",
                borderColor: "var(--line-mint)",
                color: "var(--text)",
              }}
            >
              {competitionsWithRows.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.participant_count} traders)
                </option>
              ))}
            </select>
          </div>

          {loadingComp && (
            <div className="text-xs" style={{ color: "var(--mint)" }}>
              Loading competition rankings…
            </div>
          )}

          {/* Mobile Cards */}
          <div className="sm:hidden space-y-2">
            {filteredScores.map((r) => (
              <Link
                key={r.address}
                href={`/explorer?address=${r.address}`}
                className="block rounded-xl border p-3 space-y-2"
                style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="font-mono-num text-xs font-semibold px-2 py-0.5 rounded"
                      style={{ background: "var(--brand-mint-tint)", color: "var(--mint)" }}
                    >
                      #{r.rank}
                    </span>
                    {r.avatarUrl && (
                      <Image
                        src={r.avatarUrl}
                        alt=""
                        width={22}
                        height={22}
                        className="h-5 w-5 rounded-full object-cover shrink-0"
                      />
                    )}
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">
                        {r.xHandle ? `@${r.xHandle}` : r.username || shortAddr(r.address)}
                      </div>
                      <div className="font-mono-num text-[10px]" style={{ color: "var(--text-dim)" }}>
                        {shortAddr(r.address)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono-num text-sm font-semibold" style={{ color: "var(--mint)" }}>
                      {r.tradingScore.toFixed(2)} pts
                    </div>
                    <div className="font-mono-num text-[10px]" style={{ color: "var(--text-dim)" }}>
                      {r.tickets} tickets
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] font-mono-num" style={{ color: "var(--text-mute)" }}>
                  <span>Vol {fmtCompactUsd(r.windowVolumeUsd)}</span>
                  <span style={{ color: r.realizedPnlUsd >= 0 ? "var(--up)" : "var(--down)" }}>
                    PnL {fmtCompactUsd(r.realizedPnlUsd, true)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                  <th className="py-2.5 pr-3 font-medium">Rank</th>
                  <th className="py-2.5 px-2 font-medium">Holder</th>
                  <th className="py-2.5 px-2 font-medium">Address</th>
                  <th className="py-2.5 px-2 font-medium text-right">Score</th>
                  <th className="py-2.5 px-2 font-medium text-right">Tickets</th>
                  <th className="py-2.5 px-2 font-medium text-right">Window Vol</th>
                  <th className="py-2.5 px-2 font-medium text-right">OI TWAP</th>
                  <th className="py-2.5 px-2 font-medium text-right">Realized PnL</th>
                  <th className="py-2.5 pl-2 font-medium text-right">Explorer</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                {filteredScores.map((r) => (
                  <tr key={r.address} className="hover:bg-[var(--bg-hover)]">
                    <td className="py-2.5 pr-3 font-mono-num font-semibold" style={{ color: "var(--mint)" }}>
                      #{r.rank}
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="flex items-center gap-2">
                        {r.avatarUrl ? (
                          <Image src={r.avatarUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                        ) : null}
                        <span className="font-medium">
                          {r.xHandle ? `@${r.xHandle}` : r.username || shortAddr(r.address)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-2 font-mono-num" style={{ color: "var(--text-mute)" }}>
                      {shortAddr(r.address, 8, 6)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num font-semibold" style={{ color: "var(--mint-bright)" }}>
                      {r.tradingScore.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {r.tickets.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {fmtCompactUsd(r.windowVolumeUsd)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono-num">
                      {fmtCompactUsd(r.oiTwapUsd)}
                    </td>
                    <td
                      className="py-2.5 px-2 text-right font-mono-num"
                      style={{ color: r.realizedPnlUsd >= 0 ? "var(--up)" : "var(--down)" }}
                    >
                      {fmtCompactUsd(r.realizedPnlUsd, true)}
                    </td>
                    <td className="py-2.5 pl-2 text-right">
                      <Link
                        href={`/explorer?address=${r.address}`}
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
        </div>
      )}

      {/* TAB 2: Top Fee Tier Holders (Tier 1 - Tier 6 by 14d Volume) */}
      {subTab === "tiers" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {tierDistribution.map((td) => {
              const active = tierFilter === td.tier;
              return (
                <button
                  key={td.tier}
                  type="button"
                  onClick={() => setTierFilter(active ? 0 : td.tier)}
                  className="eco-card p-3 text-left cursor-pointer"
                  style={{
                    borderColor: active ? "var(--line-mint)" : "var(--line)",
                    background: active ? "var(--brand-mint-tint)" : "var(--bg-raised)",
                  }}
                >
                  <div className="text-[11px] font-mono-num" style={{ color: "var(--mint)" }}>
                    Tier {td.tier}
                  </div>
                  <div className="font-mono-num text-xl font-semibold mt-0.5">
                    {td.count}
                  </div>
                  <div className="text-[10px]" style={{ color: "var(--text-dim)" }}>
                    holders in top 100
                  </div>
                </button>
              );
            })}
          </div>

          <div className="eco-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" style={{ color: "var(--rise-purple)" }} />
                <h2 className="text-base font-semibold">
                  Top Volume Fee-Tier Holders (14-Day Rolling Window)
                </h2>
              </div>
              {tierFilter > 0 && (
                <button
                  type="button"
                  onClick={() => setTierFilter(0)}
                  className="text-xs underline cursor-pointer"
                  style={{ color: "var(--mint)" }}
                >
                  Clear Tier {tierFilter} filter
                </button>
              )}
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-2">
              {filteredTierHolders.map((h) => (
                <Link
                  key={h.address}
                  href={`/explorer?address=${h.address}`}
                  className="block rounded-xl border p-3 space-y-1.5"
                  style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono-num text-xs font-semibold" style={{ color: "var(--mint)" }}>
                        #{h.rank}
                      </span>
                      <span className="text-xs font-semibold truncate">
                        {h.xHandle ? `@${h.xHandle}` : h.username || shortAddr(h.address)}
                      </span>
                    </div>
                    <span
                      className="text-[10px] font-mono-num px-2 py-0.5 rounded"
                      style={{
                        background: "var(--rise-purple-tint)",
                        color: "var(--rise-purple)",
                      }}
                    >
                      {h.feeTierLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono-num" style={{ color: "var(--text-mute)" }}>
                    <span>14d: {fmtCompactUsd(h.volume2wUsd)}</span>
                    <span>{h.tradeCount.toLocaleString()} trades</span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                    <th className="py-2.5 pr-3 font-medium">Rank</th>
                    <th className="py-2.5 px-2 font-medium">Trader</th>
                    <th className="py-2.5 px-2 font-medium">Address</th>
                    <th className="py-2.5 px-2 font-medium">Fee Tier</th>
                    <th className="py-2.5 px-2 font-medium text-right">14d Volume</th>
                    <th className="py-2.5 px-2 font-medium text-right">All-Time Vol</th>
                    <th className="py-2.5 px-2 font-medium text-right">Taker / Maker</th>
                    <th className="py-2.5 pl-2 font-medium text-right">Explorer</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                  {filteredTierHolders.map((h) => (
                    <tr key={h.address} className="hover:bg-[var(--bg-hover)]">
                      <td className="py-2.5 pr-3 font-mono-num font-semibold" style={{ color: "var(--mint)" }}>
                        #{h.rank}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="flex items-center gap-2">
                          {h.avatarUrl ? (
                            <Image src={h.avatarUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-full object-cover" />
                          ) : null}
                          <span className="font-medium">
                            {h.xHandle ? `@${h.xHandle}` : h.username || shortAddr(h.address)}
                          </span>
                        </div>
                      </td>
                      <td className="py-2.5 px-2 font-mono-num" style={{ color: "var(--text-mute)" }}>
                        {shortAddr(h.address, 8, 6)}
                      </td>
                      <td className="py-2.5 px-2">
                        <span
                          className="rounded px-2 py-0.5 text-[11px] font-mono-num font-medium"
                          style={{
                            background: h.feeTier >= 4 ? "var(--brand-mint-tint)" : "var(--rise-purple-tint)",
                            color: h.feeTier >= 4 ? "var(--mint-bright)" : "var(--rise-purple)",
                          }}
                        >
                          {h.feeTierLabel}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono-num font-semibold">
                        {fmtCompactUsd(h.volume2wUsd)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono-num">
                        {fmtCompactUsd(h.totalVolumeAllUsd)}
                      </td>
                      <td className="py-2.5 px-2 text-right font-mono-num" style={{ color: "var(--text-mute)" }}>
                        {h.takerBps} / {h.makerBps} bps
                      </td>
                      <td className="py-2.5 pl-2 text-right">
                        <Link
                          href={`/explorer?address=${h.address}`}
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
          </div>
        </div>
      )}

      {/* TAB 3: Authenticated RISEx Points Query (EIP-712 Login or JWT) */}
      {subTab === "private" && (
        <div className="space-y-4">
          <div className="eco-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">
                  Connect RISEx Session (Official EIP-712 Login)
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-mute)" }}>
                  Sign the gasless EIP-712 Login message to fetch your official RISEx JWT
                  (no trading permissions or allowance required) and query{" "}
                  <code>/v1/points/leaderboard</code> &amp; your points ledger.
                </p>
              </div>
              <button
                type="button"
                disabled={authLoading}
                onClick={handleWalletSignIn}
                className="shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
                style={{
                  background: "var(--brand-mint-button)",
                  color: "var(--brand-mint-button-fg)",
                  boxShadow: "var(--shadow-cta)",
                }}
              >
                {authLoading ? "Connecting…" : "Sign In with EVM Wallet"}
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                queryAuthenticatedPoints(jwtToken, connectedWallet || undefined);
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                value={jwtToken}
                onChange={(e) => setJwtToken(e.target.value)}
                placeholder="Or paste your RISEx Bearer JWT token…"
                className="flex-1 rounded-xl border px-3 py-2 text-base sm:text-xs font-mono-num bg-transparent outline-none focus:border-[var(--line-mint)]"
                style={{ borderColor: "var(--line)" }}
              />
              <button
                type="submit"
                disabled={!jwtToken.trim() || authLoading}
                className="rounded-xl border px-4 py-2 text-xs font-semibold cursor-pointer hover:border-[var(--line-mint)] disabled:opacity-40"
                style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}
              >
                Query Points API
              </button>
            </form>

            {authStatus && (
              <div className="text-xs" style={{ color: "var(--down)" }}>
                {authStatus}
              </div>
            )}
          </div>

          {myPoints && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="eco-card p-4">
                <div className="text-xs" style={{ color: "var(--text-mute)" }}>Wallet</div>
                <div className="font-mono-num text-sm font-semibold mt-1">
                  {shortAddr(String(myPoints.wallet_address || connectedWallet))}
                </div>
              </div>
              <div className="eco-card p-4">
                <div className="text-xs" style={{ color: "var(--text-mute)" }}>Total Points</div>
                <div className="font-mono-num text-2xl font-semibold mt-1" style={{ color: "var(--mint)" }}>
                  {num(myPoints.total_points as string).toLocaleString()}
                </div>
              </div>
              <div className="eco-card p-4">
                <div className="text-xs" style={{ color: "var(--text-mute)" }}>Global Rank</div>
                <div className="font-mono-num text-2xl font-semibold mt-1">
                  #{String(myPoints.rank || "—")}
                </div>
              </div>
              <div className="eco-card p-4">
                <div className="text-xs" style={{ color: "var(--text-mute)" }}>Points Tier</div>
                <div className="text-sm font-semibold mt-1" style={{ color: "var(--rise-purple)" }}>
                  {String((myPoints.tier as Record<string, unknown> | undefined)?.name || "Unassigned")}
                </div>
              </div>
            </div>
          )}

          {privateLbNote && (
            <div
              className="eco-card p-4 text-xs"
              style={{ color: "var(--text-mute)" }}
            >
              {privateLbNote}
            </div>
          )}

          {filteredPrivateLb.length > 0 && (
            <div className="eco-card p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold">
                RISEx Points Leaderboard ({filteredPrivateLb.length} matches)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                      <th className="py-2 pr-3 font-medium">Rank</th>
                      <th className="py-2 px-2 font-medium">Address / User</th>
                      <th className="py-2 px-2 font-medium text-right">Points</th>
                      <th className="py-2 pl-2 font-medium text-right">Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y font-mono-num" style={{ borderColor: "var(--line)" }}>
                    {filteredPrivateLb.map((row, idx) => {
                      const addr = String(row.wallet_address || row.address || "");
                      const pts = num(
                        (row.total_points as string | number) ??
                          (row.points as string | number)
                      );
                      return (
                        <tr key={addr || idx}>
                          <td className="py-2 pr-3" style={{ color: "var(--mint)" }}>
                            #{String(row.rank || idx + 1)}
                          </td>
                          <td className="py-2 px-2">
                            {addr ? (
                              <Link href={`/explorer?address=${addr}`} className="hover:underline">
                                {String(row.username || shortAddr(addr, 8, 6))}
                              </Link>
                            ) : (
                              String(row.username || "—")
                            )}
                          </td>
                          <td className="py-2 px-2 text-right font-semibold">
                            {pts.toLocaleString()}
                          </td>
                          <td className="py-2 pl-2 text-right">
                            {String((row.tier as Record<string, unknown> | undefined)?.name || "—")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {myHistory.length > 0 && (
            <div className="eco-card p-4 sm:p-5 space-y-3">
              <h3 className="text-sm font-semibold">My Weekly Points History</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono-num">
                  <thead>
                    <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                      <th className="py-2 pr-3">Epoch</th>
                      <th className="py-2 px-2 text-right">Epoch Rank</th>
                      <th className="py-2 px-2 text-right">Trading</th>
                      <th className="py-2 px-2 text-right">LP / Referral</th>
                      <th className="py-2 pl-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--line)" }}>
                    {myHistory.map((h, i) => {
                      const ep = (h.epoch as Record<string, unknown> | undefined) || {};
                      const led = (h.ledger as Record<string, unknown> | undefined) || {};
                      return (
                        <tr key={i}>
                          <td className="py-2 pr-3">{String(ep.epoch_id || led.points_epoch || i)}</td>
                          <td className="py-2 px-2 text-right">#{String(h.rank || "—")}</td>
                          <td className="py-2 px-2 text-right">{fmtUsd(num(led.trading_points as string), false, 2).replace("$", "")}</td>
                          <td className="py-2 px-2 text-right">
                            {(num(led.liquidity_provider_points as string) + num(led.referral_points as string)).toFixed(2)}
                          </td>
                          <td className="py-2 pl-2 text-right font-semibold" style={{ color: "var(--mint)" }}>
                            {num(led.total_points as string).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
