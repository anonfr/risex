import { NextRequest, NextResponse } from "next/server";
import { fromWei18, nsToMs, num } from "@/lib/format";
import { normalizeMarkets, RawMarket, riseFetch } from "@/lib/risex";

const CHART_PERIODS = new Set(["1D", "1W", "1M", "3M", "1Y", "ALL"]);
const STATS_PERIOD_MAP: Record<string, string> = {
  "1D": "7d",
  "1W": "7d",
  "1M": "30d",
  "3M": "3m",
  "1Y": "1y",
  ALL: "all",
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ address: string }> }
) {
  const { address } = await context.params;
  const rawQuery = address.trim();
  const rawPeriod = (req.nextUrl.searchParams.get("period") || "ALL").toUpperCase();
  const chartPeriod = CHART_PERIODS.has(rawPeriod) ? rawPeriod : "ALL";
  const statsPeriod = STATS_PERIOD_MAP[chartPeriod] || "all";

  let resolvedAddress = rawQuery;
  let traderProfile: Record<string, unknown> | null = null;

  if (!/^0x[a-fA-F0-9]{40}$/.test(rawQuery)) {
    try {
      const prof = await riseFetch<{ data: Record<string, unknown> }>(
        `/v1/traders/${encodeURIComponent(rawQuery)}`,
        30
      );
      if (prof.data?.address) {
        resolvedAddress = String(prof.data.address);
        traderProfile = prof.data;
      }
    } catch {
      return NextResponse.json(
        { error: "Enter a valid 0x wallet address or registered RISEx username." },
        { status: 400 }
      );
    }
  }

  if (!/^0x[a-fA-F0-9]{40}$/.test(resolvedAddress)) {
    return NextResponse.json(
      { error: "Invalid wallet address format (expected 0x followed by 40 hex chars)." },
      { status: 400 }
    );
  }

  try {
    const [
      marketsRes,
      crossBalRes,
      headerRes,
      statsRes,
      pnlChartRes,
      equityChartRes,
      volChartRes,
      calendarRes,
      positionsRes,
      tradesRes,
      openOrdersRes,
      fundingRes,
      userTradingRes,
    ] = await Promise.allSettled([
      riseFetch<{ data: { markets: RawMarket[] } }>("/v1/markets", 15),
      riseFetch<{ data: { balance: string } }>(
        `/v1/account/cross-margin-balance?account=${resolvedAddress}`,
        0
      ),
      riseFetch<{ data: Record<string, unknown> }>(
        `/v1/portfolio/header?account=${resolvedAddress}`,
        15
      ),
      riseFetch<{
        data: {
          performance?: Record<string, string>;
          analytics?: Record<string, string>;
        };
      }>(`/v1/portfolio/stats?account=${resolvedAddress}&period=${statsPeriod}`, 15),
      riseFetch<{ data: { data?: Array<{ timestamp: string; value: string }> } }>(
        `/v1/portfolio/chart?account=${resolvedAddress}&period=${chartPeriod}`,
        15
      ),
      riseFetch<{ data: { data?: Array<{ timestamp: string; value: string }> } }>(
        `/v1/portfolio/equity-chart?account=${resolvedAddress}&period=${chartPeriod}`,
        15
      ),
      riseFetch<{ data: { data?: Array<{ timestamp: string; volume: string }> } }>(
        `/v1/portfolio/volume-chart?account=${resolvedAddress}&period=${chartPeriod}`,
        15
      ),
      riseFetch<{ data: { days?: Array<{ date: string; pnl: string }> } }>(
        `/v1/portfolio/pnl-calendar?account=${resolvedAddress}&period=all-time`,
        30
      ),
      riseFetch<{ data: { positions?: Array<Record<string, unknown>> } }>(
        `/v1/positions?account=${resolvedAddress}`,
        0
      ),
      riseFetch<{ data: { trades?: Array<Record<string, unknown>> } }>(
        `/v1/trade-history?account=${resolvedAddress}&limit=60`,
        0
      ),
      riseFetch<{ data: { orders?: Array<Record<string, unknown>> } }>(
        `/v1/orders/open?account=${resolvedAddress}`,
        0
      ),
      riseFetch<{ data: { records?: Array<Record<string, unknown>> } }>(
        `/v1/account/funding-payments?account=${resolvedAddress}&limit=60`,
        15
      ),
      riseFetch<{ data: Record<string, unknown> }>(
        `/v1/stats/user-trading?address=${resolvedAddress}`,
        15
      ),
    ]);

    const markets = normalizeMarkets(
      marketsRes.status === "fulfilled" ? marketsRes.value.data?.markets || [] : []
    );
    const marketById = new Map(markets.map((m) => [m.id, m]));

    const crossMarginBalanceUsd =
      crossBalRes.status === "fulfilled" ? num(crossBalRes.value.data?.balance) : 0;

    const rawPositions =
      positionsRes.status === "fulfilled" ? positionsRes.value.data?.positions || [] : [];

    const positions = rawPositions
      .map((p) => {
        const marketId = String(p.market_id || "");
        const m = marketById.get(marketId);
        const signedSize = fromWei18(p.size as string);
        const absSize = Math.abs(signedSize);
        if (absSize === 0) return null;
        const entryPrice = fromWei18(p.avg_entry_price as string);
        const leverage = fromWei18(p.leverage as string) || 1;
        const markPrice = m?.markPrice || entryPrice;
        const notionalUsd = absSize * markPrice;
        const marginUsedUsd = leverage > 0 ? notionalUsd / leverage : notionalUsd;
        const unrealizedPnlUsd = (markPrice - entryPrice) * signedSize;
        const roePct = marginUsedUsd > 0 ? (unrealizedPnlUsd / marginUsedUsd) * 100 : 0;
        const isolatedBalanceUsd = fromWei18(p.isolated_usdc_balance as string);
        const unsettledFundingUsd = fromWei18(p.unsettled_funding as string);
        return {
          marketId,
          symbol: m?.symbol || `MKT-${marketId}`,
          pair: m?.pair || `MKT-${marketId}`,
          side: signedSize >= 0 ? ("LONG" as const) : ("SHORT" as const),
          marginMode: Number(p.margin_mode) === 1 ? ("Isolated" as const) : ("Cross" as const),
          size: absSize,
          signedSize,
          notionalUsd,
          entryPrice,
          markPrice,
          leverage,
          marginUsedUsd,
          isolatedBalanceUsd,
          unrealizedPnlUsd,
          roePct,
          unsettledFundingUsd,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null)
      .sort((a, b) => b.notionalUsd - a.notionalUsd);

    const totalUnrealizedPnl = positions.reduce((s, p) => s + p.unrealizedPnlUsd, 0);
    const totalPositionNotional = positions.reduce((s, p) => s + p.notionalUsd, 0);
    const totalMarginUsed = positions.reduce((s, p) => s + p.marginUsedUsd, 0);
    const isolatedCollateral = positions.reduce((s, p) => s + p.isolatedBalanceUsd, 0);

    const equityChart =
      equityChartRes.status === "fulfilled"
        ? (equityChartRes.value.data?.data || []).map((pt) => ({
            timeMs: nsToMs(pt.timestamp),
            value: num(pt.value),
          }))
        : [];

    const pnlChart =
      pnlChartRes.status === "fulfilled"
        ? (pnlChartRes.value.data?.data || []).map((pt) => ({
            timeMs: nsToMs(pt.timestamp),
            value: num(pt.value),
          }))
        : [];

    const volumeChart =
      volChartRes.status === "fulfilled"
        ? (volChartRes.value.data?.data || []).map((pt) => ({
            timeMs: nsToMs(pt.timestamp),
            value: num(pt.volume),
          }))
        : [];

    const pnlCalendar =
      calendarRes.status === "fulfilled"
        ? (calendarRes.value.data?.days || []).map((d) => ({
            timeMs: nsToMs(d.date),
            pnl: num(d.pnl),
          }))
        : [];

    const latestEquityFromChart =
      equityChart.length > 0 ? equityChart[equityChart.length - 1].value : 0;
    const accountValueUsd =
      latestEquityFromChart > 0
        ? latestEquityFromChart
        : crossMarginBalanceUsd + isolatedCollateral + totalUnrealizedPnl;

    const headerData = headerRes.status === "fulfilled" ? headerRes.value.data : null;
    const statsData = statsRes.status === "fulfilled" ? statsRes.value.data : null;
    const userTrading =
      userTradingRes.status === "fulfilled" ? userTradingRes.value.data : null;

    const trades =
      tradesRes.status === "fulfilled"
        ? (tradesRes.value.data?.trades || []).map((t) => {
            const m = marketById.get(String(t.market_id || ""));
            const bc = (t.blockchain_data as Record<string, unknown> | undefined) || {};
            return {
              id: String(t.id || ""),
              marketId: String(t.market_id || ""),
              symbol: m?.symbol || `MKT-${t.market_id}`,
              side: String(t.side || ""),
              positionSide: String(t.position_side || ""),
              price: num(t.price as string),
              size: num(t.size as string),
              fee: num(t.fee as string),
              liquidity: String(t.liquidity_indicator || ""),
              realizedPnl: num(t.realized_pnl as string),
              realizedPnlPct: num(t.realized_pnl_percentage as string),
              leverage: num(t.leverage as string),
              isLiquidation: Boolean(t.is_liquidation),
              timeMs: nsToMs(t.time as string),
              txHash: bc.tx_hash ? String(bc.tx_hash) : null,
            };
          })
        : [];

    const openOrders =
      openOrdersRes.status === "fulfilled"
        ? (openOrdersRes.value.data?.orders || []).map((o) => {
            const m = marketById.get(String(o.market_id || ""));
            return {
              orderId: String(o.order_id || o.id || ""),
              marketId: String(o.market_id || ""),
              symbol: m?.symbol || `MKT-${o.market_id}`,
              side: String(o.side || ""),
              price: num(o.price as string),
              size: num(o.size as string),
              filledSize: num(o.filled_size as string),
              orderType: String(o.order_type || "LIMIT"),
              timeMs: nsToMs(o.created_at as string),
            };
          })
        : [];

    const fundingPayments =
      fundingRes.status === "fulfilled"
        ? (fundingRes.value.data?.records || []).map((r) => {
            const m = marketById.get(String(r.market_id || ""));
            return {
              marketId: String(r.market_id || ""),
              symbol: m?.symbol || `MKT-${r.market_id}`,
              paymentUsd: num(r.funding_payment as string),
              positionSize: num(r.position_size as string),
              side: String(r.side || ""),
              fundingRatePct: num(r.funding_rate as string) * 100,
              isSettled: Boolean(r.is_settled),
              timeMs: nsToMs(r.block_time as string),
            };
          })
        : [];

    const totalAllTimePnl = pnlCalendar.reduce((s, d) => s + d.pnl, 0);

    return NextResponse.json({
      address: resolvedAddress,
      traderProfile,
      overview: {
        accountValueUsd,
        crossMarginBalanceUsd,
        totalUnrealizedPnl,
        totalAllTimePnl,
        totalPositionNotional,
        totalMarginUsed,
        marginUsagePct:
          accountValueUsd > 0 ? Math.min(100, (totalMarginUsed / accountValueUsd) * 100) : 0,
        longCount: positions.filter((p) => p.side === "LONG").length,
        shortCount: positions.filter((p) => p.side === "SHORT").length,
        longPnl: positions
          .filter((p) => p.side === "LONG")
          .reduce((s, p) => s + p.unrealizedPnlUsd, 0),
        shortPnl: positions
          .filter((p) => p.side === "SHORT")
          .reduce((s, p) => s + p.unrealizedPnlUsd, 0),
      },
      header: headerData,
      stats: {
        winRatePct: num(statsData?.performance?.win_rate) * 100,
        maxDrawdownPct: num(statsData?.performance?.max_drawdown) * 100,
        sharpeRatio: num(statsData?.performance?.sharpe_ratio),
        profitFactor: num(statsData?.performance?.profit_factor),
        longestWinStreak: num(statsData?.analytics?.longest_win_streak),
        avgTradeDurationSec: num(statsData?.analytics?.avg_trade_duration_seconds),
        medianTradeDurationSec: num(statsData?.analytics?.median_trade_duration_seconds),
      },
      tradingTotals: userTrading
        ? {
            tradedVolumeUsd: num(userTrading.traded_volume as string),
            liquidationVolumeUsd: num(userTrading.liquidation_volume as string),
            totalVolumeUsd: num(userTrading.total_volume as string),
            totalFeeUsd: num(userTrading.total_fee as string),
            makerFeeUsd: num(userTrading.maker_fee as string),
            takerFeeUsd: num(userTrading.taker_fee as string),
            tradeCount: num(userTrading.trade_count as number),
            lastTradeMs: nsToMs(userTrading.last_trade_at as string),
          }
        : null,
      charts: {
        equityChart,
        pnlChart,
        volumeChart,
        pnlCalendar,
      },
      positions,
      trades,
      openOrders,
      fundingPayments,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch wallet details" },
      { status: 500 }
    );
  }
}
