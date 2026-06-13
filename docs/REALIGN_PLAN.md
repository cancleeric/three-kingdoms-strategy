# 《三國志戰略版》校準路線圖

**版本**：v1.0 草案  
**日期**：2026-06-13  
**作者**：CPO gray  
**狀態**：待 CEO 親審後方可派工

---

## 一、逐系統 Gap 表

### 1. 戰法 Deck（核心靈魂）

| 維度 | 真實《三戰》 | 我們現況 | 差距 |
|------|------------|---------|------|
| 每武將戰法槽 | 1 自帶 + **2 可學槽** | 1 自帶 innate + `tactics[]` 無上限 | 🔴 無槽位限制=無決策壓力 |
| 可學戰法來源 | **拆書**（拆多餘武將取戰法書）習得 | 無拆書機制，tactics 直接掛上去 | 🔴 核心養成迴路完全缺失 |
| 戰法類型分類 | 7 類：指揮/主動/突擊/被動/兵種/陣法/內政 | 6 類（types.ts）：command/active/passive/assault/pursuit/innate；**缺兵種類、陣法類、內政類** | 🔴 三類缺失 |
| 同一槽位類型限制 | 兩個可學槽通常不能都放同類強戰法（有 composition 策略） | 無任何組合限制 | 🟡 策略深度不足 |
| 戰法書升級 | 吃同名書升 Lv.1→10 | Tactic.level 欄位存在但沒有升級函式、也沒有書庫 | 🟡 資料模型有欄位但邏輯空殼 |
| 陣法類戰法結算 | 影響全隊陣形加成，開戰前生效 | 無陣法類 | 🔴 缺失 |
| 兵種類戰法（轉兵種） | 如西涼鐵騎：換騎兵附帶此戰法效果 | TroopType 有 cavalry 但無搭配兵種類戰法 | 🔴 缺失 |
| 內政類戰法 | 城建/資源產出加成，非戰場 | 無 | 🟡 中期優先度較低 |

### 2. 世界地圖 SLG 核心（連地/鋪路/行軍）

| 維度 | 真實《三戰》 | 我們現況 | 差距 |
|------|------------|---------|------|
| 地塊相鄰限制 | 只能攻打**與己方領地相鄰**的地塊 | `canMarch()` 已有相鄰檢核 | 🟢 邏輯已存在 |
| 行軍時間（真實時間） | 行軍吃真實分鐘，距離越遠越慢 | 完全即時、無等待 | 🔴 缺失 |
| 部隊行軍狀態（在途） | 部隊出發後「在途」，期間不能用；到達才結算戰鬥 | 點擊立即結算 | 🔴 缺失 |
| 補兵時間 | 補兵吃真實時間 + 食物/鐵 | 無補兵機制 | 🔴 缺失 |
| 城池駐防 | 城有守備部隊概念 | city.ts 無駐防部隊 | 🟡 缺失 |
| 行動次數/體力 | 每日行動有上限（體力/行動令） | 無任何限制 | 🟡 可後期加 |

### 3. 編隊：3 武將/隊、城最多 5 部隊

| 維度 | 真實《三戰》 | 我們現況 | 差距 |
|------|------------|---------|------|
| 每隊人數 | 主將 + 2 副將（固定 3 人） | `Squad.units[]` 無上限 | 🟡 型別放寬，需強制 |
| 每城部隊數 | 最多 5 部隊 | 無城池部隊上限 | 🟡 缺失 |
| 主副將角色差異 | 主將死亡=隊潰；副將死傷影響兵力 | 無主副將區分 | 🟡 缺失 |

### 4. 四陣營（魏蜀吳群）

| 維度 | 真實《三戰》 | 我們現況 | 差距 |
|------|------------|---------|------|
| 陣營歸屬 | 每位玩家選 1 陣營，協力建特定建築 | Hero 無陣營欄位 | 🔴 完全缺失 |
| 陣營建築加成 | 陣營共同建造洛陽/州城等大型建築，給全陣營玩家加成 | 無 | 🔴 缺失 |
| 陣營對抗 | 四陣營爭州城、洛陽為賽季目標 | season.ts 無陣營目標 | 🔴 缺失 |

### 5. 兵種深化（8 種兵種、相剋、轉兵種）

| 維度 | 真實《三戰》 | 我們現況 | 差距 |
|------|------------|---------|------|
| 兵種數量 | 8 種（步/矛/盾/弓/騎/器/象/屯田等） | 5 種（cavalry/spear/shield/bow/apparatus） | 🟡 缺 3 種 |
| 兵種相剋 | 多層相剋含象兵等 | 簡化 5 元循環已有 | 🟢 基礎已存在 |
| 兵種類戰法（轉兵種） | 武將裝備兵種類戰法可改搭配兵種 | 無兵種類 TacticType | 🟡 缺失 |
| 兵種適性評級 | S/A/B/C 影響戰鬥係數 | `aptitude: Record<TroopType, Aptitude>` 已有欄位但戰鬥引擎未讀取 | 🟡 欄位有，未接入戰鬥 |

### 6. 賽季制

| 維度 | 真實《三戰》 | 我們現況 | 差距 |
|------|------------|---------|------|
| 地圖重置 | 每賽季地圖全重置 | `advanceSeason()` 有，但不清理 worldmap 狀態 | 🟡 邏輯半成品 |
| 武將/戰法保留 | 武將+戰法書+紅度跨賽季保留 | 保留邏輯在 roster，但無戰法書保留 | 🟡 缺戰法書跨季保留 |
| 同盟集結攻城 | 同盟集合多部隊攻州城/洛陽（PvP 核心玩法） | alliance.ts 只有捐獻科技，無集結攻城 | 🔴 缺失 |

---

## 二、優先序路線圖

CEO 指示：深度優先，別再加淺系統。優先順序為：  
**M1 戰法 Deck 重做 > M2 行軍時間 SLG > M3 陣營/兵種深化 > M4 賽季目標整合**

---

### 停止做什麼（FREEZE LIST）

以下已建的淺系統**凍結，不再擴張**，有 bug 再修，不加新功能：

- onboarding.ts 的新手任務序列（已夠用）
- gacha.ts 的抽卡保底（已有 pity 60 機制）
- season.ts 的賽季輪替（等 M4 才動）
- worldmap.ts 的 `canFoundSubCity()`（連地 SLG 先做，城再等 M2 後）
- campaign.ts 的 8 關打地設計（維持現狀，等 M1 戰法接入後再測平衡）
- UI 的沙盒模式、PvP 房間（凍結，M1-M3 完成後才做 PvP 深化）

---

### M1：戰法 Deck 重做（第一優先）

**目標**：讓每位武將有嚴格的「1 自帶 + 2 可學槽」，學習靠拆書，7 類戰法全部到位。  
**工作量**：L（這是最大一塊，也是後續所有系統的基礎）

#### M1-1 資料模型擴充

**改 `engine/src/types.ts`**：

1. `TacticType` 增加 `'formation'`（陣法類）、`'troop'`（兵種類）、`'domestic'`（內政類）：

```typescript
export type TacticType =
  | 'command'    // 指揮：開戰生效，持續整場，影響全隊
  | 'active'     // 主動：每回合機率觸發，主要輸出
  | 'passive'    // 被動：條件觸發（HP 門檻、友方死亡等）
  | 'assault'    // 突擊：普攻時附帶觸發
  | 'pursuit'    // 追擊：友方主動結算後觸發
  | 'formation'  // 陣法：開戰前結算，影響全隊陣形加成（新增）
  | 'troop'      // 兵種：裝備後改變武將適配兵種、給兵種加成（新增）
  | 'domestic'   // 內政：非戰場，影響城建/資源（新增）
  | 'innate';    // 自帶：不可拆，隨紅度成長
```

2. `Hero` 改為嚴格 2 可學槽：

```typescript
export interface Hero {
  id: string;
  name: string;
  faction: FactionId;       // 新增：陣營歸屬（為 M3 鋪路）
  rarity: Rarity;
  stats: HeroStats;
  redStars: number;
  aptitude: Record<TroopType, Aptitude>;
  innate: Tactic;
  learnedSlots: [Tactic | null, Tactic | null]; // 嚴格 2 槽，取代舊 tactics[]
}
```

3. 新增戰法書模型：

```typescript
export interface TacticBook {
  tacticId: string;   // 對應哪個戰法
  quantity: number;   // 數量（習得需 1 本，升級吃同名書）
}

export interface TacticLibrary {
  books: Record<string, TacticBook>; // tacticId → 書庫存
  learned: Record<string, number>;   // tacticId → 已習得等級（0=未習得）
}
```

4. 新增陣營 type（為 M3 鋪路，先定義不實作）：

```typescript
export type FactionId = 'wei' | 'shu' | 'wu' | 'qun';
export const FACTION_NAME: Record<FactionId, string> = {
  wei: '魏', shu: '蜀', wu: '吳', qun: '群',
};
```

#### M1-2 新增 `engine/src/tacticbook.ts`（拆書經濟）

純函式，負責：拆武將取戰法書、習得到可學槽、書升級。

```typescript
// 拆書：多餘武將（redStars 達上限或重複 5 紅後）可拆
// 拆 3★ 武將 → 其自帶戰法書 1 本（低品質）
// 拆 4★ 武將 → 其自帶戰法書 1 本（中品質）
// 拆 5★/6★ 武將 → 其自帶戰法書 2 本（高品質）
export function disassembleHero(
  hero: Hero,
  lib: TacticLibrary
): { lib: TacticLibrary; booksGained: TacticBook[] }

// 習得戰法：需 1 本對應書，寫入 learnedSlots[slotIdx]
export function learnTactic(
  hero: Hero,
  lib: TacticLibrary,
  tacticId: string,
  slotIdx: 0 | 1
): { ok: boolean; hero: Hero; lib: TacticLibrary; error?: string }

// 升級已習得戰法：吃同名書（Lv.1→10，每升 1 級需 (level) 本）
export function upgradeTactic(
  lib: TacticLibrary,
  tacticId: string
): { ok: boolean; lib: TacticLibrary; newLevel: number; error?: string }

// 查詢：某武將可習得但尚未習得的戰法列表
export function availableToLearn(
  hero: Hero,
  lib: TacticLibrary,
  allTactics: Tactic[]
): Tactic[]
```

**書庫初始化**：`newTacticLibrary(): TacticLibrary`

**不做**：付費購書、跨武將書交易（平衡 F2P，等商業決策）

#### M1-3 改 `engine/src/combat.ts`（接入 7 類戰法結算順序）

現有 `tacticsOf()` 需配合 Hero.learnedSlots 改寫：

```typescript
// 取得武將所有有效戰法（innate + learnedSlots 非 null 者）
function allTacticsOf(u: BattleUnit): Tactic[]

// 陣法類：開戰前結算（在現有 command 階段後、回合 1 前）
// 陣法加成效果：影響全隊武力/智力/統率 coefficient 修正
// 新增 phase: 'formation' 到 CombatEvent
```

結算順序（對齊真實遊戲）：

```
Pre-battle: formation（陣法，全隊係數修正）
Per-turn:
  1. command（指揮，持續 buff 刷新）
  2. passive（回合開始被動）
  3. active（主動，降速排序）+ pursuit（追擊，接在主動後）
  4. normal attack（普攻）+ assault（突擊，普攻時）
```

**兵種適性接入**：`computeDamage()` 補讀 `aptitude` 係數：

```typescript
// 適性修正：S=+10%, A=+5%, B=0%, C=-5%
const APTITUDE_MOD: Record<Aptitude, number> = { S: 1.10, A: 1.05, B: 1.0, C: 0.95 };
// 在 computeDamage 裡 modifier *= APTITUDE_MOD[attacker.aptitude[attacker.troopType]]
```

#### M1-4 改 `engine/src/sampleData.ts`

現有英雄從 `tactics: Tactic[]` 改成 `learnedSlots: [Tactic | null, Tactic | null]`，補齊 `faction` 欄位。

範例：
- 趙雲：`faction: 'shu'`，`learnedSlots: [genericActive, null]`（示範一槽有一槽空）
- 諸葛亮：`faction: 'shu'`，`learnedSlots: [null, null]`（需玩家自行學習）
- 呂布：`faction: 'qun'`，`learnedSlots: [genericActive, null]`

#### M1-5 UI 武將戰法配置頁（`web/src/`）

新增頁面 `TacticConfig.tsx`：

- 左側：武將卡（顯示 innate + 2 可學槽，空槽顯示「＋」按鈕）
- 右側：戰法書庫列表（分 7 類 tab 篩選）
- 點擊書 → 選擇放入哪個可學槽 → 呼叫 `learnTactic()`
- 顯示已學戰法等級，升級按鈕（有書才亮起）
- 拆書入口：武將名冊頁新增「拆解」按鈕，確認後呼叫 `disassembleHero()`

**注意**：web/src/engine 是 vendored 副本，engine/src 改完要**同步複製**到 web/src/engine。

#### M1 單元測試

新增 `engine/src/tacticbook.test.ts`：

1. 拆 3★ 武將得 1 本自帶書
2. 拆 6★ 武將得 2 本自帶書
3. 習得戰法成功寫入 slot 0
4. 習得戰法書不足時回傳 ok=false
5. 兩槽都滿時習得戰法回傳 error
6. 升級戰法消耗正確書數
7. 升級到 Lv.10 後拒絕再升

改 `engine/src/combat.test.ts`：

8. 陣法戰法在 pre-battle 生效，影響全隊係數
9. 兵種適性 S 武將傷害高於 C 武將（同兵種）
10. learnedSlots 中 null 不觸發

#### M1 CEO 親測驗收點

1. Chrome 打開武將配置頁，看到 2 個可學槽（空槽顯示「＋」）
2. 點擊一個戰法書（書庫需有初始書），選槽 0 習得，槽 0 顯示戰法名與等級
3. 槽 1 仍空，確認無法填入第 3 個戰法（無第 3 槽按鈕）
4. 拆解關平（4★）得到「搦戰」書 1 本
5. 打一場戰鬥，事件日誌出現 `phase: 'formation'` 事件（如有陣法戰法）
6. `npx vitest run` 全綠

---

### M2：行軍時間 SLG（第二優先）

**目標**：攻打地塊不再即時，改為「送出行軍令 → 等真實秒數到達 → 到達後結算戰鬥」。  
**工作量**：M

#### M2-1 新增 `engine/src/march.ts`

```typescript
export interface MarchOrder {
  id: string;               // 唯一 ID
  playerId: string;
  squadId: string;          // 哪支部隊
  from: Axial;              // 出發地塊
  to: Axial;                // 目標地塊
  departAt: number;         // Unix timestamp ms（送出時刻）
  arriveAt: number;         // 預計到達 timestamp
  status: 'marching' | 'arrived' | 'returning' | 'done';
}

// 計算行軍時間（單位 ms）
// 基礎時間：地塊距離 * BASE_MARCH_MS（建議 30000 = 30 秒/格）
// 可被同盟科技 marchSpeed 加速
export function calcMarchDuration(
  from: Axial,
  to: Axial,
  marchSpeedBonus: number  // % 加速
): number

// 發出行軍令（檢核 canMarch）
export function sendMarch(
  map: WorldMap,
  order: Omit<MarchOrder, 'id' | 'departAt' | 'arriveAt' | 'status'>,
  now: number,
  marchSpeedBonus: number
): { ok: boolean; order?: MarchOrder; error?: string }

// 檢查是否到達（供 server tick 呼叫）
export function checkArrival(order: MarchOrder, now: number): boolean

// 到達後執行戰鬥結算（呼叫 worldmap.captureTile）
export function resolveMarchArrival(
  map: WorldMap,
  playerSquad: Squad,
  order: MarchOrder,
  seed: number
): { map: WorldMap; outcome: TileBattleOutcome; order: MarchOrder }
```

**補兵時間**：新增 `troopRecruitDuration(amount: number): number`（建議 1000 ms/兵）

#### M2-2 改 `server/src/`（行軍狀態機）

- 維護 `marchOrders: Map<string, MarchOrder>` 的 server 狀態
- `setInterval` 每 5 秒跑 tick，呼叫 `checkArrival()` + `resolveMarchArrival()`
- WebSocket 事件：`march:send`、`march:arrived`、`march:result`
- **不使用 engine barrel index.ts**，直接 `import { sendMarch } from './march'`

#### M2-3 改 web UI

- 地圖格點擊：先顯示「行軍令確認框」（顯示預計到達時間）
- 部隊在途時地圖上顯示行軍動畫箭頭
- 倒計時 UI（`MarchCountdown.tsx`）
- 到達時 toast 通知 + 戰鬥結果彈窗

#### M2 單元測試

新增 `engine/src/march.test.ts`：

1. `calcMarchDuration` 距離 3 格 = 90000ms（基礎無加速）
2. 同盟加速 20% 後縮短為 72000ms
3. `sendMarch` 對非相鄰地塊回傳 ok=false
4. `checkArrival` 到達時間前回傳 false，後回傳 true
5. `resolveMarchArrival` 勝利後地塊 owner 變更

#### M2 CEO 親測驗收點

1. Chrome 點擊相鄰中立地塊，彈出行軍確認框，顯示「30 秒後到達」
2. 確認後部隊格顯示「行軍中」狀態，無法立即得到地塊
3. 等 30 秒後自動出現戰鬥結果通知，地塊翻面（若勝利）
4. 點擊非相鄰地塊，按鈕顯示 disabled 或提示「需先連地」
5. `npx vitest run` 全綠

---

### M3：陣營 + 兵種深化（第三優先）

**目標**：玩家選陣營、同陣營協作；兵種類戰法讓陣容有更多建構策略。  
**工作量**：M

#### M3-1 陣營系統（`engine/src/faction.ts`）

```typescript
export interface FactionState {
  factionId: FactionId;
  members: string[];              // playerId 列表
  capitalTiles: Partial<Record<StateId, string | null>>; // 州城控制者（playerId | null）
  buildings: Record<string, number>; // 陣營共建工程進度
}

// 玩家加入陣營（每人只能選一次，不可換）
export function joinFaction(
  state: FactionState,
  playerId: string
): FactionState

// 查某陣營佔領的州城數（賽季勝利條件之一）
export function factionCityCount(state: FactionState): number

// 陣營加成（依成員數 + 佔城數）
export function factionPerk(state: FactionState): { marchSpeed: number; troopBonus: number }
```

#### M3-2 兵種類戰法（`TacticType = 'troop'`，已在 M1 types 加入）

範例兵種類戰法資料（加入 sampleData.ts）：

```typescript
// 西涼鐵騎（兵種類）：裝備後主將可用騎兵，且騎兵傷害 +15%
const xiliangIronCavalry: Tactic = {
  id: 't_xiliang', name: '西涼鐵騎', type: 'troop',
  level: 1, triggerRate: 1.0, coefficient: 0,
  damageKind: 'physical', targets: 0,
  effects: [{ kind: 'buff', value: 15, target: 'self' }]
}
```

兵種類戰法效果在 `combat.ts` 的 pre-battle 階段讀取，修改 `troopMatchup()` 修正值。

#### M3-3 8 兵種擴充

`types.ts` 的 `TroopType` 補上：

```typescript
export type TroopType =
  | 'cavalry' | 'spear' | 'shield' | 'bow' | 'apparatus'
  | 'sword'       // 步兵/刀盾（新增）
  | 'elephant'    // 象兵（新增，南方特色）
  | 'navy';       // 水軍（新增，吳陣營特色）
```

相剋關係表更新（`COUNTERS` in combat.ts）。

#### M3 CEO 親測驗收點

1. Chrome Onboarding 步驟選陣營（魏蜀吳群），選後無法更改
2. 同陣營玩家地圖上標示同色
3. 武將配置頁可裝備兵種類戰法，UI 顯示「已轉換：騎兵」
4. 戰鬥日誌中含兵種加成事件

---

### M4：賽季目標整合（第四優先）

**目標**：把陣營爭奪州城/洛陽接入賽季結算，讓賽季有明確勝利條件。  
**工作量**：S（接前三個里程碑的成果）

- `season.ts` 的 `settleSeason()` 改讀陣營佔城數 + 洛陽控制者
- 同盟集結攻城：擴充 alliance.ts 的 `rallyAttack()`，允許多部隊同時攻同一城（行軍時間需同步，由 server 協調）
- 賽季結束公告（UI 彈窗）顯示四陣營排名

---

## 三、戰法系統重做詳細設計（M1 展開）

### 3.1 七類戰法對應設計

| 類型 | 真實遊戲描述 | 我們的設計 | 結算時機 |
|------|------------|-----------|---------|
| 指揮 (command) | 開戰持續生效，全隊 buff/debuff | 已有，擴充 effects 結構 | Pre-turn，持續整場 |
| 主動 (active) | 機率觸發，主要傷害來源 | 已有 | 每回合，降速排序 |
| 突擊 (assault) | 普攻時附帶觸發 | 已有 | 普攻後即觸發 |
| 被動 (passive) | 條件觸發（HP 門檻等） | 已有，需擴充觸發條件 | 回合開始/結束 |
| 追擊 (pursuit) | 友方主動後觸發 | 已有 | 友方主動結算後 |
| 陣法 (formation) | 開戰前陣形設置，影響全隊係數 | **新增**，pre-battle 結算 | 第 0 回合，一次性 |
| 兵種 (troop) | 換兵種 + 兵種特化加成 | **新增**，裝備即生效 | Pre-battle 讀取 |
| 內政 (domestic) | 影響城建/資源速率，非戰場 | **新增**，接 city.ts 的 produce() | 每次 produce() tick |

注意：`innate` 自帶戰法不是獨立的「類型」，它可以是上述任何類型，只是「不可拆卸、隨紅度成長」的標記。目前用獨立 type 區分是可接受的設計，但長期應改為 `Hero.innate: Tactic`（type 為上述 7 類之一）+ `isInnate: true` flag。M1 暫維持現有 innate 設計，僅添加 formation/troop/domestic 三類。

### 3.2 拆書經濟模型

```
武將獲取路徑：抽卡（gacha）→ 招募池
重複武將處理：紅度 1→5（每重複 +1 紅，第 6 次以後可拆）

拆書數量：
- 3★ 武將 → 其 innate 戰法書 × 1
- 4★ 武將 → 其 innate 戰法書 × 1  
- 5★ 武將 → 其 innate 戰法書 × 2
- 6★ 武將 → 其 innate 戰法書 × 3 + 隨機同系列書 × 1

習得成本（寫入可學槽）：
- 任何等級戰法：消耗 1 本對應書

升級成本：
- Lv.1→2：同名書 × 2
- Lv.2→3：同名書 × 3
- ...
- Lv.(n)→(n+1)：同名書 × (n+1)
- Lv.10 封頂，總計需 1+2+...+10 = 55 本（長期目標）

初始書庫（新玩家）：
- 新手禮包給「突陣」書 × 2（示範主動類戰法）
- 選賢主（豪主類型）額外給戰法點 300，可在戰法商店兌換低星書
```

### 3.3 武將戰法配置 UI 設計規格

```
武將詳情頁 (HeroDetail.tsx) 新增 tab「戰法配置」：

┌─────────────────────────────────────┐
│  趙雲 ★6  蜀  騎兵S                │
│                                     │
│  [自帶] 龍膽 Lv.3  [物理][追擊]    │
│         不可更換                    │
│                                     │
│  [可學1] 突陣 Lv.2  [物理][主動]   │
│           [更換] [升級]             │
│                                     │
│  [可學2] + 空槽                     │
│           [學習戰法]                │
│                                     │
│  書庫：突陣 ×3 | 龍膽 ×0 | ...    │
└─────────────────────────────────────┘

書庫列表 (TacticBookList.tsx)：
- 7 類 tab 篩選（指揮/主動/突擊/被動/追擊/陣法/兵種）
- 每格：戰法名、類型標籤、現有書數、「習得」按鈕（灰色=書不足）
- 習得確認彈窗：「將消耗 [戰法名] 書 ×1，確認？」
```

---

## 四、技術風險清單

| 風險 | 描述 | 對應措施 |
|------|------|---------|
| **W1 Hero 型別破壞性變更** | `tactics: Tactic[]` → `learnedSlots: [Tactic\|null, Tactic\|null]` 是 breaking change，影響 sampleData/combat/server | M1 第一步改 types.ts，立即跑全套 vitest，確保測試全紅後再逐一修復。engine 和 web/src/engine 要同步更改 |
| **W2 vendored engine 雙份維護** | engine/src 改完必須同步 web/src/engine，容易漏 | 在 M1 commit 後加一個 `scripts/sync-engine.sh`（cp engine/src/*.ts web/src/engine/）並加入 pre-push hook |
| **W3 server 行軍 setInterval tick** | 多人同時行軍時 tick 積壓、順序競爭 | M2 先做單人行軍驗收，多人 tick 合并用 sorted queue + 同一 playerId 序列執行 |
| **W4 行軍時間在 unit test 難模擬** | `now` timestamp 在純函式測試要手動注入 | march.ts 所有時間計算都接受 `now: number` 參數（已在設計中），測試傳固定時間 |
| **W5 陣法戰法結算順序** | 陣法在 pre-battle 生效，現有 CombatEvent 的 turn:0 phase:command 要拆分 | M3 前先在 M1 把 turn:0 拆成 turn:0 phase:formation（先）+ phase:command（後） |

---

## 五、里程碑摘要表

| 里程碑 | 核心交付 | 工作量 | 依賴 |
|--------|---------|-------|------|
| M1 戰法 Deck | types 改造 + tacticbook.ts + combat 7 類 + UI 配置頁 | L | 無 |
| M2 行軍時間 | march.ts + server tick + UI 倒計時 | M | M1（需先穩定型別） |
| M3 陣營+兵種 | faction.ts + troop tactic + 8 兵種 | M | M1 |
| M4 賽季整合 | 陣營勝利條件 + 同盟集結 | S | M2 + M3 |

---

## 六、一次讀懂：關鍵接線圖

```
抽卡(gacha) ──拆書──> TacticLibrary
                          │
                          ▼
                   learnTactic()
                          │
                          ▼
              Hero.learnedSlots[0,1]
                          │
              ┌───────────┴────────────┐
              ▼                        ▼
        combat.ts                  city.ts
  (formation→command→              produce()
   passive→active+pursuit    (domestic tactic 加成)
   →attack+assault)
              │
              ▼
       BattleResult
              │
     ┌────────┴────────┐
     ▼                  ▼
campaign.ts          march.ts
 (打地 8 關)      (行軍時間 SLG)
                         │
                         ▼
                   worldmap.captureTile()
                         │
                         ▼
                   faction.ts（陣營佔城）
                         │
                         ▼
                   season.ts（賽季結算）
```

---

*本文件供 CEO 親審，審核通過後派 CTO 執行 M1。*
