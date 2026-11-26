import { NextRequest, NextResponse } from "next/server";
import { RISEX_API_BASE, riseFetch } from "@/lib/risex";

export async function GET() {
  try {
    const [domainRes, nonceRes] = await Promise.all([
      riseFetch<{ data: Record<string, unknown> }>("/v1/auth/eip712-domain", 60),
      riseFetch<{ data: { nonce: string } }>("/v1/auth/nonce", 0),
    ]);
    return NextResponse.json({
      domain: domainRes.data,
      nonce: nonceRes.data?.nonce,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch auth nonce" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      account?: string;
      nonce?: string;
      deadline?: number;
      signature?: string;
    };
    const res = await fetch(`${RISEX_API_BASE}/v1/auth/login`, {
      method: "POST",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; risex.eco/1.0)",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const json = await res.json();
    if (!res.ok) {
      return NextResponse.json(
        { error: json?.error?.message || "RISEx login failed" },
        { status: res.status }
      );
    }
    return NextResponse.json(json.data || json);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Login error" },
      { status: 500 }
    );
  }
}
