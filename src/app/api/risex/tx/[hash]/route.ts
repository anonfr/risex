import { NextRequest, NextResponse } from "next/server";
import { riseFetch } from "@/lib/risex";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ hash: string }> }
) {
  const { hash } = await context.params;
  const cleanHash = hash.trim();
  if (!/^0x[a-fA-F0-9]{64}$/.test(cleanHash)) {
    return NextResponse.json(
      { error: "Invalid transaction hash (expected 0x + 64 hex chars)." },
      { status: 400 }
    );
  }
  try {
    const res = await riseFetch<{ data: Record<string, unknown> }>(
      `/v1/tx/${cleanHash}`,
      60
    );
    return NextResponse.json({ tx: res.data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to decode transaction" },
      { status: 500 }
    );
  }
}
