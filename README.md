# risex.eco · House of all RISEx

Real-time ecosystem analytics, wallet explorer, live orderbook & chart workbench, funding rate matrix, registered builders directory, and protocol knowledge base for **RISEx** on **RISE Chain** (Mainnet Chain ID `4153`).

Made by [**anonfrxbt**](https://x.com/anonfrxbt).

## Features

- **Protocol Overview (`/`)** — Live 24h exchange volume, total USD open interest, Crypto / Equities & ETFs / Commodities asset mix, Points Season 1: Ignite epoch countdown, top traders, and live competitions.
- **Wallet & Tx Explorer (`/explorer`)** — Inspect any `0x...` address or registered RISEx username: cross margin balance, account equity, all-time & unrealized PnL, win rate, Sharpe ratio, profit factor, equity/PnL/volume charts, daily PnL calendar heatmap, open positions, trade history, open orders, funding payments, and transaction decoder (`/v1/tx/{hash}`).
- **Markets & Funding Matrix (`/markets`)** — Interactive OHLC candlestick/line terminal (`15m`, `1h`, `4h`, `1d`), live orderbook depth, recent fills, hourly funding history, full 60+ market matrix, and multi-timeframe trader leaderboard.
- **Ecosystem, Builders & Contracts (`/projects`)** — Live registry of 94+ permissionless builder codes, XLP Vault (Yearn V3 ERC-4626), RIP-1 & RIP-2 specs, AutoYield, 14-day fee schedule, trading competitions, and verified RISE Mainnet contract addresses.
- **Learn RISEx (`/learn`)** — Searchable protocol knowledge base and `risex-client` API quickstart.

## Development

```bash
npm install
npm run dev
```

Powered by live public endpoints from [`api.rise.trade`](https://developer.rise.trade/reference/general-information) and official docs at [`docs.risechain.com/docs/risex`](https://docs.risechain.com/docs/risex).
