import { describe, it, expect } from 'vitest';
import {
  newFactionStates,
  joinFaction,
  factionCityCount,
  factionPerk,
  setCapital,
  contributeBuilding,
} from './faction';

describe('newFactionStates', () => {
  it('初始化 4 陣營，各自 members 為空', () => {
    const states = newFactionStates();
    expect(Object.keys(states)).toHaveLength(4);
    expect(states.wei.members).toHaveLength(0);
    expect(states.shu.members).toHaveLength(0);
    expect(states.wu.members).toHaveLength(0);
    expect(states.qun.members).toHaveLength(0);
  });
});

describe('joinFaction', () => {
  it('玩家加入陣營後出現在 members', () => {
    const state = newFactionStates().shu;
    const next = joinFaction(state, 'player1');
    expect(next.members).toContain('player1');
  });

  it('重複加入同陣營不會出現兩次（幂等）', () => {
    const state = newFactionStates().shu;
    const s1 = joinFaction(state, 'player1');
    const s2 = joinFaction(s1, 'player1');
    expect(s2.members.filter((m) => m === 'player1')).toHaveLength(1);
  });

  it('多玩家可加入同一陣營', () => {
    let state = newFactionStates().wei;
    state = joinFaction(state, 'playerA');
    state = joinFaction(state, 'playerB');
    expect(state.members).toHaveLength(2);
  });

  it('不修改原始 state（純函式）', () => {
    const state = newFactionStates().wu;
    const original = [...state.members];
    joinFaction(state, 'player1');
    expect(state.members).toEqual(original);
  });
});

describe('factionCityCount', () => {
  it('無佔城時為 0', () => {
    const state = newFactionStates().shu;
    expect(factionCityCount(state)).toBe(0);
  });

  it('陣營成員佔城計入', () => {
    let state = newFactionStates().shu;
    state = joinFaction(state, 'player1');
    state = setCapital(state, 'yi', 'player1');
    state = setCapital(state, 'jing', 'player1');
    expect(factionCityCount(state)).toBe(2);
  });

  it('非陣營成員佔城不計入', () => {
    let state = newFactionStates().shu;
    state = joinFaction(state, 'player1');
    // player2 不是蜀成員，佔了 yi 不算蜀的佔城
    state = setCapital(state, 'yi', 'player2');
    state = setCapital(state, 'jing', 'player1'); // player1 是蜀成員
    expect(factionCityCount(state)).toBe(1);
  });

  it('null 佔城（中立）不計入', () => {
    let state = newFactionStates().wei;
    state = joinFaction(state, 'player1');
    state = setCapital(state, 'ji', null); // 佔領後被清空
    expect(factionCityCount(state)).toBe(0);
  });
});

describe('factionPerk', () => {
  it('無成員無佔城 → marchSpeed=0, troopBonus=0', () => {
    const state = newFactionStates().qun;
    const perk = factionPerk(state);
    expect(perk.marchSpeed).toBe(0);
    expect(perk.troopBonus).toBe(0);
  });

  it('6 成員 + 2 佔城 → marchSpeed = min(15, 2+4)=6', () => {
    let state = newFactionStates().wei;
    for (let i = 0; i < 6; i++) state = joinFaction(state, `p${i}`);
    state = joinFaction(state, 'pA');
    // 讓 p0, p1 佔城
    state = setCapital(state, 'ji', 'p0');
    state = setCapital(state, 'yan', 'p1');
    const perk = factionPerk(state);
    // memberCount=7 → floor(7/3)=2, cityCount=2 → marchSpeed=2+4=6
    expect(perk.marchSpeed).toBe(6);
    // troopBonus = 2*3 = 6
    expect(perk.troopBonus).toBe(6);
  });

  it('marchSpeed 上限 15%', () => {
    let state = newFactionStates().wu;
    // 加 30 成員
    for (let i = 0; i < 30; i++) state = joinFaction(state, `p${i}`);
    // 佔 10 州城（StateId 用 10 個）
    const stateIds = ['si', 'yu', 'ji', 'yan', 'qing', 'xu', 'jing', 'yang', 'yi', 'liang'] as const;
    for (const sid of stateIds) state = setCapital(state, sid, 'p0');
    const perk = factionPerk(state);
    expect(perk.marchSpeed).toBe(15);
    expect(perk.troopBonus).toBe(15);
  });
});

describe('contributeBuilding', () => {
  it('初次貢獻設定進度', () => {
    let state = newFactionStates().shu;
    state = contributeBuilding(state, 'luoyang', 100);
    expect(state.buildings['luoyang']).toBe(100);
  });

  it('多次貢獻累加', () => {
    let state = newFactionStates().shu;
    state = contributeBuilding(state, 'luoyang', 100);
    state = contributeBuilding(state, 'luoyang', 200);
    expect(state.buildings['luoyang']).toBe(300);
  });
});
