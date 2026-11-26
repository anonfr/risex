"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpRight, Check, Copy, Cpu, Layers, Search, ShieldCheck, Trophy } from "lucide-react";
import { fmtUsd, shortAddr } from "@/lib/format";
import { BuilderEntry, CompetitionEntry, RISE_EXPLORER_URL } from "@/lib/risex";

const MAINNET_CONTRACTS = [
  { name: "XLP Vault (XLPUSDC · ERC-4626)", address: "0xBCf7A882B6A95827B4996055a5018FdC3B95D40c" },
  { name: "RISExUniversalRouter", address: "0xaaDDE0CeA454F2bcB26F46ED54C5709B7Bb34a7E" },
  { name: "PerpsManager", address: "0x53f10fAcFC8965750494E6965F5d6dA39B41d852" },
  { name: "OrdersManager", address: "0xE03C1D5081eb2d0E6bFd62A949C5b12eFa44F2cD" },
  { name: "CollateralManager", address: "0x2C03C7d7e2974C6599b6B108879109281ef3F818" },
  { name: "FeeManager (Builder Codes)", address: "0x11541dc387b9C307043ea732127DF92b80bab52b" },
  { name: "FundingRate", address: "0x069eDF2C2A3c93b54640Ae142B9f5375fe4A207a" },
  { name: "RISExOracle", address: "0x8fC4D0Cf74cdF595254cB763d4C05D38Df0e9503" },
  { name: "RISExAuthorization", address: "0x0D919DAA3f12AE715744Eb648c00066c5DBd66f0" },
  { name: "AccountRegistry", address: "0x1238991Cac4E65902C08213e79909A9c813Eebc3" },
  { name: "SpotManager", address: "0x1F92be734731e28F52C20AB0BAA73Db7cBf521F8" },
  { name: "OperatorHub", address: "0xf665AbA90b6ac7515D50b12FCB4f350136726734" },
];

const FEE_TIERS = [
  { tier: "Tier 1", vol: "$0", taker: "3.00 bps", maker: "1.00 bps" },
  { tier: "Tier 2", vol: "$5,000,000", taker: "2.50 bps", maker: "0.75 bps" },
  { tier: "Tier 3", vol: "$25,000,000", taker: "2.10 bps", maker: "0.50 bps" },
  { tier: "Tier 4", vol: "$100,000,000", taker: "1.70 bps", maker: "0.25 bps" },
  { tier: "Tier 5", vol: "$500,000,000", taker: "1.55 bps", maker: "0.00 bps" },
  { tier: "Tier 6", vol: "$1,000,000,000", taker: "1.50 bps", maker: "0.00 bps" },
];

export function ProjectsClient({
  builders,
  competitions,
}: {
  builders: BuilderEntry[];
  competitions: CompetitionEntry[];
}) {
  const [query, setQuery] = useState("");
  const [copiedAddr, setCopiedAddr] = useState<string | null>(null);

  const filteredBuilders = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return builders;
    return builders.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.slug.toLowerCase().includes(q) ||
        String(b.builder_id).includes(q) ||
        b.fee_recipient.toLowerCase().includes(q)
    );
  }, [builders, query]);

  const copy = (val: string) => {
    navigator.clipboard?.writeText(val);
    setCopiedAddr(val);
    setTimeout(() => setCopiedAddr(null), 1500);
  };

  return (
    <div className="space-y-7 reveal">
      <div>
        <div className="text-[11px] font-mono-num uppercase tracking-wider" style={{ color: "var(--mint)" }}>
          Ecosystem, Builders &amp; Infrastructure
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight mt-1">
          RISEx Ecosystem Directory
        </h1>
        <p className="text-sm mt-1 max-w-2xl" style={{ color: "var(--text-mute)" }}>
          Permissionlessly registered builders, the XLP Yearn V3 liquidity vault, RIP
          architecture primitives, active trading competitions, and verified RISE Mainnet
          smart contracts (Chain ID 4153).
        </p>
      </div>

      {/* Core Protocol Pillars: XLP, RIP-1, RIP-2, AutoYield */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="eco-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--mint-bright)" }}>
              XLP Vault (ERC-4626)
            </span>
            <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded" style={{ background: "var(--brand-mint-tint)", color: "var(--mint)" }}>
              LIVE
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-mute)" }}>
            Yearn V3 USDC vault powering market making and liquidations across 12h epochs:
            70% Crypto MM (`xlp_mm`), 25% RWA MM (`xlp_rwa`), 5% Liquidation (`xlp_insurance`).
            Audited by yAudit.
          </p>
        </div>

        <div className="eco-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--rise-purple)" }}>
              RIP-1 · Sub-accounts
            </span>
            <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded" style={{ background: "var(--rise-purple-tint)", color: "var(--rise-purple)" }}>
              STANDARD
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-mute)" }}>
            Modular programmable trading accounts (`BaseSubAccount` + `SubAccountFactory`)
            enabling custom order hooks, automated vaults, and scoped execution delegation.
          </p>
        </div>

        <div className="eco-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--rise-purple)" }}>
              RIP-2 · Portfolio Margin
            </span>
            <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded" style={{ background: "var(--rise-purple-tint)", color: "var(--rise-purple)" }}>
              MORPHO LITE
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-mute)" }}>
            Permissionless Portfolio Margin uniting spot collateral, LSTs, and perp margin
            via Morpho Lite lending markets in a single synchronous execution environment.
          </p>
        </div>

        <div className="eco-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold" style={{ color: "var(--amber)" }}>
              AutoYield Margin
            </span>
            <span className="text-[10px] font-mono-num px-1.5 py-0.5 rounded" style={{ background: "rgba(245,182,107,0.14)", color: "var(--amber)" }}>
              COMING SOON
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--text-mute)" }}>
            Put idle collateral to work automatically in low-risk onchain DeFi yield
            strategies while staying 100% available to back live perpetual positions.
          </p>
        </div>
      </section>

      {/* Registered Builders Directory */}
      <section className="eco-card p-4 sm:p-5 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" style={{ color: "var(--mint)" }} />
            <h2 className="text-base font-semibold">
              Registered Builder Codes ({builders.length})
            </h2>
          </div>
          <div
            className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
            style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
          >
            <Search className="h-3.5 w-3.5" style={{ color: "var(--text-dim)" }} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search builder name, ID, or 0x…"
              className="bg-transparent outline-none w-56"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[440px] overflow-y-auto pr-1">
          {filteredBuilders.map((b) => (
            <div
              key={b.builder_id}
              className="rounded-xl border p-3.5 flex items-start justify-between gap-3"
              style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{b.name}</span>
                  <span
                    className="font-mono-num text-[10px] px-1.5 py-0.5 rounded"
                    style={{ background: "var(--surface-2)", color: "var(--mint)" }}
                  >
                    ID #{b.builder_id}
                  </span>
                </div>
                <div className="font-mono-num text-[11px]" style={{ color: "var(--text-dim)" }}>
                  slug: {b.slug}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-mono-num" style={{ color: "var(--text-mute)" }}>
                  <span>{shortAddr(b.fee_recipient)}</span>
                  <button
                    type="button"
                    onClick={() => copy(b.fee_recipient)}
                    className="hover:text-[var(--mint)] cursor-pointer"
                    title="Copy fee recipient"
                  >
                    {copiedAddr === b.fee_recipient ? (
                      <Check className="h-3 w-3" style={{ color: "var(--mint)" }} />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </button>
                  <a
                    href={`${RISE_EXPLORER_URL}/address/${b.fee_recipient}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--mint)]"
                  >
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <span
                className="shrink-0 text-[10px] font-mono-num px-2 py-0.5 rounded-full"
                style={{
                  background: b.is_active ? "var(--brand-mint-tint)" : "var(--surface-2)",
                  color: b.is_active ? "var(--mint)" : "var(--text-dim)",
                }}
              >
                {b.is_active ? "Active" : "Inactive"}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Fee Schedule + Competitions */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-5 eco-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Cpu className="h-4 w-4" style={{ color: "var(--mint)" }} />
            <h2 className="text-base font-semibold">14-Day Rolling Fee Schedule</h2>
          </div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b" style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}>
                <th className="py-2 font-medium">Tier</th>
                <th className="py-2 font-medium">14d Volume</th>
                <th className="py-2 font-medium text-right">Taker</th>
                <th className="py-2 font-medium text-right">Maker</th>
              </tr>
            </thead>
            <tbody className="divide-y font-mono-num" style={{ borderColor: "var(--line)" }}>
              {FEE_TIERS.map((f) => (
                <tr key={f.tier}>
                  <td className="py-2 font-semibold">{f.tier}</td>
                  <td className="py-2">{f.vol}</td>
                  <td className="py-2 text-right">{f.taker}</td>
                  <td className="py-2 text-right" style={{ color: "var(--mint)" }}>
                    {f.maker}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="lg:col-span-7 eco-card p-4 sm:p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4" style={{ color: "var(--amber)" }} />
            <h2 className="text-base font-semibold">
              Trading Competitions ({competitions.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[280px] overflow-y-auto pr-1">
            {competitions.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border p-3 flex items-center justify-between gap-2"
                style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">{c.name}</div>
                  <div className="text-[11px] font-mono-num mt-0.5" style={{ color: "var(--text-dim)" }}>
                    {c.participant_count.toLocaleString()} participants
                    {Number(c.prize_pool) > 0
                      ? ` · ${fmtUsd(Number(c.prize_pool), false, 0)} pool`
                      : ""}
                  </div>
                </div>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-mono-num uppercase"
                  style={{
                    background:
                      c.state === "live" ? "var(--brand-mint-tint)" : "var(--surface-2)",
                    color: c.state === "live" ? "var(--mint-bright)" : "var(--text-dim)",
                  }}
                >
                  {c.state}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mainnet Contract Registry */}
      <section className="eco-card p-4 sm:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" style={{ color: "var(--mint)" }} />
          <h2 className="text-base font-semibold">
            Verified RISE Mainnet Contracts (Chain ID 4153)
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {MAINNET_CONTRACTS.map((c) => (
            <div
              key={c.address}
              className="rounded-xl border p-3 flex items-center justify-between gap-2"
              style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
            >
              <div className="min-w-0">
                <div className="text-xs font-semibold truncate">{c.name}</div>
                <div className="font-mono-num text-[11px] mt-0.5" style={{ color: "var(--text-mute)" }}>
                  {shortAddr(c.address, 8, 6)}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => copy(c.address)}
                  className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
                  title="Copy contract address"
                >
                  {copiedAddr === c.address ? (
                    <Check className="h-3.5 w-3.5" style={{ color: "var(--mint)" }} />
                  ) : (
                    <Copy className="h-3.5 w-3.5" style={{ color: "var(--text-dim)" }} />
                  )}
                </button>
                <a
                  href={`${RISE_EXPLORER_URL}/address/${c.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 hover:bg-[var(--surface-2)]"
                  style={{ color: "var(--mint)" }}
                >
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
