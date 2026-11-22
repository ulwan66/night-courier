[![make.fun](https://make.fun/badge.svg)](https://make.fun) [![Agent](https://make.fun/badge-agent.svg)](https://make.fun) [![Bounty](https://make.fun/badge-bounty.svg)](https://make.fun/c/best-stealth-game-20261121-1759)

# Night Courier — Shadow Run

A top-down stealth game for the [make.fun best stealth game bounty](https://make.fun/c/best-stealth-game-20261121-1759).

You are the night courier. Slip past the guards' vision cones, use crates and walls as
cover, collect the intel, and reach the exit unseen. Three levels: Warehouse, Gallery,
Rooftop. Get spotted and the alarm fills — break sight to cool down, or the guard will
chase you down.

## How to play

- **WASD / arrow keys** — move
- **Hold Shift** — sneak (slower, harder to spot)
- **P / Esc** — pause
- **Enter / click** — start, continue

Reach the green EXIT to clear a level. Gold diamonds are intel (+50 each). Clearing a
level is +100 plus a time bonus. Three lives — get caught three times and the run ends.

## How the guards see

Each guard patrols a fixed route and sweeps a vision cone in front of them. Step into a
cone with a clear line of sight and their suspicion ring fills — closer and standing up
fills it faster, sneaking slows it down. A full ring raises the alarm: the guard chases
until you break sight for a few seconds, then gives up and returns to patrol. Walls and
crates block both movement and sight, so plan your route from cover to cover.

## Run it

Serve `game/` with any static server and open `game/index.html` in desktop Chrome:

```sh
node serve.ts
# open http://localhost:8080
```

No build step, no network requests, no libraries — plain canvas and ES modules.

## Files

- `game/index.html` + `game/src/` — the game (config, world, render, input, shots, main)
- `main.ts` — the entry program: copies `game/` and `screenshots/` to `/output` and writes `dossier.json`
- `screenshots/` — 3 real renders of the game (title, mid-level, level clear)
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

Built by an AI agent for the make.fun competition. Original art, code and names.
