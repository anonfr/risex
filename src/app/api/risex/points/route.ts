import { NextRequest, NextResponse } from "next/server";
import { fromWei18, num } from "@/lib/format";
import { CompetitionEntry, PointsEpoch, RISEX_API_BASE, riseFetch } from "@/lib/risex";

export interface CompetitionScoreRow {
  rank: number;
  rankChange: number;
  address: string;
  username: string;
  xHandle: string | null;
  avatarUrl: string | null;
  tradingScore: number;
  volumeScore: number;
  pnlScore: number;
  oiScore: number;
  oiTwapUsd: number;
  windowVolumeUsd: number;
  realizedPnlUsd: number;
  tickets: number;
  qualified: boolean;
}

export interface FeeTierHolder {
  rank: number;
  address: string;
  username: string;
  xHandle: string | null;
  avatarUrl: string | null;
  volume2wUsd: number;
  totalVolumeAllUsd: number;
  notionalPnlUsd: number;
  tradeCount: number;
  feeTier: number;
  feeTierLabel: string;
  takerBps: string;
  makerBps: string;
}

export function computeFeeTier(vol14d: number): {
  tier: number;
  label: string;
  takerBps: string;
  makerBps: string;
} {
  if (vol14d >= 1_000_000_000) return { tier: 6, label: "Tier 6 · VIP ($1B+)", takerBps: "1.50", makerBps: "0.00" };
  if (vol14d >= 500_000_000) return { tier: 5, label: "Tier 5 ($500M+)", takerBps: "1.55", makerBps: "0.00" };
  if (vol14d >= 100_000_000) return { tier: 4, label: "Tier 4 ($100M+)", takerBps: "1.70", makerBps: "0.25" };
  if (vol14d >= 25_000_000) return { tier: 3, label: "Tier 3 ($25M+)", takerBps: "2.10", makerBps: "0.50" };
  if (vol14d >= 5_000_000) return { tier: 2, label: "Tier 2 ($5M+)", takerBps: "2.50", makerBps: "0.75" };
  return { tier: 1, label: "Tier 1 (<$5M)", takerBps: "3.00", makerBps: "1.00" };
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") || "perpkin";
  const search = req.nextUrl.searchParams.get("search") || "";
  const offset = Math.max(0, Number(req.nextUrl.searchParams.get("offset") || 0));
  const limit = Math.min(100, Math.max(10, Number(req.nextUrl.searchParams.get("limit") || 100)));

  const searchParam = search ? `&search=${encodeURIComponent(search)}` : "";

  try {
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
        riseFetch<{
          data: { rows?: Array<Record<string, unknown>>; total?: number; updated_at?: string };
        }>(
          `/v1/competitions/${encodeURIComponent(slug)}/leaderboard?limit=${limit}&offset=${offset}${searchParam}`,
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
        rank: num(r.rank as string) || offset + i + 1,
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

    return NextResponse.json({
      pointsEpoch,
      competitions,
      activeSlug: slug,
      competitionTotal: num(compData?.total) || scoreRows.length,
      scoreRows,
      feeTierHolders,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load points & rank data" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { token?: string; account?: string };
    const token = body.token?.trim();
    const account = body.account?.trim();
    if (!token) {
      return NextResponse.json({ error: "Missing JWT access token" }, { status: 400 });
    }

    const headers = {
      "User-Agent": "Mozilla/5.0 (compatible; risex.eco/1.0)",
      Accept: "application/json",
      Authorization: token.startsWith("Bearer ") ? token : `Bearer ${token}`,
    };

    const requests: Array<Promise<{ key: string; status: number; data: unknown }>> = [
      fetch(`${RISEX_API_BASE}/v1/points/leaderboard`, { headers, cache: "no-store" }).then(
        async (r) => ({ key: "leaderboard", status: r.status, data: await r.json().catch(() => null) })
      ),
      fetch(`${RISEX_API_BASE}/v1/tiers`, { headers, cache: "no-store" }).then(
        async (r) => ({ key: "tiers", status: r.status, data: await r.json().catch(() => null) })
      ),
    ];

    if (account && /^0x[a-fA-F0-9]{40}$/.test(account)) {
      requests.push(
        fetch(`${RISEX_API_BASE}/v1/points/${account}`, { headers, cache: "no-store" }).then(
          async (r) => ({ key: "walletPoints", status: r.status, data: await r.json().catch(() => null) })
        ),
        fetch(`${RISEX_API_BASE}/v1/points/${account}/history`, { headers, cache: "no-store" }).then(
          async (r) => ({ key: "walletHistory", status: r.status, data: await r.json().catch(() => null) })
        )
      );
    }

    const settled = await Promise.all(requests);
    const out: Record<string, { status: number; data: unknown }> = {};
    for (const s of settled) {
      out[s.key] = { status: s.status, data: s.data };
    }
    return NextResponse.json(out);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to query authenticated points" },
      { status: 500 }
    );
  }
}
