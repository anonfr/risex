import { num } from "./format";

export const RISEX_API_BASE = "https://api.rise.trade";
export const RISEX_WS_URL = "wss://ws.rise.trade/ws";
export const RISE_EXPLORER_URL = "https://explorer.risechain.com";
export const RISEX_APP_URL = "https://rise.trade";
export const RISEX_DOCS_URL = "https://docs.risechain.com/docs/risex";

export interface RawMarket {
  market_id: string;
  config?: {
    name?: string;
    quote?: string;
    step_size?: string;
    step_price?: string;
    maintenance_margin_factor?: string;
    max_leverage?: string;
    min_order_size?: string;
    unlocked?: boolean;
    open_interest_limit?: string;
    match_price_band?: string;
  };
  base_asset_symbol?: string;
  quote_asset_symbol?: string;
  underlying?: string;
  display_name: string;
  custom_display_name?: string;
  quote_volume_24h?: string;
  change_24h?: string;
  high_24h?: string;
  low_24h?: string;
  last_price?: string;
  mark_price?: string;
  index_price?: string;
  open_interest?: string;
  funding_interval?: string;
  next_funding_time?: string;
  post_only?: boolean;
  accumulated_funding?: string;
  current_funding_rate?: string;
  funding_rate_8h?: string;
  active?: boolean;
  category?: string;
  search_tags?: string[];
  is_new?: boolean;
  reduce_only?: boolean;
  boost_pct?: number;
}

export type MarketSector = "Crypto" | "Equities & ETFs" | "Commodities";

export interface NormalizedMarket {
  id: string;
  symbol: string;
  pair: string;
  label: string;
  sector: MarketSector;
  tags: string[];
  lastPrice: number;
  markPrice: number;
  indexPrice: number;
  change24h: number;
  change24hPct: number;
  high24h: number;
  low24h: number;
  volume24hUsd: number;
  openInterestBase: number;
  openInterestUsd: number;
  openInterestLimitBase: number;
  oiUtilizationPct: number;
  funding1hPct: number;
  funding8hPct: number;
  fundingAprPct: number;
  accumulatedFunding: number;
  maxLeverage: number;
  stepSize: string;
  stepPrice: string;
  minOrderSize: string;
  matchPriceBand: string;
  isNew: boolean;
  postOnly: boolean;
  reduceOnly: boolean;
  boostPct: number;
}

export interface BuilderEntry {
  builder_id: number;
  slug: string;
  name: string;
  fee_recipient: string;
  is_active: boolean;
}

export interface CompetitionEntry {
  id: string;
  slug: string;
  name: string;
  description: string;
  start_time: string;
  end_time: string;
  prize_pool: string;
  state: string;
  participant_count: number;
}

export interface LeaderboardEntry {
  rank: number;
  address: string;
  accountValueUsd: number;
  notionalPnlUsd: number;
  roiPct: number;
  winRatePct: number;
  trades: number;
  notionalVolumeUsd: number;
  referralVolumeUsd: number;
  combinedVolumeUsd: number;
  username: string;
  xHandle: string | null;
  avatarUrl: string | null;
}

export interface PointsEpoch {
  epochId: string;
  description: string;
  startsAt: number;
  endsAt: number;
  distributionAt: number;
  secondsUntilDistribution: number;
}

export interface SystemConfig {
  chain: {
    name: string;
    chain_id: string;
    block_time: string;
  };
  addresses: Record<string, string>;
  market_warning?: {
    market_id?: string;
    message?: string;
  };
}

const COMMODITY_TICKERS = new Set(["XAU", "XAG", "CL", "BZ"]);
const EQUITY_TICKERS = new Set([
  "NVDA", "SPY", "QQQ", "GOOGL", "TSLA", "AAPL", "AMZN", "META", "MSFT", "AMD",
  "MU", "INTC", "MSTR", "CRCL", "HOOD", "SKHYNIX", "SNDK", "DRAM", "SPCX",
  "KORU", "SOXL", "CRWV", "EWZ", "LLY", "QCOM", "ARM", "TTWO", "HIMS", "ANT", "NBIS",
]);

export function classifySector(m: RawMarket): MarketSector {
  const sym = (m.display_name || "").split("/")[0].toUpperCase();
  const cat = (m.category || "").toLowerCase();
  const tags = (m.search_tags || []).map((t) => t.toLowerCase());
  if (COMMODITY_TICKERS.has(sym) || cat.includes("commodit") || tags.includes("commodities")) {
    return "Commodities";
  }
  if (
    EQUITY_TICKERS.has(sym) ||
    cat.includes("equit") ||
    cat.includes("stock") ||
    cat.includes("rwa") ||
    tags.includes("stocks") ||
    tags.includes("equities") ||
    tags.includes("rwa")
  ) {
    return "Equities & ETFs";
  }
  return "Crypto";
}

export function normalizeMarkets(raw: RawMarket[]): NormalizedMarket[] {
  return raw
    .filter(
      (m) =>
        m.active !== false &&
        !m.display_name?.toLowerCase().includes("deprecated") &&
        (num(m.last_price) > 0 || num(m.mark_price) > 0)
    )
    .map((m) => {
      const lastPrice = num(m.last_price) || num(m.mark_price);
      const markPrice = num(m.mark_price) || lastPrice;
      const indexPrice = num(m.index_price) || markPrice;
      const change24h = num(m.change_24h);
      const prevPrice = lastPrice - change24h;
      const change24hPct = prevPrice > 0 ? (change24h / prevPrice) * 100 : 0;
      const volume24hUsd = num(m.quote_volume_24h);
      const openInterestBase = num(m.open_interest);
      const openInterestUsd = openInterestBase * markPrice;
      const openInterestLimitBase = num(m.config?.open_interest_limit);
      const oiUtilizationPct =
        openInterestLimitBase > 0 ? Math.min(100, (openInterestBase / openInterestLimitBase) * 100) : 0;
      const funding1hPct = num(m.current_funding_rate) * 100;
      const funding8hPct = num(m.funding_rate_8h) * 100 || funding1hPct * 8;
      const fundingAprPct = funding1hPct * 24 * 365;
      const symbol = (m.display_name || "").split("/")[0] || m.market_id;

      return {
        id: m.market_id,
        symbol,
        pair: m.display_name || symbol,
        label: m.custom_display_name || symbol,
        sector: classifySector(m),
        tags: m.search_tags || [],
        lastPrice,
        markPrice,
        indexPrice,
        change24h,
        change24hPct,
        high24h: num(m.high_24h) || lastPrice,
        low24h: num(m.low_24h) || lastPrice,
        volume24hUsd,
        openInterestBase,
        openInterestUsd,
        openInterestLimitBase,
        oiUtilizationPct,
        funding1hPct,
        funding8hPct,
        fundingAprPct,
        accumulatedFunding: num(m.accumulated_funding),
        maxLeverage: num(m.config?.max_leverage) || 10,
        stepSize: m.config?.step_size || "0.001",
        stepPrice: m.config?.step_price || "0.01",
        minOrderSize: m.config?.min_order_size || "0",
        matchPriceBand: m.config?.match_price_band || "0.02",
        isNew: Boolean(m.is_new),
        postOnly: Boolean(m.post_only),
        reduceOnly: Boolean(m.reduce_only),
        boostPct: m.boost_pct || 0,
      };
    })
    .sort((a, b) => b.volume24hUsd - a.volume24hUsd);
}

export async function riseFetch<T>(path: string, revalidate = 15): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const res = await fetch(`${RISEX_API_BASE}${path}`, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; risex.eco/1.0)",
        Accept: "application/json",
      },
      signal: controller.signal,
      next: revalidate > 0 ? { revalidate } : undefined,
      cache: revalidate === 0 ? "no-store" : undefined,
    });
    if (!res.ok) {
      throw new Error(`RISEx API ${path} returned ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
