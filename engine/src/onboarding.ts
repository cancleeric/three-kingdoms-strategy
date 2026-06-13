/**
 * Three Kingdoms Strategy — 新手引導（§4 Player Onboarding）
 *
 * §4.1 主公創建（主公類型加成 / 出生州 / 旗幟）、§4.2 賢者問答（5 題 → 2 件起始道具，可重抽）、
 * §4.3 新手任務（引導序列）。純資料 + 純函式，可單元測試。
 */
import { STATES, STATE_NAME, type StateId } from './worldmap';

// ── §4.1 主公類型 ───────────────────────────────────────────────
export type LordType = 'sage' | 'hero' | 'wise';
export interface LordDef { id: LordType; name: string; perk: string; bonus: { silver: number; tacticPoints: number; gear: number }; }
export const LORD_DEF: Record<LordType, LordDef> = {
  sage: { id: 'sage', name: '賢主', perk: '+銀錢', bonus: { silver: 1500, tacticPoints: 0, gear: 0 } },
  hero: { id: 'hero', name: '豪主', perk: '+戰法點', bonus: { silver: 0, tacticPoints: 300, gear: 0 } },
  wise: { id: 'wise', name: '智主', perk: '+裝備', bonus: { silver: 0, tacticPoints: 0, gear: 1 } },
};
export const BANNER_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d4a017', '#16a085'] as const;
export const SIGILS = ['龍', '虎', '鳳', '麟', '熊', '鷹'] as const;

// ── §4.2 賢者問答 ───────────────────────────────────────────────
export type ItemType = 'weapon' | 'armor' | 'treasure' | 'mount';
export const ITEM_NAME: Record<ItemType, string> = { weapon: '兵器', armor: '甲冑', treasure: '珍寶', mount: '坐騎' };
export interface QuizOption { text: string; item: ItemType; }
export interface QuizQuestion { id: number; q: string; options: QuizOption[]; }
export const QUIZ: QuizQuestion[] = [
  { id: 1, q: '初入亂世，你最想先掌握什麼？', options: [
    { text: '一柄稱手的利器', item: 'weapon' }, { text: '一副堅實的護甲', item: 'armor' },
    { text: '一件傳世珍寶', item: 'treasure' }, { text: '一匹千里良駒', item: 'mount' } ] },
  { id: 2, q: '面對強敵，你的取勝之道是？', options: [
    { text: '正面強攻', item: 'weapon' }, { text: '固守反擊', item: 'armor' },
    { text: '奇謀製勝', item: 'treasure' }, { text: '迂迴突襲', item: 'mount' } ] },
  { id: 3, q: '行軍途中拾得寶箱，你期望開出？', options: [
    { text: '神兵', item: 'weapon' }, { text: '寶鎧', item: 'armor' },
    { text: '玉璧', item: 'treasure' }, { text: '寶馬', item: 'mount' } ] },
  { id: 4, q: '你心中的名將典範是？', options: [
    { text: '勇冠三軍的呂布', item: 'weapon' }, { text: '堅不可摧的曹仁', item: 'armor' },
    { text: '運籌帷幄的諸葛', item: 'treasure' }, { text: '神出鬼沒的趙雲', item: 'mount' } ] },
  { id: 5, q: '若得一願，你求？', options: [
    { text: '無雙武力', item: 'weapon' }, { text: '金城湯池', item: 'armor' },
    { text: '經天緯地', item: 'treasure' }, { text: '日行千里', item: 'mount' } ] },
];

/** §4.2 依 5 題作答結算 2 件起始道具：取被選最多的兩種道具類型（平手依固定序）。 */
export function quizReward(answers: ItemType[]): ItemType[] {
  const order: ItemType[] = ['weapon', 'armor', 'treasure', 'mount'];
  const count: Record<ItemType, number> = { weapon: 0, armor: 0, treasure: 0, mount: 0 };
  for (const a of answers) count[a] += 1;
  return [...order].sort((x, y) => count[y] - count[x] || order.indexOf(x) - order.indexOf(y)).slice(0, 2);
}

// ── §4.1 主公檔案 ───────────────────────────────────────────────
export interface LordProfile {
  type: LordType;
  birthState: StateId;
  bannerColor: string;
  sigil: string;
  items: ItemType[]; // §4.2 起始道具（2 件）
}
export function newLordProfile(type: LordType, birthState: StateId, bannerColor: string, sigil: string, items: ItemType[]): LordProfile {
  return { type, birthState, bannerColor, sigil, items: items.slice(0, 2) };
}

/** 主公起始加成（§4.1 主公類型 + §4.2 道具件數計入裝備）。 */
export function lordStartBonus(p: LordProfile): { silver: number; tacticPoints: number; gear: number } {
  const b = LORD_DEF[p.type].bonus;
  return { silver: b.silver, tacticPoints: b.tacticPoints, gear: b.gear + p.items.length };
}

// ── §4.3 新手任務 ───────────────────────────────────────────────
export interface TutorialQuest { id: string; title: string; reward: string; }
export const TUTORIAL_QUESTS: TutorialQuest[] = [
  { id: 'capture1', title: '攻佔第一塊 Lv.1 地塊', reward: '銀 100' },
  { id: 'build4', title: '興建農田 / 伐木場 / 採石場 / 鐵爐', reward: '木石各 200' },
  { id: 'equipHero', title: '裝備並編入主將關平', reward: '戰法點 50' },
  { id: 'barracks3', title: '兵營升至 Lv.3', reward: '帶兵量提升' },
  { id: 'joinAlliance', title: '加入一個同盟', reward: '盟禮 銀 300' },
];

export const birthStates = (): StateId[] => STATES.filter((s) => s !== 'si'); // 司隸=洛陽中心，不可出生
export const stateName = (s: StateId): string => STATE_NAME[s];
