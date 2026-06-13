import { describe, it, expect } from 'vitest';
import {
  LORD_DEF, QUIZ, quizReward, newLordProfile, lordStartBonus, birthStates,
  TUTORIAL_QUESTS, ITEM_NAME, type ItemType,
} from './onboarding';

describe('onboarding — 新手引導 (§4)', () => {
  it('§4.1 三種主公各有加成', () => {
    expect(LORD_DEF.sage.bonus.silver).toBeGreaterThan(0);
    expect(LORD_DEF.hero.bonus.tacticPoints).toBeGreaterThan(0);
    expect(LORD_DEF.wise.bonus.gear).toBeGreaterThan(0);
  });

  it('§4.2 問答 5 題、每題 4 選項對應道具', () => {
    expect(QUIZ).toHaveLength(5);
    for (const q of QUIZ) {
      expect(q.options).toHaveLength(4);
      expect(q.options.map((o) => o.item).sort()).toEqual(['armor', 'mount', 'treasure', 'weapon']);
    }
  });

  it('§4.2 結算 2 件起始道具：取選最多的兩種', () => {
    const answers: ItemType[] = ['treasure', 'treasure', 'mount', 'mount', 'weapon'];
    const reward = quizReward(answers);
    expect(reward).toHaveLength(2);
    expect(reward).toContain('treasure');
    expect(reward).toContain('mount');
  });

  it('§4.2 全選同一種仍只給 2 件（含次選序）', () => {
    const reward = quizReward(['weapon', 'weapon', 'weapon', 'weapon', 'weapon']);
    expect(reward[0]).toBe('weapon');
    expect(reward).toHaveLength(2);
    expect(ITEM_NAME[reward[1]]).toBeTruthy();
  });

  it('§4.1 出生州不含司隸（洛陽中心）', () => {
    expect(birthStates()).not.toContain('si');
    expect(birthStates().length).toBeGreaterThan(0);
  });

  it('§4.1 主公檔案起始加成 = 類型加成 + 道具件數計入裝備', () => {
    const p = newLordProfile('wise', 'jing', '#c0392b', '龍', ['treasure', 'mount']);
    const b = lordStartBonus(p);
    expect(b.gear).toBe(LORD_DEF.wise.bonus.gear + 2); // 智主 +1 裝備 + 2 道具
    expect(p.items).toHaveLength(2);
  });

  it('§4.1 道具超過 2 件被截斷', () => {
    const p = newLordProfile('sage', 'yang', '#2980b9', '虎', ['weapon', 'armor', 'treasure'] as ItemType[]);
    expect(p.items).toHaveLength(2);
  });

  it('§4.3 新手任務序列含攻地/城建/裝備/兵營/同盟', () => {
    const ids = TUTORIAL_QUESTS.map((q) => q.id);
    expect(ids).toEqual(['capture1', 'build4', 'equipHero', 'barracks3', 'joinAlliance']);
  });
});
