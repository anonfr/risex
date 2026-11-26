import { PointsClient } from "@/components/PointsClient";
import { computeFeeTier, FeeTierHolder, CompetitionScoreRow } from "@/app/api/risex/points/route";
import { fromWei18, num } from "@/lib/format";
import { CompetitionEntry, PointsEpoch, riseFetch } from "@/lib/risex";

export const dynamic = "force-dynamic";

async function loadInitialPoints() {
  const [pointsRes, compListRes, compLbRes, vol2wRes, combinedLbRes] =
    await Promise.allSettled([
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
      riseFetch<{ data: { competitions: CompetitionEntry[] } }>("/v1/competitions", 60),
      riseFetch<{ data: { rows?: Array<Record<string, unknown>>; total?: number } }>(
        "/v1/competitions/perpkin/leaderboard?limit=100&offset=0",
        20
      ),
      riseFetch<{ data: { entries?: Array<Record<string, unknown>> } }>(
        "/v1/stats/user-volume/leaderboard?window=2w&limit=100",
        30
      ),
      riseFetch<{ data: { entries?: Array<Record<string, unknown>> } }>(
        "/v1/leaderboard/combined?timeframe=LEADERBOARD_TIME_FRAME_ALL&sort_by=COMBINED_LEADERBOARD_SORT_BY_COMBINED_VOLUME&limit=100",
        30
      ),
    ]);

  const pointsEpoch: PointsEpoch | null =
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

  const competitions =
    compListRes.status === "fulfilled"
      ? compListRes.value.data?.competitions || []
      : [];

  const compData = compLbRes.status === "fulfilled" ? compLbRes.value.data : null;
  const scoreRows: CompetitionScoreRow[] = (compData?.rows || []).map((r, i) => {
    const x = (r.x_account as Record<string, unknown> | undefined) || undefined;
    return {
      rank: num(r.rank as string) || i + 1,
      rankChange: num(r.rank_change as string),
      address: String(r.address || ""),
      username: String(r.username || ""),
      xHandle: x?.username ? String(x.username) : null,
      avatarUrl:
        (r.avatar_url ? String(r.avatar_url) : null) ||
        (x?.profile_image_url ? String(x.profile_image_url) : null),
      tradingScore: num(r.trading_score as string),
      volumeScore: num(r.volume_score as string),
      pnlScore: num(r.pnl_score as string),
      oiScore: num(r.oi_score as string),
      oiTwapUsd: num(r.oi_twap as string),
      windowVolumeUsd: num(r.window_volume as string),
      realizedPnlUsd: num(r.realized_pnl as string),
      tickets: num(r.tickets as string),
      qualified: Boolean(r.qualified),
    };
  });

  const combinedByAddr = new Map<string, Record<string, unknown>>();
  if (combinedLbRes.status === "fulfilled") {
    for (const e of combinedLbRes.value.data?.entries || []) {
      combinedByAddr.set(String(e.address || "").toLowerCase(), e);
    }
  }

  const vol2wEntries =
    vol2wRes.status === "fulfilled" ? vol2wRes.value.data?.entries || [] : [];

  const feeTierHolders: FeeTierHolder[] = vol2wEntries.map((e, i) => {
    const addr = String(e.address || "");
    const meta = combinedByAddr.get(addr.toLowerCase());
    const x = (meta?.x_account as Record<string, unknown> | undefined) || undefined;
    const vol2w = num(e.total_volume as string) || num(e.traded_volume as string);
    const t = computeFeeTier(vol2w);
    return {
      rank: num(e.rank as number) || i + 1,
      address: addr,
      username: String(meta?.username || meta?.display_name || ""),
      xHandle: x?.username ? String(x.username) : null,
      avatarUrl:
        (meta?.profile_image_url ? String(meta.profile_image_url) : null) ||
        (x?.profile_image_url ? String(x.profile_image_url) : null),
      volume2wUsd: vol2w,
      totalVolumeAllUsd: meta ? num(meta.combined_volume as string) : vol2w,
      notionalPnlUsd: meta ? fromWei18(meta.notional_pnl as string) : 0,
      tradeCount: num(e.trade_count as number),
      feeTier: t.tier,
      feeTierLabel: t.label,
      takerBps: t.takerBps,
      makerBps: t.makerBps,
    };
  });

  return {
    pointsEpoch,
    competitions,
    activeSlug: "perpkin",
    competitionTotal: num(compData?.total) || scoreRows.length,
    scoreRows,
    feeTierHolders,
  };
}

export default async function PointsPage() {
  const initial = await loadInitialPoints();
  return <PointsClient initial={initial} />;
}
