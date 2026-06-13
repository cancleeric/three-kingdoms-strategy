import { describe, it, expect } from 'vitest';
import { serializeCampaign, deserializeCampaign, SAVE_VERSION } from './save';
import type { CampaignState } from './save';
import { ROSTER } from './sampleData';
import { newCity } from './city';

const sample = (): CampaignState => ({
  formation: [{ id: 'zhaoyun', troop: 'cavalry' }, { id: 'lubu', troop: 'spear' }],
  commander: { hero: ROSTER[0], level: 12, xp: 30 },
  city: newCity(),
  tileIdx: 3,
  seedCtr: 7,
});

describe('save — 存檔序列化 (§13.3)', () => {
  it('序列化存武將 id 不存完整物件', () => {
    const s = serializeCampaign(sample());
    expect(s.commanderId).toBe('zhaoyun');
    expect(s.v).toBe(SAVE_VERSION);
    expect(s.tileIdx).toBe(3);
  });

  it('round-trip 還原一致', () => {
    const orig = sample();
    const restored = deserializeCampaign(serializeCampaign(orig), ROSTER);
    expect(restored).not.toBeNull();
    expect(restored!.commander.level).toBe(12);
    expect(restored!.commander.hero.id).toBe('zhaoyun');
    expect(restored!.formation).toEqual(orig.formation);
    expect(restored!.tileIdx).toBe(3);
  });

  it('JSON 可序列化（localStorage 相容）', () => {
    const s = serializeCampaign(sample());
    const json = JSON.stringify(s);
    const back = deserializeCampaign(JSON.parse(json), ROSTER);
    expect(back!.seedCtr).toBe(7);
  });

  it('版本不符回 null', () => {
    const s = serializeCampaign(sample());
    expect(deserializeCampaign({ ...s, v: 999 }, ROSTER)).toBeNull();
  });

  it('武將 id 不存在回 null', () => {
    const s = serializeCampaign(sample());
    expect(deserializeCampaign({ ...s, commanderId: 'nobody' }, ROSTER)).toBeNull();
  });
});
