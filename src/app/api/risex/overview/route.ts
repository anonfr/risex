import { NextResponse } from "next/server";
import { fromWei18, num } from "@/lib/format";
import {
  BuilderEntry,
  CompetitionEntry,
  LeaderboardEntry,
  normalizeMarkets,
  RawMarket,
  riseFetch,
} from "@/lib/risex";

export async function GET() {
  try {
    const [
      marketsRes,
      buildersRes,
      competitionsRes,
      leaderboardRes,
      volLeadersRes,
      pointsRes,
      configRes,
    ] = await Promise.allSettled([
      riseFetch<{ data: { markets: RawMarket[] } }>("/v1/markets", 10),
      riseFetch<{ data: { builders: BuilderEntry[] } }>("/v1/builders", 60),
      riseFetch<{ data: { competitions: CompetitionEntry[] } }>("/v1/competitions", 60),
      riseFetch<{ data: { entries: Array<Record<string, unknown>> } }>(
        "/v1/leaderboard/combined?timeframe=LEADERBOARD_TIME_FRAME_ALL&limit=50",
        30
      ),
      riseFetch<{ data: { entries: Array<Record<string, unknown>> } }>(
        "/v1/stats/user-volume/leaderboard?window=24h&limit=20",
        30
      ),
      riseFetch<{
        data: {
          epoch: {
            epoch_id: string;
            description: string;
            starts_at: string;
            ends_at: string;
            distribution_at: string;
          };
          seconds_until_distribution: string;
        };
      }>("/v1/points/epoch/current", 30),
      riseFetch<{ data: Record<string, unknown> }>("/v1/system/config", 120),
    ]);

    const rawMarkets =
      marketsRes.status === "fulfilled" ? marketsRes.value.data?.markets || [] : [];
    const markets = normalizeMarkets(rawMarkets);

    const builders =
      buildersRes.status === "fulfilled" ? buildersRes.value.data?.builders || [] : [];
    const competitions =
      competitionsRes.status === "fulfilled"
        ? competitionsRes.value.data?.competitions || []
        : [];

    const rawLb =
      leaderboardRes.status === "fulfilled"
        ? leaderboardRes.value.data?.entries || []
        : [];
    const leaderboard: LeaderboardEntry[] = rawLb.map((e, i) => {
      const x = (e.x_account as Record<string, unknown> | undefined) || undefined;
      return {
        rank: num(e.rank as string) || i + 1,
        address: String(e.address || ""),
        accountValueUsd: fromWei18(e.account_value as string),
        notionalPnlUsd: fromWei18(e.notional_pnl as string),
        roiPct: num(e.roi_percent as string),
        winRatePct: num(e.win_rate as string),
        trades: num(e.trades as string),
        notionalVolumeUsd: num(e.notional_volume as string),
        referralVolumeUsd: num(e.referral_volume as string),
        combinedVolumeUsd: num(e.combined_volume as string),
        username: String(e.username || e.display_name || ""),
        xHandle: x?.username ? String(x.username) : null,
        avatarUrl:
          (e.profile_image_url ? String(e.profile_image_url) : null) ||
          (x?.profile_image_url ? String(x.profile_image_url) : null),
      };
    });

    const rawVolLb =
      volLeadersRes.status === "fulfilled"
        ? volLeadersRes.value.data?.entries || []
        : [];
    const volume24hLeaders = rawVolLb.map((e, i) => ({
      rank: num(e.rank as number) || i + 1,
      address: String(e.address || ""),
      tradedVolumeUsd: num(e.traded_volume as string),
      liquidationVolumeUsd: num(e.liquidation_volume as string),
      totalVolumeUsd: num(e.total_volume as string),
      totalFeeUsd: num(e.total_fee as string),
      tradeCount: num(e.trade_count as number),
    }));

    const totalVolume24hUsd = markets.reduce((s, m) => s + m.volume24hUsd, 0);
    const totalOpenInterestUsd = markets.reduce((s, m) => s + m.openInterestUsd, 0);
    const avgFundingAprPct =
      markets.length > 0
        ? markets.reduce((s, m) => s + m.fundingAprPct, 0) / markets.length
        : 0;

    const sectorMap = new Map<
      string,
      { sector: string; count: number; volume24hUsd: number; openInterestUsd: number }
    >();
    for (const m of markets) {
      const prev = sectorMap.get(m.sector) || {
        sector: m.sector,
        count: 0,
        volume24hUsd: 0,
        openInterestUsd: 0,
      };
      prev.count += 1;
      prev.volume24hUsd += m.volume24hUsd;
      prev.openInterestUsd += m.openInterestUsd;
      sectorMap.set(m.sector, prev);
    }

    const pointsEpoch =
      pointsRes.status === "fulfilled" && pointsRes.value.data?.epoch
        ? {
            epochId: pointsRes.value.data.epoch.epoch_id,
            description: pointsRes.value.data.epoch.description,
            startsAt: num(pointsRes.value.data.epoch.starts_at),
            endsAt: num(pointsRes.value.data.epoch.ends_at),
            distributionAt: num(pointsRes.value.data.epoch.distribution_at),
            secondsUntilDistribution: num(pointsRes.value.data.seconds_until_distribution),
          }
        : null;

    const systemConfig =
      configRes.status === "fulfilled" ? configRes.value.data : null;

    return NextResponse.json({
      fetchedAt: Date.now(),
      summary: {
        totalVolume24hUsd,
        totalOpenInterestUsd,
        activeMarketCount: markets.length,
        avgFundingAprPct,
        totalBuilders: builders.length,
        activeBuilders: builders.filter((b) => b.is_active).length,
        liveCompetitions: competitions.filter((c) => c.state === "live").length,
        sectorBreakdown: Array.from(sectorMap.values()),
      },
      markets,
      leaderboard,
      volume24hLeaders,
      builders,
      competitions,
      pointsEpoch,
      systemConfig,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load RISEx overview" },
      { status: 500 }
    );
  }
}
