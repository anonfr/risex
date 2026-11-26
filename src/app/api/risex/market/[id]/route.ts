import { NextRequest, NextResponse } from "next/server";
import { nsToMs, num } from "@/lib/format";
import { normalizeMarkets, RawMarket, riseFetch } from "@/lib/risex";

const INTERVAL_MAP: Record<string, { seconds: number; lookbackHours: number }> = {
  "15m": { seconds: 900, lookbackHours: 18 },
  "1h": { seconds: 3600, lookbackHours: 72 },
  "4h": { seconds: 14400, lookbackHours: 240 },
  "1d": { seconds: 86400, lookbackHours: 24 * 45 },
};

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const intervalKey = req.nextUrl.searchParams.get("interval") || "1h";
  const cfg = INTERVAL_MAP[intervalKey] || INTERVAL_MAP["1h"];

  const nowSec = Math.floor(Date.now() / 1000);
  const fromSec = nowSec - cfg.lookbackHours * 3600;
  const intervalNs = BigInt(cfg.seconds) * BigInt(1_000_000_000);
  const fromNs = BigInt(fromSec) * BigInt(1_000_000_000);
  const toNs = BigInt(nowSec) * BigInt(1_000_000_000);

  try {
    const [marketsRes, bookRes, tradesRes, fundingRes, tvRes] =
      await Promise.allSettled([
        riseFetch<{ data: { markets: RawMarket[] } }>(`/v1/markets?market_ids=${id}`, 5),
        riseFetch<{
          data: {
            bids?: Array<{ price: string; quantity: string; order_count: number }>;
            asks?: Array<{ price: string; quantity: string; order_count: number }>;
            total_bids?: string;
            total_asks?: string;
          };
        }>(`/v1/orderbook?market_id=${id}&limit=16`, 0),
        riseFetch<{
          data: {
            trades?: Array<{
              id: string;
              maker_side: string;
              price: string;
              size: string;
              time: string;
              block_number?: string;
            }>;
          };
        }>(`/v1/markets/id/${id}/trade-history?limit=35`, 0),
        riseFetch<{
          data: {
            records?: Array<{
              funding_rate: string;
              accumulated_funding: string;
              index_price: string;
              start_time: string;
              end_time: string;
            }>;
          };
        }>(`/v1/markets/id/${id}/funding-rate-history?limit=36`, 30),
        riseFetch<{
          data: {
            data?: Array<{
              time: string;
              open: string;
              high: string;
              low: string;
              close: string;
              volume: string;
            }>;
          };
        }>(
          `/v1/markets/id/${id}/trading-view-data?interval=${intervalNs.toString()}&from=${fromNs.toString()}&to=${toNs.toString()}`,
          15
        ),
      ]);

    const rawMarkets =
      marketsRes.status === "fulfilled" ? marketsRes.value.data?.markets || [] : [];
    const normalized = normalizeMarkets(rawMarkets);
    const market = normalized[0] || null;

    const bookData = bookRes.status === "fulfilled" ? bookRes.value.data : null;
    const bids = (bookData?.bids || []).map((b) => ({
      price: num(b.price),
      quantity: num(b.quantity),
      orderCount: b.order_count || 1,
    }));
    const asks = (bookData?.asks || []).map((a) => ({
      price: num(a.price),
      quantity: num(a.quantity),
      orderCount: a.order_count || 1,
    }));

    const trades =
      tradesRes.status === "fulfilled"
        ? (tradesRes.value.data?.trades || []).map((t) => ({
            id: t.id,
            side: t.maker_side === "BUY" ? "SELL" : "BUY", // taker direction
            makerSide: t.maker_side,
            price: num(t.price),
            size: num(t.size),
            timeMs: nsToMs(t.time),
            blockNumber: t.block_number || "",
          }))
        : [];

    const fundingHistory =
      fundingRes.status === "fulfilled"
        ? (fundingRes.value.data?.records || []).map((r) => ({
            ratePct: num(r.funding_rate) * 100,
            aprPct: num(r.funding_rate) * 100 * 24 * 365,
            indexPrice: num(r.index_price),
            timeMs: nsToMs(r.end_time || r.start_time),
          }))
        : [];

    const candles =
      tvRes.status === "fulfilled"
        ? (tvRes.value.data?.data || [])
            .map((c) => ({
              timeMs: nsToMs(c.time),
              open: num(c.open),
              high: num(c.high),
              low: num(c.low),
              close: num(c.close),
              volume: num(c.volume),
            }))
            .filter((c) => c.close > 0)
        : [];

    return NextResponse.json({
      market,
      orderbook: {
        bids,
        asks,
        totalBids: num(bookData?.total_bids),
        totalAsks: num(bookData?.total_asks),
      },
      trades,
      fundingHistory: fundingHistory.reverse(),
      candles,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load market detail" },
      { status: 500 }
    );
  }
}
