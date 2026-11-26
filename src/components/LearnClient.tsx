"use client";

import React, { useMemo, useState } from "react";
import { ArrowUpRight, BookOpen, Code2, Search } from "lucide-react";

interface LearnArticle {
  id: string;
  category: "Architecture" | "Yield & Vaults" | "Trading" | "Points & Builders" | "API & SDK";
  title: string;
  summary: string;
  bullets: string[];
  code?: string;
  docPath: string;
}

const ARTICLES: LearnArticle[] = [
  {
    id: "unified-exchange",
    category: "Architecture",
    title: "How RISEx puts the orderbook fully onchain (~1ms)",
    summary:
      "Unlike offchain matching or dual-core venues, RISEx runs its Clearinghouse, Orderbook, and Oracle directly inside RISE Chain's single execution environment.",
    bullets: [
      "Orderbook state updates every ~1ms with ~3ms end-to-end order latency on RISE Mainnet (Chain ID 4153).",
      "Oracle prices are pushed every 500ms via RISExOracle and Stork feeds.",
      "Synchronous composability: AMMs, lending markets, and perps share state in the exact same block and transaction.",
      "Secured by Ethereum L1 settlement guarantees.",
    ],
    docPath: "https://docs.risechain.com/docs/risex/about/Architecture",
  },
  {
    id: "xlp-vault",
    category: "Yield & Vaults",
    title: "XLP Vault (XLPUSDC) — Market Making & Liquidations",
    summary:
      "A community-owned Yearn V3 ERC-4626 USDC vault that provides orderbook market making and acts as the RLP liquidation backstop.",
    bullets: [
      "Strategy split: 70% Crypto MM (xlp_mm), 25% RWA MM (xlp_rwa), 5% Liquidation Insurance (xlp_insurance).",
      "12-hour epochs for deposits/redemptions with a ~12h cooldown and 10% epoch withdrawal cap for pool stability.",
      "ERC-4626 XLPUSDC shares are standard composable tokens across RISE DeFi.",
      "Not delta-neutral: depositors earn spread + liquidation markouts and bear inventory exposure.",
    ],
    docPath: "https://docs.risechain.com/docs/risex/xlpvault/about",
  },
  {
    id: "ppm-rip2",
    category: "Architecture",
    title: "Permissionless Portfolio Margin (RIP-2) & AutoYield",
    summary:
      "Trade perpetuals using ETH, BTC, LSTs, LP positions, or yield-bearing assets as margin — powered by Morpho Lite.",
    bullets: [
      "RIP-2 unifies spot collateral and perps margin: deposit collateral and borrow USDC automatically to cover margin requirements.",
      "Curators can permissionlessly launch new Morpho Lite collateral markets for RISEx.",
      "AutoYield deploys idle trading margin into low-risk onchain yield strategies with zero lock-up.",
    ],
    docPath: "https://docs.risechain.com/docs/risex/rips/rip-2",
  },
  {
    id: "rip1-subaccounts",
    category: "Architecture",
    title: "Modular Sub-accounts (RIP-1)",
    summary:
      "An open smart-contract extension standard for programmable trading accounts — like browser extensions for perpetuals.",
    bullets: [
      "BaseSubAccount handles order placement, authorization, and deposits/withdrawals with owner/manager access control.",
      "SubAccountFactory deploys deterministic minimal proxies mapped to user addresses.",
      "Unlocks automated TWAP/grid bots, liquidation guards, and scoped strategy delegation.",
    ],
    docPath: "https://docs.risechain.com/docs/risex/rips/rip-1",
  },
  {
    id: "liquidations",
    category: "Trading",
    title: "4-Stage Liquidation Waterfall & Health Factor",
    summary:
      "RISEx continuously computes crossHealthFactor = crossMarginBalance / totalCrossMM to protect account and exchange solvency.",
    bullets: [
      "Stage 1 (Pre-liquidation): Non-reduce-only open orders are automatically cancelled; only reduce-only or margin top-ups allowed.",
      "Stage 2 (Partial liquidation): Portions of positions are reduced to restore health above maintenance margin.",
      "Stage 3 (RLP / XLP takeover): Bankrupt positions are absorbed by RISExLiquidationStrategy.",
      "Stage 4 (ADL): Auto-deleveraging backstop only if insurance reserves are exhausted.",
    ],
    docPath: "https://docs.risechain.com/docs/risex/trading/liquidations",
  },
  {
    id: "points-ignite",
    category: "Points & Builders",
    title: "Points Season 1: Ignite (200,000 pts / week)",
    summary:
      "100% of RISE points are allocated to RISEx users — traders, XLP depositors, and builder-code integrators.",
    bullets: [
      "Season 1: Ignite allocates 200,000 points every Tuesday at 14:00 UTC.",
      "Scoring factors: maker/taker volume, open interest & hold duration, fees & slippage, and higher-order activity.",
      "Referrals earn +10% bonus points share without reducing the referee's allocation, plus 4%–15% fee commission.",
    ],
    docPath: "https://docs.risechain.com/docs/risex/rewards/points",
  },
  {
    id: "builder-codes",
    category: "Points & Builders",
    title: "Builder Codes — Monetize Order Flow Permissionlessly",
    summary:
      "Register a builder_id on FeeManager (0x11541dc387b9C307043ea732127DF92b80bab52b) and earn fees on every fill routed through your UI or bot.",
    bullets: [
      "Call registerBuilderCode(feeRecipient) on FeeManager — zero approval needed.",
      "builder_fee_bps uses a 1,000,000 denominator (100 = 1 bps = 0.01% of notional).",
      "Traders approve your builder fee cap once via EIP-712 session signer.",
    ],
    docPath: "https://docs.risechain.com/docs/risex/trading/builder-codes",
  },
  {
    id: "api-quickstart",
    category: "API & SDK",
    title: "RISEx REST & WebSocket API Quickstart",
    summary:
      "Query public markets, orderbooks, portfolios, and stream real-time ticks from api.rise.trade and wss://ws.rise.trade/ws.",
    bullets: [
      "REST Base: https://api.rise.trade (Swagger at /swagger/api.swagger.json).",
      "WebSocket: wss://ws.rise.trade/ws (channels: orderbook, trades, oracle, expected_funding_rate, orders, positions).",
      "Authenticated orders use EIP-712 VerifyWitness signatures with bitmap nonces (nonceAnchor + nonceBitmap).",
    ],
    code: `import { InfoClient, WebSocketClient } from 'risex-client';

const info = new InfoClient();
const markets = await info.getMarkets();
const book = await info.getOrderbook(1); // BTC/USDC

const ws = new WebSocketClient();
await ws.connect();
ws.subscribe({ channel: 'orderbook', market_ids: [1] });`,
    docPath: "https://docs.risechain.com/docs/risex/api",
  },
];

const QUICK_PROMPTS = [
  "orderbook",
  "XLP Vault",
  "Portfolio Margin",
  "Builder Codes",
  "Points",
  "liquidation",
  "WebSocket",
];

export function LearnClient() {
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ARTICLES.filter((a) => {
      if (cat !== "All" && a.category !== cat) return false;
      if (!q) return true;
      return (
        a.title.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q) ||
        a.bullets.some((b) => b.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q)
      );
    });
  }, [query, cat]);

  return (
    <div className="space-y-6 reveal">
      <div className="space-y-2">
        <div className="text-[11px] font-mono-num uppercase tracking-wider" style={{ color: "var(--mint)" }}>
          Learn RISEx · Protocol Knowledge Base
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Understand the unified exchange
        </h1>
        <p className="text-sm max-w-2xl" style={{ color: "var(--text-mute)" }}>
          Search architecture specs, XLP Vault mechanics, RIP-1 &amp; RIP-2 standards,
          Points Season 1 rules, liquidation waterfalls, and API integration snippets.
        </p>
      </div>

      {/* Search & Quick Chips */}
      <div className="eco-card p-4 space-y-3">
        <div
          className="flex items-center gap-2.5 rounded-xl border px-3 py-2"
          style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
        >
          <Search className="h-4 w-4 shrink-0" style={{ color: "var(--mint)" }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask or search RISEx docs (e.g. XLP cooldown, builder codes, bitmap nonce)…"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-dim)]"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {["All", "Architecture", "Yield & Vaults", "Trading", "Points & Builders", "API & SDK"].map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className="rounded-lg px-2.5 py-1 text-xs font-medium cursor-pointer"
                  style={{
                    background: cat === c ? "var(--tab-bg-active)" : "var(--surface-1)",
                    color: cat === c ? "var(--mint-bright)" : "var(--text-mute)",
                    border:
                      cat === c ? "1px solid var(--line-mint)" : "1px solid var(--line)",
                  }}
                >
                  {c}
                </button>
              )
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span style={{ color: "var(--text-dim)" }}>Try:</span>
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQuery(p)}
                className="rounded-md px-2 py-0.5 border hover:border-[var(--line-mint)] cursor-pointer"
                style={{ borderColor: "var(--line)", color: "var(--text-mute)" }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Articles Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((a) => (
          <article key={a.id} className="eco-card p-5 flex flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-medium"
                  style={{
                    background: "var(--brand-mint-tint)",
                    color: "var(--mint-bright)",
                  }}
                >
                  {a.category}
                </span>
                <a
                  href={a.docPath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs hover:underline"
                  style={{ color: "var(--text-mute)" }}
                >
                  Official Docs <ArrowUpRight className="h-3 w-3" />
                </a>
              </div>

              <h2 className="font-display text-xl font-normal leading-snug">{a.title}</h2>
              <p className="text-xs leading-relaxed" style={{ color: "var(--text-mute)" }}>
                {a.summary}
              </p>

              <ul className="space-y-1.5 text-xs" style={{ color: "var(--text-soft)" }}>
                {a.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: "var(--mint)" }} />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {a.code && (
                <div
                  className="rounded-xl border p-3 font-mono-num text-[11px] overflow-x-auto"
                  style={{ borderColor: "var(--line)", background: "var(--bg-deep)" }}
                >
                  <div className="flex items-center gap-1.5 mb-1.5" style={{ color: "var(--mint)" }}>
                    <Code2 className="h-3.5 w-3.5" /> TypeScript Quickstart
                  </div>
                  <pre className="leading-relaxed">{a.code}</pre>
                </div>
              )}
            </div>

            <div className="pt-2 border-t flex items-center justify-between text-xs" style={{ borderColor: "var(--line)" }}>
              <span className="inline-flex items-center gap-1.5" style={{ color: "var(--text-dim)" }}>
                <BookOpen className="h-3.5 w-3.5" /> Verified from docs.risechain.com
              </span>
              <a
                href={a.docPath}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium hover:underline"
                style={{ color: "var(--mint-bright)" }}
              >
                Read source →
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
