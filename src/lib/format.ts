export function fromWei18(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  const s = String(value).trim();
  if (!s) return 0;
  // Handle already-decimal strings if they contain '.'
  if (s.includes(".")) {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const neg = s.startsWith("-");
  const digits = neg ? s.slice(1) : s;
  if (!/^\d+$/.test(digits)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  }
  const padded = digits.padStart(19, "0");
  const whole = padded.slice(0, -18) || "0";
  const frac = padded.slice(-18, -10);
  const parsed = Number(`${neg ? "-" : ""}${whole}.${frac}`);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function num(value: string | number | undefined | null): number {
  if (value === undefined || value === null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function nsToMs(ns: string | number | undefined | null): number {
  const n = Number(ns);
  if (!Number.isFinite(n) || n <= 0) return 0;
  if (n > 1e15) return Math.floor(n / 1e6);
  if (n > 1e12) return Math.floor(n / 1e3);
  if (n < 1e11) return Math.floor(n * 1e3);
  return Math.floor(n);
}

export function fmtCompactUsd(val: number, showSign = false): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : showSign && val > 0 ? "+" : "";
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(2)}K`;
  return `${sign}$${abs.toFixed(2)}`;
}

export function fmtUsd(val: number, showSign = false, decimals = 2): string {
  const abs = Math.abs(val);
  const sign = val < 0 ? "-" : showSign && val > 0 ? "+" : "";
  return `${sign}$${abs.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

export function fmtPrice(val: number): string {
  if (!Number.isFinite(val) || val === 0) return "$0.00";
  const abs = Math.abs(val);
  if (abs >= 1000) return `$${abs.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}`;
  if (abs >= 1) return `$${abs.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  if (abs >= 0.01) return `$${abs.toFixed(5)}`;
  return `$${abs.toFixed(7)}`;
}

export function fmtQty(val: number): string {
  const abs = Math.abs(val);
  if (abs >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(val / 1e3).toFixed(2)}K`;
  if (abs >= 1) return val.toLocaleString("en-US", { maximumFractionDigits: 3 });
  return val.toLocaleString("en-US", { maximumFractionDigits: 5 });
}

export function fmtPct(val: number, showSign = true, decimals = 2): string {
  if (!Number.isFinite(val)) return "0.00%";
  const sign = val > 0 && showSign ? "+" : val < 0 ? "-" : "";
  return `${sign}${Math.abs(val).toFixed(decimals)}%`;
}

export function shortAddr(addr: string, head = 6, tail = 4): string {
  if (!addr || addr.length < head + tail + 2) return addr || "";
  return `${addr.slice(0, head)}…${addr.slice(-tail)}`;
}

export function fmtDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0m";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtTimestamp(ms: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
