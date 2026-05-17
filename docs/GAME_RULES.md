PLACEHOLDER# Game Design Document — Three Kingdoms Strategy

**Version:** 0.1 (Draft)
**Last updated:** 2026-05-17
**Status:** Design phase — subject to change

This document defines the complete rules and systems of *Three Kingdoms Strategy*. It is the single source of truth for gameplay mechanics; any code or balance change should reference (and update) this file.

---

## Table of Contents

- Design Pillars
- World & Setting
- Core Game Loop
- Player Onboarding
- Hero System
- Tactic (戰法) System
- Army & Troop System
- Combat System
- City Building (城建)
- Territory & Map
- Economy & Resources
- Alliance System
- Season System (賽季)
- Progression & Monetization
- Balance Principles
- Glossary

---

## 1. Design Pillars

- **Strategic depth over reflex.** Decisions, not clicks, decide outcomes. Battles are auto-resolved from pre-battle planning.
- **Meaningful scarcity.** Resources, COST capacity, and time are the three universal limits driving tradeoffs.
- **Cooperation matters.** A solo player can survive; only an alliance can win a season.
- **Fair F2P.** Every hero and tactic is obtainable through play. Paid options sell convenience or cosmetics, never exclusive power.
- **Knowable systems.** All formulas are public. Mastery comes from understanding, not insider info.

---

## 2. World & Setting

- **Era:** Late Eastern Han through the Three Kingdoms period (c. 184–280 AD).
- **Map:** A single shared server world based on a stylized map of historical China, divided into hexagonal tiles. A typical server hosts 20,000–50,000 players on one map.
- **Regions:** The map is segmented into states (州) such as Si, Yu, Ji, Yan, Qing, Xu, Jing, Yang, Yi, Liang, You. Each state contains multiple cities (城) and resource territories.
- **Strategic landmarks:** Luoyang (洛陽) is the imperial capital and the primary victory objective each season. Secondary objectives include Chang'an, Xuchang, and pass-cities like Hulao and Tong Pass.

---

## 3. Core Game Loop

The minute-to-minute loop is: Build/Plan (城建) → Recruit/Train → Conquer Land (打地) → Earn Resources → Reinvest.

The macro loop:

- Day 1–3: Tutorial + opening expansion (開荒) on level 1–3 tiles.
- Day 4–10: Push to level 5 tiles, finish core city buildings, form alliance.
- Day 11–30: Coordinate alliance frontline, take a level 6+ region, build sub-cities.
- Day 31–60: Siege strategic cities, contest Luoyang.
- Day 60+: Season ends, account carries heroes/tactics into next season.

---

## 4. Player Onboarding

### 4.1 Lord (主公) Creation

On first launch the player chooses a Lord type (Sage Lord grants +silver, Hero Lord grants +tactic points, Wise Lord grants +gear), a birth state (出生州) that determines starting region and alliance access, plus a cosmetic banner color and sigil.

### 4.2 Sage Elder Quiz (新手問答)

A short 5-question quiz awards two starter items chosen from {weapon, armor, treasure, mount}. Players may re-roll until they obtain a desired pair (typically treasure + mount).

### 4.3 Tutorial Quests

A guided sequence covers: capturing the first level 1 tile, building farm/lumber mill/quarry/iron forge, equipping and assigning the starter hero (Guan Ping, gifted), upgrading barracks to level 3, and joining an alliance.

---

## 5. Hero System

### 5.1 Rarity Tiers

| Rarity | Tag       | Notes                                          |
| ------ | --------- | ---------------------------------------------- |
| Star 3 | Green     | Common; primarily used as tactic fodder.       |
| Star 4 | Blue      | Solid early-game frontliners.                  |
| Star 5 | Purple    | Backbone heroes; many viable late-game.        |
| Star 6 | Gold      | Premier heroes (e.g., Zhao Yun, Lu Xun).       |
| Star 6 SP | Gold +SP | Limited reimaginings with unique kits.       |

### 5.2 Core Stats

- **Force (武力)** — Boosts physical damage.
- **Intellect (智力)** — Boosts strategic damage and many tactics.
- **Command (統率)** — Boosts defense and troop capacity.
- **Speed (速度)** — Determines turn order in combat.
- **Politics (政治)** — Boosts internal affairs and resource production.
- **Charm (魅力)** — Boosts diplomacy, recruitment, and morale.

### 5.3 Hero Levels

Heroes level from 1 to 50. XP comes from battles, scouting, and dedicated training items. Each level grants stat growth based on the hero's growth curve (S/A/B/C/D rating per stat).

### 5.4 Awakening / Red Stars (紅度)

Duplicate copies of a hero increase their Red Star count, capped at 5 stars. Star 1 unlocks the hero; Star 2 gives a stat bonus tier 1; Star 3 unlocks innate tactic level 2 effect; Star 4 gives a stat bonus tier 2; Star 5 unlocks full power including max innate tactic and an ultimate ability.

### 5.5 Hero Classes (兵種適性)

Each hero has compatibility ratings (S/A/B/C) for five troop types: Cavalry (騎), Spear (槍), Shield (盾), Bow (弓), and Apparatus (器). A higher rating means stronger performance when commanding that troop type.

---

## 6. Tactic (戰法) System

### 6.1 Tactic Types

| Type           | Trigger                                                |
| -------------- | ------------------------------------------------------ |
| Command (指揮) | Activates at battle start; lasts entire battle.        |
| Active (主動)  | Activates each turn with a probability; primary damage. |
| Passive (被動) | Triggers on a condition (e.g., HP threshold).          |
| Assault (突擊) | Triggers when this hero attacks normally.              |
| Pursuit (追擊) | Triggers after a friendly active tactic resolves.      |
| Innate (自帶)  | Cannot be removed; tied to the hero, scales with red stars. |

### 6.2 Tactic Levels

Tactics scale from Lv.1 to Lv.10. Tactic point cost grows steeply after Lv.5 (the recommended F2P stopping point). Each level improves coefficients and effect probabilities.

### 6.3 Inheritance

Non-innate tactics can be extracted from a "tactic book" hero and equipped onto a different hero. The receiving hero must satisfy the tactic's restrictions (e.g., troop type, faction). Innate tactics cannot be transferred.

### 6.4 Activation Order

Within a turn the resolution order is fixed: passive triggers at turn start, then active tactics in descending speed order, then pursuit tactics linked to those actives, then normal attacks in descending speed order, then assault tactics linked to those attacks, then end-of-turn passives.

---

## 7. Army & Troop System

### 7.1 Squads (隊伍)

A player commands up to 3 active squads (more unlocked by buildings). Each squad has 1 commander plus 2 sub-generals, with an optional reserve slot. Each squad costs COST (a capacity number tied to lordship rank). Higher-rarity heroes cost more COST.

### 7.2 Troop Capacity

Troop capacity per hero is the sum of a base value from barracks level, a command stat bonus, a gear bonus, and a tactic bonus. A level 5 barracks roughly grants 1,000 troops per hero; level 10 grants about 3,000.

### 7.3 Troop Types & Rock-Paper-Scissors

Cavalry beats Bow, Bow beats Shield, Shield beats Spear, Spear beats Cavalry. Apparatus is neutral but counters fortified positions and walls. Mismatched troop types incur a 10–20% damage penalty; matching against weakness grants a 10–20% bonus.

---

## 8. Combat System

### 8.1 Turn Structure

A battle lasts up to 8 turns. If neither side is fully defeated by turn 8, the side with more remaining HP wins. Each turn resolves all six hero actions (3 per side) in the order defined in §6.4.

### 8.2 Damage Formula (simplified)

Base damage equals attacker_force times tactic_coefficient minus defender_command times 0.7. A modifier multiplies troop matchup, terrain, morale, and red star bonus. Final damage is max(1, base * modifier) multiplied by a random factor between 0.95 and 1.05. A separate strategic-damage track uses Intellect instead of Force and ignores troop matchup.

### 8.3 Morale

Each side starts at 100 morale. Casualties reduce morale; reaching 0 forces a rout, which applies a 30% damage penalty and a 50% damage-taken increase. Tactics like "Earnest Diligence" can restore morale.

### 8.4 Casualties & Recovery

Casualties are split into wounded (recoverable in barracks at 50% resource cost) and dead (permanent until rebuilt). Daily free conscription replaces a portion of losses for free.

### 8.5 Capture (俘虜)

A defeated hero has a chance to be captured by the winner. Captured heroes are unusable until ransomed, rescued by alliance, or auto-released after the default 24 hours.

---

## 9. City Building (城建)

### 9.1 Building List

| Building       | Purpose                                                  |
| -------------- | -------------------------------------------------------- |
| Lord's Hall    | Increases COST capacity and city durability.             |
| Farm           | Food production.                                         |
| Lumber Mill    | Wood production.                                         |
| Quarry         | Stone production.                                        |
| Iron Forge     | Iron production.                                         |
| Mint           | Silver coin production (critical for F2P players).       |
| Housing        | Population cap and conscription rate.                    |
| Barracks       | Troop capacity per hero.                                 |
| Drill Ground   | Unlocks higher-tier troop training.                      |
| Government     | Unlocks land-attack functions and decrees.               |
| Military Bureau| Unlocks tent/sub-city construction on captured tiles.    |
| Workshop       | Crafts gear and apparatus units.                         |
| Academy        | Unlocks and enhances strategic tactics.                  |

### 9.2 Upgrade Curve

Buildings level from 1 to 25. Resource costs spike at levels 5, 10, 15, 20, and 25 — the thresholds. Plan upgrades to cross thresholds in parallel. The first two free instant-builds per day should be used on the longest-duration upgrades.

### 9.3 Recommended Build Order

Push the four resource buildings (farm, lumber mill, quarry, iron forge) to Lv.5 each, then barracks to Lv.5 for about 1,000 troops per hero, then mint to Lv.5 for the silver economy. After that build government and military bureau to unlock land combat, then housing to Lv.7 for sustainable conscription, and finally push all resource buildings to Lv.10 before tackling Lv.15 thresholds.

---

## 10. Territory & Map

### 10.1 Tile Levels

| Tile Lv | Recommended hero Lv | Garrison strength | Yield                |
| ------- | -------------------- | ----------------- | -------------------- |
| 1       | 1–10                | Trivial           | Tutorial-tier        |
| 2–3     | 10–20               | Low               | Light resources      |
| 4       | 18–25               | Medium            | Solid resources      |
| 5       | 22–35               | Medium-high       | Best F2P yield, very low casualties |
| 6       | 35+                 | High              | High resources, requires red-starred squad |
| 7–8     | Endgame             | Very high         | Rare resources, sub-city prerequisites |

### 10.2 Capture Process

Issue a march order to an adjacent friendly tile. The squad arrives and fights the garrison. On victory the tile flips to your color and starts yielding resources. Building a tent (營帳) on the tile increases yield and contributes power score.

### 10.3 Sub-City (分城)

A sub-city unlocks when player reputation reaches 6,000 AND the player controls all 11 tiles surrounding a level 6+ anchor tile. A sub-city has independent buildings and troop capacity, allowing two production fronts to operate at once.

### 10.4 Power Score (勢力值)

Power equals the sum of tile values plus the sum of buildings on tiles plus hero star totals plus tactic level totals. The main city's internal upgrades do NOT contribute to power; they are a private economy multiplier.

---

## 11. Economy & Resources

### 11.1 Resource Types

| Resource      | Source                            | Sinks                         |
| ------------- | --------------------------------- | ----------------------------- |
| Food (糧)     | Farms, level-4+ tiles             | Marches, conscription         |
| Wood (木)     | Lumber mills, level-3+ tiles      | Buildings, walls              |
| Stone (石)    | Quarries, level-4+ tiles          | Buildings, sub-city           |
| Iron (鐵)     | Iron forges, level-5+ tiles       | Buildings, gear, weapons      |
| Silver (銅幣) | Mint, daily tasks                 | Tactic learning, gear upgrade |
| Jade (玉璧)   | Achievements, events, purchase    | Speedups, premium recruitment |

### 11.2 Tactic Points (戰法點)

Tactic points are earned by decomposing extra hero copies (typically Star 3 heroes) and spent to level up tactics. They carry over between seasons.

### 11.3 Daily Caps

Free conscription is 3 times per day per squad. Free building speedups are 2 per day per slot. Resource raids on tiles are capped at 10 per day.

---

## 12. Alliance System

### 12.1 Structure

An alliance has 1 Leader (盟主), up to 4 Vice Leaders, and a maximum of 100 members. Internal ranks (Officer, Veteran, Recruit) gate permissions for diplomacy and resource banking.

### 12.2 Mechanics

Members can teleport to allied territory once per day (Migration). They can send a defending squad to a member's tile (Reinforcement). Multiple members can attack a city simultaneously, stacking durability damage (Joint Siege). Marches benefit from speed and defense bonuses while passing over allied tiles (Supply Lines). Alliances can be at War, Neutral, or Allied; an Allied state shares defensive bonuses but is capped at 2 mutual alliances per server.

### 12.3 Alliance Tech (盟科技)

Members donate resources to research alliance-wide perks such as +march speed, +troop capacity, and +tile yield.

---

## 13. Season System (賽季)

### 13.1 Season Types

| Season             | Theme                                                      |
| ------------------ | ---------------------------------------------------------- |
| S1                 | Tutorial season; soft rules, no city raids on starters.    |
| PK                 | Standard player-vs-player season; full rules.              |
| Hanzhong           | Contested mountain map; emphasis on terrain.               |
| Heroes Rise (群雄) | Asymmetric factions, unique heroes.                        |
| Storyline (演弈)   | Scripted scenarios with PvE objectives.                    |

### 13.2 Season Flow

A 3-day preseason lets players choose a lord, pre-register heroes, and sign in for reserve troops. The opening (days 1–7) allows tile capture and city building only — no PvP city sieges. The main phase (days 8–45) opens full PvP and alliances form fronts. The climax (days 46–55) makes Luoyang capturable; whoever holds it at season end wins. Settlement (days 56–60) distributes rewards, carries prestige forward, and ranks up accounts.

### 13.3 Inheritance Between Seasons

Heroes, red stars, and tactic books PERSIST between seasons. Map progress, buildings, and tiles RESET. Equipment is converted into "essence" used to forge new equipment in the next season.

---

## 14. Progression & Monetization

### 14.1 Free-to-Play Path

Daily login grants silver and recruit tokens. Daily quests give tactic points and jade. Season rewards guarantee at least one limited Star 6 hero per active season.

### 14.2 Paid Options

A Monthly Pass grants a small daily jade allowance for 30 days — best value, recommended for casuals. A Season Pass provides tiered cosmetic and utility rewards. Cosmetics include banners, skins, and march effects — never stat-affecting. Speedups skip time on buildings and marches.

### 14.3 Anti-Pay-to-Win Guarantees

No hero card is exclusive to paid summons. No stat-boosting items are behind paywalls. The pity counter for premium pools is published and is at most 60 pulls. Trade of currency between accounts is NOT allowed.

---

## 15. Balance Principles

When proposing balance changes, contributors must justify the change against these principles:

- **Counterplay exists.** Any strategy strong enough to win must be predictable enough to counter with preparation.
- **No skip buttons.** Power gains should require interaction, not just spending.
- **Asymmetric is not unfair.** Faction or season differences are encouraged, but win-rates across mirror matchups should stay within plus or minus 5%.
- **Time respect.** A daily session of 30 minutes or less should remain competitive at the alliance contributor tier.
- **Numbers are public.** Hidden modifiers are not allowed; if a number affects the player, it goes into docs/BALANCE.md.

---

## 16. Glossary

| Term         | Meaning                                                        |
| ------------ | -------------------------------------------------------------- |
| 主公         | The player's avatar/lord.                                      |
| 開荒         | "Opening the wilderness" — the first 1–2 week expansion phase. |
| 紅度         | Red Star count; awakening level from duplicate heroes.         |
| 戰法         | Tactic; an active or passive ability slotted onto heroes.      |
| 城建         | City building; main-city construction and upgrades.            |
| COST         | Squad capacity score; limits how many big heroes fit.          |
| 分城         | Sub-city built on a high-level captured tile.                  |
| 同盟         | Alliance; a group of up to 100 players.                        |
| 賽季         | Season; a time-boxed campaign with a reset at the end.         |
| 玉璧         | Jade — premium currency.                                       |
| 銅幣         | Silver coin — soft currency.                                   |
| 預備役       | Reserve troops accumulated by daily sign-in.                   |

---

*End of document. Subsequent updates should bump the version in the header and append a changelog entry below.*

## Changelog

- 0.1 (2026-05-17) — Initial draft.
