# Game Design Document — Three Kingdoms Strategy

**Version:** 0.1 (Draft)
**Last updated:** 2026-05-17
**Status:** Design phase — subject to change

This document defines the complete rules and systems of *Three Kingdoms Strategy*. It is the single source of truth for gameplay mechanics; any code or balance change should reference (and update) this file.

---

## Table of Contents

1. [Design Pillars](#1-design-pillars)
2. 2. [World & Setting](#2-world--setting)
   3. 3. [Core Game Loop](#3-core-game-loop)
      4. 4. [Player Onboarding](#4-player-onboarding)
         5. 5. [Hero System](#5-hero-system)
            6. 6. [Tactic (戰法) System](#6-tactic-system)
               7. 7. [Army & Troop System](#7-army--troop-system)
                  8. 8. [Combat System](#8-combat-system)
                     9. 9. [City Building (城建)](#9-city-building)
                        10. 10. [Territory & Map](#10-territory--map)
                            11. 11. [Economy & Resources](#11-economy--resources)
                                12. 12. [Alliance System](#12-alliance-system)
                                    13. 13. [Season System (賽季)](#13-season-system)
                                        14. 14. [Progression & Monetization](#14-progression--monetization)
                                            15. 15. [Balance Principles](#15-balance-principles)
                                                16. 16. [Glossary](#16-glossary)
                                                   
                                                    17. ---
                                                   
                                                    18. ## 1. Design Pillars
                                                   
                                                    19. 1. **Strategic depth over reflex.** Decisions, not clicks, decide outcomes. Battles are auto-resolved from pre-battle planning.
                                                        2. 2. **Meaningful scarcity.** Resources, COST capacity, and time are the three universal limits driving tradeoffs.
                                                           3. 3. **Cooperation matters.** A solo player can survive; only an alliance can win a season.
                                                              4. 4. **Fair F2P.** Every hero and tactic is obtainable through play. Paid options sell convenience or cosmetics, never exclusive power.
                                                                 5. 5. **Knowable systems.** All formulas are public. Mastery comes from understanding, not insider info.
                                                                   
                                                                    6. ---
                                                                   
                                                                    7. ## 2. World & Setting
                                                                   
                                                                    8. - **Era:** Late Eastern Han through the Three Kingdoms period (c. 184–280 AD).
                                                                       - - **Map:** A single shared server world based on a stylized map of historical China, divided into hexagonal **tiles**. A typical server hosts 20,000–50,000 players on one map.
                                                                         - - **Regions:** The map is segmented into **states (州)** such as Si, Yu, Ji, Yan, Qing, Xu, Jing, Yang, Yi, Liang, You. Each state contains multiple **cities (城)** and resource territories.
                                                                           - - **Strategic landmarks:** Luoyang (洛陽) is the imperial capital and the primary victory objective each season. Secondary objectives include Chang'an, Xuchang, and pass-cities like Hulao and Tong Pass.
                                                                            
                                                                             - ---

                                                                             ## 3. Core Game Loop

                                                                             The minute-to-minute loop:

                                                                             ```
                                                                              ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                                                                              │ Build / Plan │ -> │  Recruit /   │ -> │ Conquer Land │ -> │  Earn        │
                                                                              │  (城建)      │    │   Train      │    │  (打地)      │    │  Resources   │
                                                                              └──────────────┘    └──────────────┘    └──────────────┘    └──────────────┘
                                                                                     ^                                                            │
                                                                                     └────────────────────── Reinvest ────────────────────────────┘
                                                                             ```

                                                                             The macro loop:

                                                                             ```
                                                                             Day 1–3   : Tutorial + opening expansion (開荒) on level 1–3 tiles
                                                                             Day 4–10  : Push to level 5 tiles, finish core city buildings, form alliance
                                                                             Day 11–30 : Coordinate alliance frontline, take a level 6+ region, build sub-cities
                                                                             Day 31–60 : Siege strategic cities, contest Luoyang
                                                                             Day 60+   : Season ends, account carries heroes/tactics into next season
                                                                             ```

                                                                             ---

                                                                             ## 4. Player Onboarding

                                                                             ### 4.1 Lord (主公) Creation

                                                                             On first launch the player chooses:

                                                                             | Choice              | Effect                                                       |
                                                                             | ------------------- | ------------------------------------------------------------ |
                                                                             | Lord type           | *Sage Lord* (+silver), *Hero Lord* (+tactic points), *Wise Lord* (+gear) |
                                                                             | Birth state (出生州) | Determines starting region; affects alliance access          |
                                                                             | Banner color & sigil | Cosmetic                                                    |

                                                                             ### 4.2 Sage Elder Quiz (新手問答)

                                                                             A short 5-question quiz awards two starter items chosen from {weapon, armor, treasure, mount}. Players may re-roll until they obtain a desired pair (typically **treasure + mount**).

                                                                             ### 4.3 Tutorial Quests

                                                                             A guided sequence covering:
                                                                             1. Capture first level 1 tile.
                                                                             2. 2. Build farm, lumber mill, quarry, iron forge.
                                                                                3. 3. Equip and assign starter hero (Guan Ping, gifted).
                                                                                   4. 4. Upgrade barracks to level 3.
                                                                                      5. 5. Join an alliance (recommended).
                                                                                        
                                                                                         6. ---
                                                                                        
                                                                                         7. ## 5. Hero System
                                                                                        
                                                                                         8. ### 5.1 Rarity Tiers
                                                                                        
                                                                                         9. | Rarity | Tag       | Notes                                          |
                                                                                         10. | ------ | --------- | ---------------------------------------------- |
                                                                                         11. | ★3     | Green     | Common; primarily used as tactic fodder.       |
                                                                                         12. | ★4     | Blue      | Solid early-game frontliners.                  |
                                                                                         13. | ★5     | Purple    | Backbone heroes; many viable late-game.        |
                                                                                         14. | ★6     | Gold      | Premier heroes (e.g., Zhao Yun, Lu Xun).       |
                                                                                         15. | ★6 SP  | Gold +SP  | Limited reimaginings with unique kits.         |
                                                                                        
                                                                                         16. ### 5.2 Core Stats
                                                                                        
                                                                                         17. - **Force (武力)** — Boosts physical damage.
                                                                                             - - **Intellect (智力)** — Boosts strategic damage and many tactics.
                                                                                               - - **Command (統率)** — Boosts defense and troop capacity.
                                                                                                 - - **Speed (速度)** — Determines turn order in combat.
                                                                                                   - - **Politics (政治)** — Boosts internal affairs and resource production.
                                                                                                     - - **Charm (魅力)** — Boosts diplomacy, recruitment, and morale.
                                                                                                      
                                                                                                       - ### 5.3 Hero Levels
                                                                                                      
                                                                                                       - - Levels 1–50. XP gained from battles, scouting, and dedicated training items.
                                                                                                         - - Each level grants stat growth based on the hero's growth curve (S/A/B/C/D rating per stat).
                                                                                                          
                                                                                                           - ### 5.4 Awakening / Red Stars (紅度)
                                                                                                          
                                                                                                           - Duplicate copies of a hero increase their **Red Star** count, capped at **5 stars**.
                                                                                                          
                                                                                                           - | Red Stars | Effect                                                  |
                                                                                                           - | --------- | ------------------------------------------------------- |
                                                                                                           - | ★1        | Unlocks the hero.                                       |
                                                                                                           - | ★2        | +Stat bonus tier 1.                                     |
                                                                                                           - | ★3        | Unlocks innate tactic level 2 effect.                   |
                                                                                                           - | ★4        | +Stat bonus tier 2.                                     |
                                                                                                           - | ★5        | Full power: max innate tactic, ultimate ability unlock. |
                                                                                                          
                                                                                                           - ### 5.5 Hero Classes (兵種適性)
                                                                                                          
                                                                                                           - Each hero has compatibility ratings (S/A/B/C) for five troop types: **Cavalry (騎)**, **Spear (槍)**, **Shield (盾)**, **Bow (弓)**, **Apparatus (器)**. Higher rating = stronger when commanding that troop type.
                                                                                                          
                                                                                                           - ---
                                                                                                           
                                                                                                           ## 6. Tactic (戰法) System
                                                                                                           
                                                                                                           ### 6.1 Tactic Types
                                                                                                           
                                                                                                           | Type           | Trigger                                                |
                                                                                                           | -------------- | ------------------------------------------------------ |
                                                                                                           | Command (指揮) | Activates at the start of battle; lasts entire battle. |
                                                                                                           | Active (主動)  | Activates each turn with a probability; primary damage. |
                                                                                                           | Passive (被動) | Triggers on a condition (e.g., HP threshold).          |
                                                                                                           | Assault (突擊) | Triggers when this hero attacks normally.              |
                                                                                                           | Pursuit (追擊) | Triggers after a friendly active tactic resolves.      |
                                                                                                           | Innate (自帶)  | Cannot be removed; tied to the hero, scales with red stars. |
                                                                                                           
                                                                                                           ### 6.2 Tactic Levels
                                                                                                           
                                                                                                           - Tactics scale from **Lv.1 to Lv.10**.
                                                                                                           - - Tactic point cost grows steeply after Lv.5 (recommended F2P stopping point).
                                                                                                             - - Each level improves coefficients and effect probabilities.
                                                                                                              
                                                                                                               - ### 6.3 Inheritance
                                                                                                              
                                                                                                               - - Non-innate tactics can be extracted from a "tactic book" hero and equipped onto a different hero.
                                                                                                                 - - The receiving hero must satisfy the tactic's restrictions (e.g., troop type, faction).
                                                                                                                   - - Innate tactics cannot be transferred.
                                                                                                                    
                                                                                                                     - ### 6.4 Activation Order
                                                                                                                    
                                                                                                                     - Within a turn the resolution order is fixed:
                                                                                                                    
                                                                                                                     - 1. Passive triggers that activate on turn start.
                                                                                                                       2. 2. Active tactics, in descending **speed** order.
                                                                                                                          3. 3. Pursuit tactics linked to step 2.
                                                                                                                             4. 4. Normal attacks, in descending speed order.
                                                                                                                                5. 5. Assault tactics linked to step 4.
                                                                                                                                   6. 6. End-of-turn passives.
                                                                                                                                     
                                                                                                                                      7. ---
                                                                                                                                     
                                                                                                                                      8. ## 7. Army & Troop System
                                                                                                                                     
                                                                                                                                      9. ### 7.1 Squads (隊伍)
                                                                                                                                     
                                                                                                                                      10. - A player commands up to **3 active squads** (more unlocked by buildings).
                                                                                                                                          - - Each squad has **1 commander + 2 副將**, plus an optional reserve slot.
                                                                                                                                            - - Each squad costs **COST** (a capacity number tied to lordship rank). Higher-rarity heroes cost more COST.
                                                                                                                                             
                                                                                                                                              - ### 7.2 Troop Capacity
                                                                                                                                             
                                                                                                                                              - Troop capacity per hero is determined by:
                                                                                                                                             
                                                                                                                                              - ```
                                                                                                                                                capacity = base_by_barracks_level + command_stat_bonus + gear_bonus + tactic_bonus
                                                                                                                                                ```
                                                                                                                                                
                                                                                                                                                A level 5 barracks roughly grants 1,000 troops per hero; level 10 grants ~3,000.
                                                                                                                                                
                                                                                                                                                ### 7.3 Troop Types & Rock-Paper-Scissors
                                                                                                                                                
                                                                                                                                                ```
                                                                                                                                                Cavalry  > Bow     > Shield  > Spear   > Cavalry
                                                                                                                                                Apparatus is neutral but counters fortified positions and walls.
                                                                                                                                                ```
                                                                                                                                                
                                                                                                                                                Mismatched troop types incur a 10–20% damage penalty; matching against weakness grants a 10–20% bonus.
                                                                                                                                                
                                                                                                                                                ---
                                                                                                                                                
                                                                                                                                                ## 8. Combat System
                                                                                                                                                
                                                                                                                                                ### 8.1 Turn Structure
                                                                                                                                                
                                                                                                                                                - A battle lasts up to **8 turns**.
                                                                                                                                                - - If neither side is fully defeated by turn 8, the side with more remaining HP wins.
                                                                                                                                                  - - Each turn resolves all six hero actions (3 per side) in the order defined in §6.4.
                                                                                                                                                   
                                                                                                                                                    - ### 8.2 Damage Formula (simplified)
                                                                                                                                                   
                                                                                                                                                    - ```
                                                                                                                                                      base = (attacker_force * tactic_coefficient) - (defender_command * 0.7)
                                                                                                                                                      modifier = troop_matchup * terrain * morale * red_star_bonus
                                                                                                                                                      damage = max(1, base * modifier) * randomness(0.95–1.05)
                                                                                                                                                      ```
                                                                                                                                                      
                                                                                                                                                      A separate strategic-damage track uses **Intellect** instead of Force and ignores troop matchup.
                                                                                                                                                      
                                                                                                                                                      ### 8.3 Morale
                                                                                                                                                      
                                                                                                                                                      - Starts at 100 per side.
                                                                                                                                                      - - Each casualty reduces morale; reaching 0 forces a rout (–30% damage, +50% damage taken).
                                                                                                                                                        - - Tactics like *Earnest Diligence* restore morale.
                                                                                                                                                         
                                                                                                                                                          - ### 8.4 Casualties & Recovery
                                                                                                                                                         
                                                                                                                                                          - - Casualties are split into **wounded** (recoverable in barracks at 50% resource cost) and **dead** (permanent until rebuilt).
                                                                                                                                                            - - Daily free conscription replaces a portion of losses for free.
                                                                                                                                                             
                                                                                                                                                              - ### 8.5 Capture (俘虜)
                                                                                                                                                             
                                                                                                                                                              - A defeated hero has a chance to be **captured** by the winner. Captured heroes are unusable until ransomed, rescued by alliance, or auto-released (default 24h).
                                                                                                                                                             
                                                                                                                                                              - ---
                                                                                                                                                              
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
                                                                                                                                                              
                                                                                                                                                              - Levels 1–25 per building.
                                                                                                                                                              - - Resource costs spike at levels 5, 10, 15, 20, 25 — the "thresholds." Plan upgrades to cross thresholds in parallel.
                                                                                                                                                                - - The first two free instant-builds per day should be used on the longest-duration upgrades.
                                                                                                                                                                 
                                                                                                                                                                  - ### 9.3 Recommended Build Order
                                                                                                                                                                 
                                                                                                                                                                  - 1. Farm/Lumber/Quarry/Iron Forge → Lv.5 each.
                                                                                                                                                                    2. 2. Barracks → Lv.5 (unlocks ~1,000 troops/hero).
                                                                                                                                                                       3. 3. Mint → Lv.5 (silver economy).
                                                                                                                                                                          4. 4. Government & Military Bureau → unlocks land combat.
                                                                                                                                                                             5. 5. Housing → Lv.7 (sustainable conscription).
                                                                                                                                                                                6. 6. Push all resource buildings to Lv.10 before Lv.15 thresholds.
                                                                                                                                                                                  
                                                                                                                                                                                   7. ---
                                                                                                                                                                                  
                                                                                                                                                                                   8. ## 10. Territory & Map
                                                                                                                                                                                  
                                                                                                                                                                                   9. ### 10.1 Tile Levels
                                                                                                                                                                                  
                                                                                                                                                                                   10. | Tile Lv | Recommended hero Lv | Garrison strength | Yield                |
                                                                                                                                                                                   11. | ------- | -------------------- | ----------------- | -------------------- |
                                                                                                                                                                                   12. | 1       | 1–10                | Trivial           | Tutorial-tier        |
                                                                                                                                                                                   13. | 2–3     | 10–20               | Low               | Light resources      |
                                                                                                                                                                                   14. | 4       | 18–25               | Medium            | Solid resources      |
                                                                                                                                                                                   15. | 5       | 22–35               | Medium-high       | **Best F2P yield**, very low casualties |
                                                                                                                                                                                   16. | 6       | 35+                 | High              | High resources, requires red-starred squad |
                                                                                                                                                                                   17. | 7–8     | Endgame             | Very high         | Rare resources, sub-city prerequisites |
                                                                                                                                                                                  
                                                                                                                                                                                   18. ### 10.2 Capture Process
                                                                                                                                                                                  
                                                                                                                                                                                   19. 1. Issue **march order** to an adjacent friendly tile.
                                                                                                                                                                                       2. 2. Squad arrives and fights the garrison.
                                                                                                                                                                                          3. 3. On victory the tile flips to your color and starts yielding resources.
                                                                                                                                                                                             4. 4. Building a **tent (營帳)** on the tile increases yield and contributes power score.
                                                                                                                                                                                               
                                                                                                                                                                                                5. ### 10.3 Sub-City (分城)
                                                                                                                                                                                               
                                                                                                                                                                                                6. - Unlocked when player reputation ≥ 6,000 **and** the player controls all 11 tiles surrounding a level 6+ anchor tile.
                                                                                                                                                                                                   - - A sub-city has independent buildings and troop capacity, allowing two production fronts.
                                                                                                                                                                                                    
                                                                                                                                                                                                     - ### 10.4 Power Score (勢力值)
                                                                                                                                                                                                    
                                                                                                                                                                                                     - ```
                                                                                                                                                                                                       power = Σ(tile_value) + Σ(building_on_tile_value) + hero_stars + tactic_levels
                                                                                                                                                                                                       ```
                                                                                                                                                                                                       
                                                                                                                                                                                                       The main city's internal upgrades do **not** contribute to power; they are a private economy multiplier.
                                                                                                                                                                                                       
                                                                                                                                                                                                       ---
                                                                                                                                                                                                       
                                                                                                                                                                                                       ## 11. Economy & Resources
                                                                                                                                                                                                       
                                                                                                                                                                                                       ### 11.1 Resource Types
                                                                                                                                                                                                       
                                                                                                                                                                                                       | Resource      | Source                            | Sinks                       |
                                                                                                                                                                                                       | ------------- | --------------------------------- | --------------------------- |
                                                                                                                                                                                                       | Food (糧)     | Farms, level-4+ tiles             | Marches, conscription       |
                                                                                                                                                                                                       | Wood (木)     | Lumber mills, level-3+ tiles      | Buildings, walls            |
                                                                                                                                                                                                       | Stone (石)    | Quarries, level-4+ tiles          | Buildings, sub-city         |
                                                                                                                                                                                                       | Iron (鐵)     | Iron forges, level-5+ tiles       | Buildings, gear, weapons    |
                                                                                                                                                                                                       | Silver (銅幣) | Mint, daily tasks                 | Tactic learning, gear upgrade |
                                                                                                                                                                                                       | Jade (玉璧)   | Achievements, events, purchase    | Speedups, premium recruitment |
                                                                                                                                                                                                       
                                                                                                                                                                                                       ### 11.2 Tactic Points (戰法點)
                                                                                                                                                                                                       
                                                                                                                                                                                                       - Earned by decomposing extra hero copies (typically ★3).
                                                                                                                                                                                                       - - Spent to level tactics.
                                                                                                                                                                                                         - - Carry over between seasons.
                                                                                                                                                                                                          
                                                                                                                                                                                                           - ### 11.3 Daily Caps
                                                                                                                                                                                                          
                                                                                                                                                                                                           - - Free conscription: 3× per day per squad.
                                                                                                                                                                                                             - - Free building speedups: 2× per day per slot.
                                                                                                                                                                                                               - - Resource raid: 10× per day on tiles.
                                                                                                                                                                                                                
                                                                                                                                                                                                                 - ---
                                                                                                                                                                                                                 
                                                                                                                                                                                                                 ## 12. Alliance System
                                                                                                                                                                                                                 
                                                                                                                                                                                                                 ### 12.1 Structure
                                                                                                                                                                                                                 
                                                                                                                                                                                                                 - 1 **Leader (盟主)**, up to 4 **Vice Leaders**, ≤ 100 members.
                                                                                                                                                                                                                 - - Internal ranks (Officer, Veteran, Recruit) gate permissions.
                                                                                                                                                                                                                  
                                                                                                                                                                                                                   - ### 12.2 Mechanics
                                                                                                                                                                                                                  
                                                                                                                                                                                                                   - - **Migration**: Members can teleport to allied territory once per day.
                                                                                                                                                                                                                     - - **Reinforcement**: Send a defending squad to a member's tile.
                                                                                                                                                                                                                       - - **Joint Siege**: Multiple members attack a city simultaneously; durability damage stacks.
                                                                                                                                                                                                                         - - **Supply Lines**: Marches benefit from speed/defense bonuses while passing over allied tiles.
                                                                                                                                                                                                                           - - **Diplomacy**: Alliances can be at *War*, *Neutral*, or *Allied*; allied state shares defensive bonuses but capped at 2 mutual alliances per server.
                                                                                                                                                                                                                            
                                                                                                                                                                                                                             - ### 12.3 Alliance Tech (盟科技)
                                                                                                                                                                                                                            
                                                                                                                                                                                                                             - Members donate resources to research alliance-wide perks: +march speed, +troop capacity, +tile yield, etc.
                                                                                                                                                                                                                            
                                                                                                                                                                                                                             - ---
                                                                                                                                                                                                                             
                                                                                                                                                                                                                             ## 13. Season System (賽季)
                                                                                                                                                                                                                             
                                                                                                                                                                                                                             ### 13.1 Season Types
                                                                                                                                                                                                                             
                                                                                                                                                                                                                             | Season  | Theme                                                      |
                                                                                                                                                                                                                             | ------- | ---------------------------------------------------------- |
                                                                                                                                                                                                                             | S1      | Tutorial season; soft rules, no city raids on starters.    |
                                                                                                                                                                                                                             | PK      | Standard player-vs-player season; full rules.              |
                                                                                                                                                                                                                             | Hanzhong | Contested mountain map; emphasis on terrain.              |
                                                                                                                                                                                                                             | Heroes Rise (群雄逐鹿) | Asymmetric factions, unique heroes.          |
                                                                                                                                                                                                                             | Storyline (演弈) | Scripted scenarios with PvE objectives.             |
                                                                                                                                                                                                                             
                                                                                                                                                                                                                             ### 13.2 Season Flow
                                                                                                                                                                                                                             
                                                                                                                                                                                                                             1. **Preseason (3 days)**: Choose lord, pre-register heroes, sign in for reserve troops.
                                                                                                                                                                                                                             2. 2. **Opening (Days 1–7)**: Tile capture & city building only. No PvP city sieges.
                                                                                                                                                                                                                                3. 3. **Main (Days 8–45)**: Full PvP. Alliances form fronts.
                                                                                                                                                                                                                                   4. 4. **Climax (Days 46–55)**: Luoyang is unlockable; whoever holds it at season end wins.
                                                                                                                                                                                                                                      5. 5. **Settlement (Days 56–60)**: Rewards distributed, prestige carries over, account ranks up.
                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                         6. ### 13.3 Inheritance Between Seasons
                                                                                                                                                                                                                                        
                                                                                                                                                                                                                                         7. - Heroes, red stars, and tactic books **persist**.
                                                                                                                                                                                                                                            - - Map progress, buildings, and tiles **reset**.
                                                                                                                                                                                                                                              - - Equipment is converted into "essence" used to forge new equipment.
                                                                                                                                                                                                                                               
                                                                                                                                                                                                                                                - ---
                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                ## 14. Progression & Monetization
                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                ### 14.1 Free-to-Play Path
                                                                                                                                                                                                                                                
                                                                                                                                                                                                                                                - Daily login: silver + recruit tokens.
                                                                                                                                                                                                                                                - - Daily quests: tactic points, jade.
                                                                                                                                                                                                                                                  - - Season rewards: guaranteed at least 1 limited ★6 per active season.
                                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                    - ### 14.2 Paid Options
                                                                                                                                                                                                                                                   
                                                                                                                                                                                                                                                    - - **Monthly Pass**: small daily jade for 30 days. *Best value, recommended for casuals.*
                                                                                                                                                                                                                                                      - - **Season Pass**: tiered cosmetic + utility rewards.
                                                                                                                                                                                                                                                        - - **Cosmetics**: banners, skins, march effects. **Never stat-affecting.**
                                                                                                                                                                                                                                                          - - **Speedups**: time skips for buildings and marches.
                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                            - ### 14.3 Anti-Pay-to-Win Guarantees
                                                                                                                                                                                                                                                           
                                                                                                                                                                                                                                                            - 1. No card is exclusive to paid summons.
                                                                                                                                                                                                                                                              2. 2. No stat-boosting items behind paywalls.
                                                                                                                                                                                                                                                                 3. 3. Pity counter for premium pools is published and ≤ 60 pulls.
                                                                                                                                                                                                                                                                    4. 4. Trade of currency between accounts is **not** allowed.
                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                       5. ---
                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                       6. ## 15. Balance Principles
                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                       7. When proposing balance changes, contributors must justify the change against these principles:
                                                                                                                                                                                                                                                                      
                                                                                                                                                                                                                                                                       8. 1. **Counterplay exists.** Any strategy strong enough to win must be predictable enough to counter with preparation.
                                                                                                                                                                                                                                                                          2. 2. **No skip buttons.** Power gains should require interaction, not just spending.
                                                                                                                                                                                                                                                                             3. 3. **Asymmetric ≠ Unfair.** Faction or season differences are encouraged, but win-rates across mirror matchups should stay within ±5%.
                                                                                                                                                                                                                                                                                4. 4. **Time respect.** A daily ≤ 30-minute play session should remain competitive at the alliance contributor tier.
                                                                                                                                                                                                                                                                                   5. 5. **Numbers are public.** Hidden modifiers are not allowed; if a number affects the player, it goes into `docs/BALANCE.md`.
                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                      6. ---
                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                      7. ## 16. Glossary
                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                      8. | Term         | Meaning                                                        |
                                                                                                                                                                                                                                                                                      9. | ------------ | -------------------------------------------------------------- |
                                                                                                                                                                                                                                                                                      10. | 主公         | The player's avatar/lord.                                      |
                                                                                                                                                                                                                                                                                      11. | 開荒         | "Opening the wilderness" — the first 1–2 week expansion phase. |
                                                                                                                                                                                                                                                                                      12. | 紅度         | Red Star count; awakening level from duplicate heroes.         |
                                                                                                                                                                                                                                                                                      13. | 戰法         | Tactic; an active or passive ability slotted onto heroes.      |
                                                                                                                                                                                                                                                                                      14. | 城建         | City building; main-city construction & upgrades.              |
                                                                                                                                                                                                                                                                                      15. | COST         | Squad capacity score; limits how many big heroes fit.          |
                                                                                                                                                                                                                                                                                      16. | 分城         | Sub-city built on a high-level captured tile.                  |
                                                                                                                                                                                                                                                                                      17. | 同盟         | Alliance; a group of up to 100 players.                        |
                                                                                                                                                                                                                                                                                      18. | 賽季         | Season; a time-boxed campaign with a reset at the end.         |
                                                                                                                                                                                                                                                                                      19. | 玉璧         | Jade — premium currency.                                       |
                                                                                                                                                                                                                                                                                      20. | 銅幣         | Silver coin — soft currency.                                   |
                                                                                                                                                                                                                                                                                      21. | 預備役       | Reserve troops accumulated by daily sign-in.                   |
                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                      22. ---
                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                      23. *End of document. Subsequent updates should bump the version in the header and append a changelog entry below.*
                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                      24. ## Changelog
                                                                                                                                                                                                                                                                                     
                                                                                                                                                                                                                                                                                      25. - **0.1 (2026-05-17)** — Initial draft.
                                                                                                                                                                                                                                                                                          - 
