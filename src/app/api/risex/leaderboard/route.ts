import { NextRequest, NextResponse } from "next/server";
import { fromWei18, num } from "@/lib/format";
import { LeaderboardEntry, riseFetch } from "@/lib/risex";

const TIMEFRAME_MAP: Record<string, string> = {
  "24H": "LEADERBOARD_TIME_FRAME_24H",
  "7D": "LEADERBOARD_TIME_FRAME_7D",
  "30D": "LEADERBOARD_TIME_FRAME_30D",
  ALL: "LEADERBOARD_TIME_FRAME_ALL",
};

const SORT_MAP: Record<string, string> = {
  PNL: "COMBINED_LEADERBOARD_SORT_BY_PNL",
  ROI: "COMBINED_LEADERBOARD_SORT_BY_ROI",
  WIN_RATE: "COMBINED_LEADERBOARD_SORT_BY_WIN_RATE",
  VOLUME: "COMBINED_LEADERBOARD_SORT_BY_COMBINED_VOLUME",
  TRADES: "COMBINED_LEADERBOARD_SORT_BY_TRADES",
};

export async function GET(req: NextRequest) {
  const tfKey = (req.nextUrl.searchParams.get("timeframe") || "ALL").toUpperCase();
  const sortKey = (req.nextUrl.searchParams.get("sort") || "PNL").toUpperCase();
  const limit = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get("limit") || 50)));
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));

  const tf = TIMEFRAME_MAP[tfKey] || TIMEFRAME_MAP.ALL;
  const sortBy = SORT_MAP[sortKey] || SORT_MAP.PNL;

  try {
    const res = await riseFetch<{ data: { entries?: Array<Record<string, unknown>> } }>(
      `/v1/leaderboard/combined?timeframe=${tf}&sort_by=${sortBy}&limit=${limit}&page=${page}`,
      20
    );

    const entries: LeaderboardEntry[] = (res.data?.entries || []).map((e, i) => {
      const x = (e.x_account as Record<string, unknown> | undefined) || undefined;
      return {
        rank: num(e.rank as string) || (page - 1) * limit + i + 1,
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

    return NextResponse.json({ entries, timeframe: tfKey, sort: sortKey });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
