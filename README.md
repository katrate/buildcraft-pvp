# BuildCraft PvP — V1 Prototype

A browser-based **multiplayer turn-based PvP buildcraft game**. Players don't pick a
character — they **build their own fighter** from powers, gear, passives, and ultimates,
then test it in practice and unranked 1v1 / 2v2 / 5v5 PvP.

> V1 philosophy: circles vs squares. Prove the **build → test → fight → earn → experiment**
> loop is fun before any art.

## Quick start

```bash
npm install
npm run dev
```

- Client: http://localhost:5173 (open two different browsers for PvP, or use the LAN host)
- Server: ws://localhost:8787

## What's in V1

| System | Notes |
| --- | --- |
| Build editor | 9-slot presets (Core / Active×2 / Passive×2 / Weapon / Armor / Utility / Ultimate), live + unranked + ranked stat previews, multiple named presets |
| Store | Categorized tabs (Cores / Actives / Buffs / Ultimates / Gear), all earnable with coins |
| Inventory | Owned powers & gear, equip status |
| Practice | 1v1 vs a single NPC at base stats — a fair sandbox for testing builds, pays coins/XP like unranked |
| Custom matches | Friend lobbies, 1v1→5v5 with **any uneven split** (2v5 allowed), no bots, fully normalized; the leader picks the norm level (standard or a rank budget) |
| Initiative upgrade | Coin-bought in the Build editor, cost creeps per level; decides who acts first and is **not normalized** in unranked |
| Unranked PvP | 1v1, 2v2, 5v5 via server matchmaking; teams fill with real players first, bots as a fallback; stats normalized (except initiative upgrade) |
| Ranked PvP | Unlocks at Level 20: **two ladders — 1v1 (solo) and 5v5 (parties)** — each with its **own rank** and its **own stat-upgrade pool**; Iron→Supreme ELO ladder (8 bands), upgrades capped by that ladder's rank, no bots — every slot is a real player within your rank window |
| Party & friends | Friends list (add by online pilot name), parties of up to 5, ready-check before queueing, whole-party queueing, kick/leave, ranked ±1 rank rule around the leader |
| Progression | Endless XP curve — no level cap, XP requirements grow every level, coins, record |
| Combat | Server-authoritative: initiative, rounds/turns, **per-match ability uses** (no energy), DoTs, shields, buffs/debuffs, stuns, counter/thorns, ultimates charging +1/round and +1/kill (5 to fire) |

## Architecture

```
/client  React + TypeScript + Vite (UI, browser-local player state)
/server  Node + TypeScript + ws (matchmaking + authoritative combat)
/shared  Pure TypeScript: types, game data, combat engine, progression, rewards
```

- **No auth / no database in V1.** Player data (name, level, XP, coins, inventory,
  presets, offline upgrades) lives in `localStorage` per browser. Server-side accounts
  can be added later without touching the combat loop.
- **The server is authoritative over matches.** Clients send intentions
  (`USE_ABILITY fire_bolt on p2`); the server validates turns, ability uses, and
  computes all damage/results (see `shared/src/engine/combat.ts`).
- **No energy system.** Every ability has a fixed number of **uses per match**
  (card shows name · damage · uses). Gear like the Energy Core adds extra uses.
- **Ultimate charge:** a whole-number counter (max 5) — +1 at the start of every round
  and +1 per kill. When full, the ultimate can fire.
- **Practice mode** (`shared/src/engine/practice.ts`) is a client-side 1v1 against one
  NPC at base stats — the old offline waves/upgrades/tokens are gone. Rewards are
  exactly the unranked table, and nothing in practice can affect PvP builds.
- **Unranked normalization** (`shared/src/engine/normalize.ts`) re-bases builds toward a
  reference level so grinding doesn't decide matches — builds do. The coin-bought
  Initiative upgrade is applied **after** normalization on purpose.
- **Ranked ladders** (`shared/src/progression.ts`): Iron → Bronze → Silver → Gold →
  Platinum → Diamond → Divine → Supreme. **1v1 and 5v5 are independent ladders** —
  separate rating, rank band, games, and their own coin-bought stat-upgrade pool (each
  pool capped by that ladder's rank: 3/6/9/12/15/18/21/24 levels per stat). Ranked
  matches never fill with bots — real players only.
- **Data-driven content:** powers/gear/effects/NPCs are plain definitions in
  `shared/src/game-data/`. Add content by appending definitions — the engine interprets
  them generically.

## Scripts

```bash
npm run dev          # server + client together
npm run dev:server   # server only (tsx watch)
npm run dev:client   # client only (vite)
npm run typecheck    # tsc across shared/server/client
npm test             # engine + economy + progression + fairness + multiplayer integration
npm run build        # production client build
```

## Custom matches (V1)

- A leader creates a **lobby** (up to 10 players, friends only — no bots), invites
  friends by name, then assigns everyone to **Team A / Team B**. Any split is allowed:
  a 2v5 is a perfectly valid match.
- **All stats are normalized.** `Standard` = unranked normalization; picking a rank
  (Iron→Supreme) normalizes everyone to that rank's **stat budget** (its upgrade
  ceiling applied to the normalized base) — so an Iron lobby and a Supreme lobby play
  at different power levels, but everyone inside one lobby is equal. The initiative
  upgrade never applies in custom (fully normalized).
- The leader starts the match; the usual **match-found countdown** applies, and the
  countdown screen shows the real team sizes (e.g. `CUSTOM 2v5`). **Custom awards no
  coins or XP at all** (not even kill/round bonuses) — friend lobbies can't be farmed
  for currency.
- **Conflicts:** a player can be in a party **or** a lobby, never both; queueing while
  in a lobby (or creating a lobby while queued/in a party) is rejected server-side.

## Parties & friends (V1)

- **Friends** live in each browser's localStorage (no accounts yet) and are added by
  **online pilot name** (`player_lookup` → the server finds the connected player).
  Invite a friend → they get a live invite card → Join/Decline.
- **Parties are server-side, session-scoped**: a party is created by a leader, members
  join via invite, and everyone submits their current build/upgrades (`party_setup`)
  so the **leader can queue the whole party in one click**.
- **Units:** a party is an indivisible queue unit — members are always on the same
  team and are never split across teams (see `server/src/queue.ts`).
- **Unranked:** anyone plays with anyone — a party of 3 can queue 5v5 (`party size
  <= team size`). The party's empty slots are filled with **real players** from the
  queue first (they join the party's team); bots only appear if the queue has been
  idle ~15s with no one joining.
- **Ready check:** every member is **ready by default** (`party_set_ready` toggles
  it). The leader can't start matchmaking until the whole party is ready — toggling
  unready while queued pulls the party out of the queue. Queue buttons show who's
  still not ready.
- **Ranked:** parties only queue the **5v5 ladder** (1v1 is solo-only). Every member
  must be within **±1 rank band of the party leader** (rejected at queue time
  otherwise), and the enemy team is matched **around the leader's 5v5 rank** — the
  same window rules as solo ranked (including the 60s ±2 widening). Parties up to 5
  queue together; their empty slots fill with real players (no bots in ranked), so a
  party of 3 queues 5v5 while a party of 6+ cannot queue ranked at all.
- Leaving/kicking a party pulls the whole unit out of any queue.
- **Match countdown:** once a match is formed (solo or party), the server announces
  `match_found` and starts the arena after **`MATCH_COUNTDOWN_MS` (5s)** — players
  see a full-screen countdown/loading screen. Actions are rejected during the
  countdown, and reconnecting mid-countdown resumes it with the remaining time.

## Economy & math (V1)

All numbers are centralized in `shared/src/rewards.ts`, `shared/src/rating.ts`,
`shared/src/progression.ts` and `shared/src/constants.ts` — tune the game without
rewriting logic.

**Ranked rating (ELO-style, `rating.ts`)** — every player has a hidden rating
(start 1000). Rank tiers are rating bands: Bronze < 1100, Silver 1100-1299, Gold
1300-1499, Platinum 1500-1699, Diamond 1700+. The server computes each match's delta:

```text
expected = 1 / (1 + 10^((opponent - mine) / 400))
delta     = round(32 * (score - expected))   score: win 1, draw 0.5, loss 0
```

- Equal ratings → win **+16** / loss **−16**. Beating a 400-point-stronger player →
  about **+29**; losing to them only costs about **−3**. Upsets pay; farming bots is
  impossible (ranked has no bots). Team matches (5v5) use each team's average rating.
- **Rank window cap:** ranked matchmaking only pairs players of the **same rank band or
  one band apart** (Bronze↔Silver↔Gold↔Platinum↔Diamond). A Gold player never faces a
  Bronze — incompatible players simply keep waiting until someone in range queues.
- **Window widening:** if the longest-waiting player has queued for 60s+
  (`RANKED_WINDOW_WIDEN_AFTER_MS`), the window widens to **±2 bands** so sparse ranks
  still find matches instead of waiting forever.
- Rank determines the ranked stat-upgrade ceiling (5 / 8 / 12 / 16 / 20 levels per
  stat for Bronze → Diamond).

**Match rewards (`rewards.ts`)** — `total = base(result, mode) + kill bonus + round bonus`,
with the bonus hard-capped so a farmed loss can never out-earn a win:

| Mode | Win | Draw | Lose |
| --- | --- | --- | --- |
| Practice | 100 XP / 50c | 50 / 30 | 30 / 20 |
| Unranked | 100 XP / 50c | 50 / 30 | 30 / 20 |
| Ranked | 150 XP / 90c | 75 / 60 | 50 / 40 |
| Custom | 0 XP / 0c (friend lobbies — no farming) | 0 / 0 | 0 / 0 |

- Kill bonus: **+8 coins & +8 XP per kill** (max 3 kills count).
- Round bonus: **+5 coins & +5 XP every 3 rounds** fought.
- Hard caps: **+20 coins / +60 XP** total bonus — below the victory-vs-defeat gap, so
  dragging a loss or chasing kills can't beat winning.
- The end screen shows the full breakdown (base + kills + rounds).

**Upgrade economy (`constants.ts`)** — both coin sinks use `cost = base + level × step`,
and **every purchase costs at least 1000 coins** so power can't be stacked after one or
two matches:

| Upgrade | Effect | Cost | Cap |
| --- | --- | --- | --- |
| Initiative | +1 initiative / level (all modes, not normalized in unranked) | 1000 + 250×lvl | 100 |
| Ranked stats (per stat) | HP +12 / Atk +1.5 / Def +1 per level (ranked only) | 1000 + 250×lvl | rank ceiling (5–20) |

**Store pricing (`game-data/powers.ts`, `game-data/gear.ts`)** — all items cost
**≥ 1000 coins**, scaled by rarity: common 1000 · uncommon 1500 · rare 2000 · epic 2500.
Rewards were deliberately kept as-is (see table above) so each purchase now takes many
matches of play.

**XP curve (`progression.ts`)** — `xpToNextLevel(level) = 100 × level^1.6`, and
**levels have no cap**: the requirement keeps climbing forever, so a level-30 player
needs more XP than a level-21 player, and so on. Level 20 is only the **ranked
unlock threshold** (`RANKED_UNLOCK_LEVEL`), not a ceiling. Starter kit: 1000 coins
(exactly one starter purchase), Fire Bolt + Iron Sword.

## Dev shortcuts

- The main menu has a **“⚡ Instantly Unlock Ranked”** dev button that jumps you to
  the ranked-unlock threshold (Level 20) immediately — levels are otherwise endless
  and keep rising (so you can test ranked stat upgrades and the ranked queue).
- Reset your local progress (coins/inventory/level) from the Profile screen.

## Testing multiplayer locally

1. Start `npm run dev`.
2. Open http://localhost:5173 in **two different browsers** (or two devices on the same
   LAN using the host's IP).
3. Enter a pilot name in each, join Unranked → 1v1, and fight.
4. For 2v2 / 5v5: fewer real players are fine. The server **keeps searching for real
   players** — every new player that joins the queue resets the search window
   (default ~15s, `MATCHMAKING_BOT_FILL_WAIT_MS` in `shared/src/constants.ts`). Only
   when the queue has been idle that long does it start the match and fill the empty
   slots with bots. Real players fill a party's empty slots first (same team); only
   the leftovers bot-fill.

## Troubleshooting: "Failed to load module script … MIME type text/html"

This error means the browser fetched an HTML page where it expected a JavaScript
module — almost always a **serving** mistake, not a code bug:

- **Always open `http://localhost:5173`** while `npm run dev` is running (the terminal
  must still be open). Do NOT open `client/dist/index.html` directly from the file
  explorer — a module script can't run from `file://` and its absolute `/assets/…`
  paths won't resolve, which produces exactly this error (plus manifest.json warnings).
- **Wrong port?** The app is served by Vite on **5173**. Port 8787 is the game server
  (WebSockets) and returns JSON, not the app.
- **Stale tab?** Hard-refresh with Ctrl+Shift+R after starting `npm run dev`.
- **Production build:** run `npm run build` then `npm run preview` and open the printed
  URL (default http://localhost:4173). The build now uses relative asset paths
  (`base: './'`), so it also works from any static server or subfolder.

## Fairness rules enforced

- Client-supplied damage/currency/XP/result values are never trusted (see
  `shared/src/engine/combat.ts` + tests).
- Unranked normalizes combat stats (except the initiative upgrade).
- Ranked upgrades apply only in ranked matches and are capped by rank.
- Custom matches are fully normalized (standard or a chosen rank budget) — no
  initiative spend, no ranked upgrades, no bots.

## V1 scope deliberately excluded

Final art, animations, maps, events/seasons, real-money payments, cosmetics marketplace,
clans/chat, mobile. The core loop comes first. (Friends/party/custom-lobby systems are
in; persistent accounts and cross-session friends are not.)
