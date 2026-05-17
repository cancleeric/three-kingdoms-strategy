# Three Kingdoms Strategy (三國誌戰略版風格遊戲)

> A turn-based grand strategy game inspired by Three Kingdoms era SLG mobile titles such as *三國誌戰略版*. Build cities, recruit legendary heroes, conquer territories on a 1:1 historical map, and forge alliances to dominate the realm.
>
> ![status](https://img.shields.io/badge/status-design--phase-orange)
> ![license](https://img.shields.io/badge/license-MIT-blue)
> ![platform](https://img.shields.io/badge/platform-Web-green)
>
> ---
>
> ## 📖 Overview
>
> This project is an open-source reimagining of the classic Three Kingdoms strategy genre, featuring:
>
> - A massive shared world map divided into hex/grid territories.
> - - Deep hero recruitment and tactic (戰法) inheritance systems.
>   - - Resource-driven city building (城建) with meaningful upgrade tradeoffs.
>     - - Real-time alliance warfare with siege, supply lines, and territory control.
>       - - Season-based (賽季) resets that keep the meta fresh.
>        
>         - For the complete game design specification, see [docs/GAME_RULES.md](docs/GAME_RULES.md).
>        
>         - ---
>
> ## 🎯 Project Goals
>
> 1. **Authentic feel** — Capture the strategic depth of *三國誌戰略版* while being approachable to newcomers.
> 2. 2. **Free-to-play friendly** — No pay-to-win mechanics. All heroes obtainable through play.
>    3. 3. **Open development** — All rules, formulas, and balance data are publicly documented in `docs/`.
>       4. 4. **Cross-platform** — Web-first, mobile responsive, with potential native ports later.
>         
>          5. ---
>         
>          6. ## 🛠 Tech Stack (Planned)
>         
>          7. | Layer        | Technology                                  |
> | ------------ | ------------------------------------------- |
> | Frontend     | TypeScript + Phaser 3 + Vite                |
> | UI / HUD     | React (overlay) + Tailwind CSS              |
> | Backend      | Node.js + Express + WebSocket (Socket.IO)   |
> | Database     | PostgreSQL (persistence) + Redis (sessions) |
> | Game Server  | Authoritative tick-based simulation         |
> | Auth         | OAuth (Google / GitHub) + JWT               |
> | Deployment   | Docker + Docker Compose, CI via GitHub Actions |
> | Testing      | Vitest (unit) + Playwright (E2E)            |
>
> ---
>
> ## 📂 Project Structure (Planned)
>
> ```
> three-kingdoms-strategy/
> ├── client/              # Phaser + React frontend
> │   ├── src/
> │   │   ├── scenes/      # Game scenes (map, battle, city)
> │   │   ├── ui/          # React UI components
> │   │   └── net/         # Network client
> │   └── public/
> ├── server/              # Node.js authoritative server
> │   ├── src/
> │   │   ├── systems/     # Game systems (combat, economy, AI)
> │   │   ├── models/      # DB models
> │   │   └── api/         # REST + WebSocket handlers
> │   └── tests/
> ├── shared/              # Shared types and game data
> │   ├── heroes/          # Hero definitions (JSON)
> │   ├── tactics/         # Tactic (戰法) definitions
> │   └── balance/         # Tunable constants
> ├── docs/
> │   ├── GAME_RULES.md    # Full game design spec
> │   ├── ARCHITECTURE.md  # System architecture
> │   └── BALANCE.md       # Numbers and formulas
> └── README.md
> ```
>
> ---
>
> ## 🚀 Getting Started
>
> > ⚠️ The project is currently in the **design phase**. Code scaffolding will follow once the rules document is finalized.
> >
> > ### Prerequisites (once development begins)
> >
> > - Node.js ≥ 20
> > - - pnpm ≥ 9
> >   - - Docker & Docker Compose
> >    
> >     - ### Local development (placeholder)
> >    
> >     - ```bash
> >       # Clone the repo
> >       git clone https://github.com/cancleeric/three-kingdoms-strategy.git
> >       cd three-kingdoms-strategy
> >
> >       # Install dependencies
> >       pnpm install
> >
> >       # Start backend services (Postgres + Redis)
> >       docker compose up -d
> >
> >       # Run the dev server
> >       pnpm dev
> >       ```
> >
> > ---
> >
> > ## 🗺 Roadmap
> >
> > - [x] Repo initialized
> > - [ ] - [x] Game design document (`docs/GAME_RULES.md`)
> > - [ ] - [ ] Balance and formula spec (`docs/BALANCE.md`)
> > - [ ] - [ ] Architecture spec (`docs/ARCHITECTURE.md`)
> > - [ ] - [ ] Hero & tactic data schema
> > - [ ] - [ ] Minimum playable prototype (1 city, 1 hero, simple combat)
> > - [ ] - [ ] Map generation and territory capture
> > - [ ] - [ ] Alliance system
> > - [ ] - [ ] First closed alpha season
> >
> > - [ ] ---
> >
> > - [ ] ## 🤝 Contributing
> >
> > - [ ] Contributions are welcome! Before opening a PR:
> >
> > - [ ] 1. Read [docs/GAME_RULES.md](docs/GAME_RULES.md) so changes align with the design vision.
> > - [ ] 2. Open an issue first for any non-trivial feature or balance change.
> > - [ ] 3. Keep PRs focused and include tests where applicable.
> >
> > - [ ] ---
> >
> > - [ ] ## 📜 License
> >
> > - [ ] This project is licensed under the [MIT License](LICENSE).
> >
> > - [ ] The game design draws inspiration from publicly known mechanics of various Three Kingdoms strategy titles, but contains no proprietary assets, art, or code from those works. All character names from the historical Three Kingdoms period are in the public domain.
> >
> > - [ ] ---
> >
> > - [ ] ## 🙏 Acknowledgements
> >
> > - [ ] Inspired by the strategic depth of classic 三國 SLG games and the historical Three Kingdoms period (220–280 AD).
> > - [ ] 
