"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  BookOpen,
  Command,
  Compass,
  Layers,
  Moon,
  Search,
  Sun,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";

interface QuickMarket {
  id: string;
  symbol: string;
  label: string;
  sector: string;
}

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Compass },
  { href: "/explorer", label: "Explorer", icon: Wallet },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/projects", label: "Ecosystem", icon: Layers },
  { href: "/learn", label: "Learn", icon: BookOpen },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [cmdOpen, setCmdOpen] = useState(false);
  const [cmdQuery, setCmdQuery] = useState("");
  const [quickMarkets, setQuickMarkets] = useState<QuickMarket[]>([]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        const saved = localStorage.getItem("risex-eco-theme");
        if (saved === "light" || saved === "dark") {
          setTheme(saved);
          document.documentElement.setAttribute("data-theme", saved);
        }
      } catch {
        // ignore
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      } else if (e.key === "Escape") {
        setCmdOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!cmdOpen || quickMarkets.length > 0) return;
    fetch("/api/risex/overview")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.markets)) {
          setQuickMarkets(
            d.markets.map((m: { id: string; symbol: string; label: string; sector: string }) => ({
              id: m.id,
              symbol: m.symbol,
              label: m.label,
              sector: m.sector,
            }))
          );
        }
      })
      .catch(() => {});
  }, [cmdOpen, quickMarkets.length]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("risex-eco-theme", next);
    } catch {
      // ignore
    }
  };

  const trimmed = cmdQuery.trim();
  const isAddress = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  const isTxHash = /^0x[a-fA-F0-9]{64}$/.test(trimmed);

  const filteredMarkets = useMemo(() => {
    if (!trimmed) return quickMarkets.slice(0, 6);
    const q = trimmed.toLowerCase();
    return quickMarkets
      .filter(
        (m) =>
          m.symbol.toLowerCase().includes(q) ||
          m.label.toLowerCase().includes(q) ||
          m.sector.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [quickMarkets, trimmed]);

  const handleCmdSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trimmed) return;
    if (isAddress) {
      setCmdOpen(false);
      setCmdQuery("");
      router.push(`/explorer?address=${trimmed}`);
      return;
    }
    if (isTxHash) {
      setCmdOpen(false);
      setCmdQuery("");
      router.push(`/explorer?tx=${trimmed}`);
      return;
    }
    if (filteredMarkets.length > 0) {
      setCmdOpen(false);
      setCmdQuery("");
      router.push(`/markets?id=${filteredMarkets[0].id}`);
    }
  };

  return (
    <>
      <header
        className="sticky top-0 z-40 border-b backdrop-blur-xl transition-colors"
        style={{
          background: "var(--nav-glass)",
          borderColor: "var(--line)",
        }}
      >
        <div className="mx-auto flex h-14 max-w-[1360px] items-center justify-between gap-2 px-3 sm:px-6">
          <div className="flex items-center gap-5 min-w-0">
            <Link href="/" className="flex items-center gap-2.5 group shrink-0">
              <span
                className="grid h-8 w-8 place-items-center rounded-lg border transition-transform group-hover:scale-105"
                style={{
                  background: "var(--brand-mint-tint)",
                  borderColor: "var(--line-mint)",
                  color: "var(--mint)",
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 17L10.5 6L14.5 13L20 5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 20H20"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    opacity="0.55"
                  />
                </svg>
              </span>
              <div className="flex items-center gap-2">
                <span className="font-display text-base sm:text-lg font-semibold tracking-tight">
                  risex.eco
                </span>
                <span
                  className="hidden sm:inline-block text-[10px] font-mono-num px-1.5 py-0.5 rounded border"
                  style={{
                    color: "var(--mint)",
                    borderColor: "var(--line-mint)",
                    background: "var(--brand-mint-tint)",
                  }}
                >
                  RISE · 4153
                </span>
              </div>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {NAV_ITEMS.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
                    style={{
                      color: active ? "var(--mint-bright)" : "var(--text-mute)",
                      background: active ? "var(--brand-mint-tint)" : "transparent",
                      border: active
                        ? "1px solid var(--line-mint)"
                        : "1px solid transparent",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              aria-label="Search wallet, market or tx"
              className="inline-flex h-9 sm:h-8 items-center gap-2 rounded-lg border px-2.5 text-xs transition-colors hover:border-[var(--line-mint)] cursor-pointer"
              style={{
                background: "var(--surface-1)",
                borderColor: "var(--line)",
                color: "var(--text-mute)",
              }}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Search wallet, market, tx…</span>
              <span className="hidden sm:inline lg:hidden">Search</span>
              <span className="eco-kbd hidden sm:inline-flex items-center gap-0.5">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </button>

            <a
              href="https://x.com/anonfrxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-[var(--line-mint)]"
              style={{
                background: "var(--surface-0)",
                borderColor: "var(--line)",
                color: "var(--text-mute)",
              }}
            >
              made by <span style={{ color: "var(--mint)" }}>anonfrxbt</span>
            </a>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-9 w-9 sm:h-8 sm:w-8 place-items-center rounded-lg border transition-colors hover:border-[var(--line-mint)] cursor-pointer"
              style={{
                background: "var(--surface-1)",
                borderColor: "var(--line)",
                color: "var(--text-mute)",
              }}
            >
              {theme === "dark" ? (
                <Sun className="h-3.5 w-3.5" />
              ) : (
                <Moon className="h-3.5 w-3.5" />
              )}
            </button>

            <a
              href="https://rise.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 sm:h-8 items-center gap-1 rounded-lg px-2.5 sm:px-3 text-xs font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "var(--brand-mint-button)",
                color: "var(--brand-mint-button-fg)",
                boxShadow: "var(--shadow-cta)",
              }}
            >
              <span className="hidden sm:inline">Trade on RISEx</span>
              <span className="sm:hidden">Trade</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1360px] px-3.5 py-4 sm:px-6 sm:py-8">
        {children}
      </main>

      <footer
        className="border-t pt-7 pb-24 md:pb-8 mt-8 sm:mt-12"
        style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
      >
        <div className="mx-auto max-w-[1360px] px-4 sm:px-6 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-display text-base font-semibold">risex.eco</span>
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                · House of all RISEx
              </span>
              <span
                className="inline-flex items-center gap-1.5 text-[11px] font-mono-num px-2 py-0.5 rounded-full border"
                style={{
                  borderColor: "var(--line-mint)",
                  background: "var(--brand-mint-tint)",
                  color: "var(--mint-bright)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full live-dot"
                  style={{ background: "var(--mint)" }}
                />
                Live via api.rise.trade
              </span>
            </div>
            <p className="text-xs" style={{ color: "var(--text-mute)" }}>
              Made by{" "}
              <a
                href="https://x.com/anonfrxbt"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-[var(--line-mint)] underline-offset-4 hover:opacity-80"
                style={{ color: "var(--mint)" }}
              >
                anonfrxbt
              </a>{" "}
              · Independent RISEx &amp; RISE Chain analytics. Not affiliated with RISE Labs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-mute)" }}>
            <a
              href="https://x.com/anonfrxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium hover:text-[var(--mint)]"
            >
              x.com/anonfrxbt <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://rise.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--mint)]"
            >
              rise.trade <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://docs.risechain.com/docs/risex"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--mint)]"
            >
              RISEx Docs <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://developer.rise.trade/reference/general-information"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--mint)]"
            >
              API Reference <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://explorer.risechain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--mint)]"
            >
              RISE Explorer <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t backdrop-blur-xl"
        style={{
          background: "var(--nav-glass)",
          borderColor: "var(--line)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="grid grid-cols-5 h-14">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors"
                style={{
                  color: active ? "var(--mint)" : "var(--text-mute)",
                }}
              >
                <span
                  className="grid h-7 w-11 place-items-center rounded-full transition-colors"
                  style={{
                    background: active ? "var(--brand-mint-tint)" : "transparent",
                  }}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Command Palette */}
      {cmdOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] sm:pt-[12vh] px-3 sm:px-4 backdrop-blur-sm"
          style={{ background: "var(--scrim-bg)" }}
          onClick={() => setCmdOpen(false)}
        >
          <div
            className="w-full max-w-xl rounded-2xl border overflow-hidden shadow-2xl"
            style={{
              background: "var(--palette-bg)",
              borderColor: "var(--line-mint)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={handleCmdSubmit}
              className="flex items-center gap-2.5 border-b px-3.5 py-3"
              style={{ borderColor: "var(--line)" }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: "var(--mint)" }} />
              <input
                autoFocus
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="Paste 0x wallet, tx hash, or market…"
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--text-dim)]"
              />
              <button
                type="button"
                onClick={() => setCmdOpen(false)}
                className="rounded-md p-1.5 hover:bg-[var(--surface-2)] cursor-pointer"
                style={{ color: "var(--text-dim)" }}
              >
                <X className="h-4 w-4" />
              </button>
            </form>

            <div className="max-h-[65vh] overflow-y-auto p-3 space-y-3">
              {isAddress && (
                <button
                  type="button"
                  onClick={() => {
                    setCmdOpen(false);
                    setCmdQuery("");
                    router.push(`/explorer?address=${trimmed}`);
                  }}
                  className="w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm cursor-pointer"
                  style={{
                    background: "var(--brand-mint-tint)",
                    borderColor: "var(--line-mint)",
                  }}
                >
                  <span className="flex items-center gap-2 font-mono-num">
                    <Wallet className="h-4 w-4" style={{ color: "var(--mint)" }} />
                    Inspect wallet {trimmed.slice(0, 10)}…{trimmed.slice(-6)}
                  </span>
                  <span className="text-xs" style={{ color: "var(--mint)" }}>
                    Enter ↵
                  </span>
                </button>
              )}

              {isTxHash && (
                <button
                  type="button"
                  onClick={() => {
                    setCmdOpen(false);
                    setCmdQuery("");
                    router.push(`/explorer?tx=${trimmed}`);
                  }}
                  className="w-full flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-left text-sm cursor-pointer"
                  style={{
                    background: "var(--brand-mint-tint)",
                    borderColor: "var(--line-mint)",
                  }}
                >
                  <span className="flex items-center gap-2 font-mono-num">
                    <Activity className="h-4 w-4" style={{ color: "var(--mint)" }} />
                    Decode tx {trimmed.slice(0, 12)}…{trimmed.slice(-6)}
                  </span>
                  <span className="text-xs" style={{ color: "var(--mint)" }}>
                    Enter ↵
                  </span>
                </button>
              )}

              <div>
                <div
                  className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--text-dim)" }}
                >
                  Pages
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {NAV_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => {
                          setCmdOpen(false);
                          router.push(item.href);
                        }}
                        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:border-[var(--line-mint)] cursor-pointer"
                        style={{
                          background: "var(--surface-1)",
                          borderColor: "var(--line)",
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: "var(--mint)" }} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredMarkets.length > 0 && (
                <div>
                  <div
                    className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-dim)" }}
                  >
                    Markets
                  </div>
                  <div className="space-y-1">
                    {filteredMarkets.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setCmdOpen(false);
                          setCmdQuery("");
                          router.push(`/markets?id=${m.id}`);
                        }}
                        className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-xs transition-colors hover:bg-[var(--brand-mint-tint)] cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono-num font-semibold">
                            {m.symbol}/USDC
                          </span>
                          <span style={{ color: "var(--text-mute)" }}>{m.label}</span>
                        </div>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px]"
                          style={{
                            background: "var(--surface-2)",
                            color: "var(--text-mute)",
                          }}
                        >
                          {m.sector}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div
                className="flex items-center justify-between border-t pt-2.5 px-2 text-[11px]"
                style={{ borderColor: "var(--line)", color: "var(--text-dim)" }}
              >
                <span>
                  Made by{" "}
                  <a
                    href="https://x.com/anonfrxbt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                    style={{ color: "var(--mint)" }}
                  >
                    anonfrxbt
                  </a>
                </span>
                <span>ESC to close</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
