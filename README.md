# TW-Minesweeper-Server

[![CodSpeed](https://img.shields.io/endpoint?url=https://codspeed.io/badge.json)](https://app.codspeed.io/Zialus/TW-Minesweeper-Server?utm_source=badge)

Multiplayer Minesweeper game server written in TypeScript (Express + PostgreSQL).

## Development

```sh
pnpm install
pnpm run build
pnpm test
```

## Benchmarks

Performance benchmarks for the board logic live in `tests/*.bench.ts` and are run continuously with [CodSpeed](https://codspeed.io):

```sh
pnpm run bench
```
