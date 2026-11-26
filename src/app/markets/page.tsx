import { Suspense } from "react";
import { MarketsClient } from "@/components/MarketsClient";
import { fromWei18, num } from "@/lib/format";
import { LeaderboardEntry, normalizeMarkets, RawMarket, riseFetch } from "@/lib/risex";

export const dynamic = "force-dynamic";

async function loadMarketsData() {
  const [marketsRes, lbRes] = await Promise.allSettled([
    riseFetch<{ data: { markets: RawMarket[] } }>("/v1/markets", 10),
    riseFetch<{ data: { entries?: Array<Record<string, unknown>> } }>(
      "/v1/leaderboard/combined?timeframe=LEADERBOARD_TIME_FRAME_ALL&limit=50",
      30
    ),
  ]);

  const markets = normalizeMarkets(
    marketsRes.status === "fulfilled" ? marketsRes.value.data?.markets || [] : []
  );

  const initialLeaderboard: LeaderboardEntry[] = (
    lbRes.status === "fulfilled" ? lbRes.value.data?.entries || [] : []
  ).map((e, i) => {
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

  return { markets, initialLeaderboard };
}

export default async function MarketsPage() {
  const { markets, initialLeaderboard } = await loadMarketsData();
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm">Loading markets…</div>}>
      <MarketsClient markets={markets} initialLeaderboard={initialLeaderboard} />
    </Suspense>
  );
}
