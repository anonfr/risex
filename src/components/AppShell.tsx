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
  Sparkles,
  Sun,
  TrendingUp,
  Wallet,
  X,
} from "lucide-react";
import { LiveDot, MarketBadge } from "./MarketBadge";

interface QuickMarket {
  id: string;
  symbol: string;
  label: string;
  sector: string;
}

const NAV_ITEMS = [
  { href: "/", label: "Overview", icon: Compass },
  { href: "/markets", label: "Markets", icon: TrendingUp },
  { href: "/explorer", label: "Explorer", icon: Wallet },
  { href: "/points", label: "Points", icon: Sparkles },
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
        className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors"
        style={{
          background: "var(--nav-glass)",
          borderColor: "var(--line)",
        }}
      >
        <div className="mx-auto flex h-12 max-w-[1320px] items-center justify-between gap-2 px-3 sm:px-5">
          {/* Left brand */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <span
                className="grid h-7 w-7 place-items-center rounded-[6px] border transition-colors"
                style={{
                  background: "var(--accent-soft)",
                  borderColor: "var(--line-mint)",
                  color: "var(--accent)",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 17L10.5 6L14.5 13L20 5"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="text-[13px] font-semibold tracking-wider uppercase">
                risex<span style={{ color: "var(--accent)" }}>.eco</span>
              </span>
            </Link>

            <span
              className="hidden lg:inline-flex items-center gap-1.5 text-[11px] font-mono-num px-2 py-0.5 rounded-[5px] border"
              style={{
                borderColor: "var(--line)",
                color: "var(--text-dim)",
              }}
            >
              <LiveDot />
              RISE 4153
            </span>
          </div>

          {/* Center nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {NAV_ITEMS.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={active}
                  className="navtrigger"
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCmdOpen(true)}
              aria-label="Search wallet, market or tx"
              className="inline-flex h-8 items-center gap-2 rounded-[6px] border px-2.5 text-xs transition-colors hover:border-[var(--line-mid)] cursor-pointer"
              style={{
                background: "transparent",
                borderColor: "var(--line)",
                color: "var(--text-mute)",
              }}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Search</span>
              <span className="eco-kbd hidden sm:inline-flex items-center gap-0.5">
                <Command className="h-2.5 w-2.5" />K
              </span>
            </button>

            <a
              href="https://x.com/anonfrxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden xl:inline-flex items-center gap-1 rounded-[6px] border px-2.5 h-8 text-xs transition-colors hover:border-[var(--line-mint)]"
              style={{
                borderColor: "var(--line)",
                color: "var(--text-mute)",
              }}
            >
              made by <span style={{ color: "var(--accent)" }}>anonfrxbt</span>
            </a>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="grid h-8 w-8 place-items-center rounded-[6px] border transition-colors hover:border-[var(--line-mid)] cursor-pointer"
              style={{
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
              className="inline-flex h-8 items-center gap-1 rounded-[6px] px-2.5 sm:px-3 text-xs font-semibold transition-opacity hover:opacity-90"
              style={{
                background: "var(--brand-mint-button)",
                color: "var(--brand-mint-button-fg)",
              }}
            >
              <span>Trade</span>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-[1320px] px-3.5 py-5 sm:px-5 sm:py-7">
        {children}
      </main>

      <footer
        className="border-t pt-6 pb-20 md:pb-7 mt-10"
        style={{ borderColor: "var(--line)", background: "var(--surface-0)" }}
      >
        <div className="mx-auto max-w-[1320px] px-4 sm:px-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap text-xs">
              <span className="font-semibold tracking-wider uppercase">
                risex<span style={{ color: "var(--accent)" }}>.eco</span>
              </span>
              <span style={{ color: "var(--text-dim)" }}>·</span>
              <span style={{ color: "var(--text-mute)" }}>
                Made by{" "}
                <a
                  href="https://x.com/anonfrxbt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline underline-offset-4 hover:opacity-80"
                  style={{ color: "var(--accent)" }}
                >
                  anonfrxbt
                </a>
              </span>
            </div>
            <p className="text-[11px]" style={{ color: "var(--text-dim)" }}>
              Data from RISEx public API (`api.rise.trade`) and RISE Chain docs. Unofficial, read-only.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs" style={{ color: "var(--text-mute)" }}>
            <a
              href="https://x.com/anonfrxbt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
            >
              x.com/anonfrxbt <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://rise.trade"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
            >
              rise.trade <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://docs.risechain.com/docs/risex"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
            >
              Docs <ArrowUpRight className="h-3 w-3" />
            </a>
            <a
              href="https://explorer.risechain.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-[var(--accent)]"
            >
              Explorer <ArrowUpRight className="h-3 w-3" />
            </a>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Dock */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 inset-x-0 z-40 md:hidden border-t backdrop-blur-lg"
        style={{
          background: "var(--nav-glass)",
          borderColor: "var(--line)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="grid grid-cols-6 h-13">
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
                  color: active ? "var(--accent)" : "var(--text-dim)",
                }}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label === "Ecosystem" ? "Eco" : item.label}</span>
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
            className="w-full max-w-xl rounded-[9px] border overflow-hidden"
            style={{
              background: "var(--palette-bg)",
              borderColor: "var(--line-mid)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <form
              onSubmit={handleCmdSubmit}
              className="flex items-center gap-2.5 border-b px-3.5 py-3"
              style={{ borderColor: "var(--line)" }}
            >
              <Search className="h-4 w-4 shrink-0" style={{ color: "var(--accent)" }} />
              <input
                autoFocus
                value={cmdQuery}
                onChange={(e) => setCmdQuery(e.target.value)}
                placeholder="Paste 0x wallet, tx hash, or market…"
                className="w-full bg-transparent text-base sm:text-sm outline-none placeholder:text-[var(--text-dim)]"
              />
              <button
                type="button"
                onClick={() => setCmdOpen(false)}
                className="rounded p-1 hover:bg-[var(--surface-2)] cursor-pointer"
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
                  className="w-full flex items-center justify-between rounded-[7px] border px-3 py-2.5 text-left text-xs cursor-pointer"
                  style={{
                    background: "var(--brand-mint-tint)",
                    borderColor: "var(--line-mint)",
                  }}
                >
                  <span className="flex items-center gap-2 font-mono-num">
                    <Wallet className="h-4 w-4" style={{ color: "var(--accent)" }} />
                    Inspect wallet {trimmed.slice(0, 10)}…{trimmed.slice(-6)}
                  </span>
                  <span style={{ color: "var(--accent)" }}>Enter ↵</span>
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
                  className="w-full flex items-center justify-between rounded-[7px] border px-3 py-2.5 text-left text-xs cursor-pointer"
                  style={{
                    background: "var(--brand-mint-tint)",
                    borderColor: "var(--line-mint)",
                  }}
                >
                  <span className="flex items-center gap-2 font-mono-num">
                    <Activity className="h-4 w-4" style={{ color: "var(--accent)" }} />
                    Decode tx {trimmed.slice(0, 12)}…{trimmed.slice(-6)}
                  </span>
                  <span style={{ color: "var(--accent)" }}>Enter ↵</span>
                </button>
              )}

              <div>
                <div
                  className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--text-dim)" }}
                >
                  Navigate
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
                        className="flex items-center gap-2 rounded-[6px] border px-3 py-2 text-xs font-medium transition-colors hover:border-[var(--line-mid)] cursor-pointer"
                        style={{
                          background: "var(--surface-1)",
                          borderColor: "var(--line)",
                        }}
                      >
                        <Icon className="h-3.5 w-3.5" style={{ color: "var(--accent)" }} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {filteredMarkets.length > 0 && (
                <div>
                  <div
                    className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-widest"
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
                        className="w-full flex items-center justify-between rounded-[6px] px-2.5 py-2 text-xs transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                      >
                        <div className="flex items-center gap-2.5">
                          <MarketBadge symbol={m.symbol} size={20} />
                          <span className="font-mono-num font-semibold">{m.symbol}</span>
                          <span style={{ color: "var(--text-mute)" }}>{m.label}</span>
                        </div>
                        <span className="text-[11px]" style={{ color: "var(--text-dim)" }}>
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
                    style={{ color: "var(--accent)" }}
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
