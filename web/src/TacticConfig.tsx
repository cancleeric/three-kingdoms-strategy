/**
 * TacticConfig.tsx — 武將戰法配置頁（M1-5）
 *
 * 功能：
 *  - 顯示武將的自帶戰法（innate，不可更換）
 *  - 顯示 2 個可學槽（空槽顯示「＋ 學習」）
 *  - 書庫列表（7 類 tab 篩選）
 *  - 習得/升級按鈕（有書才亮起）
 *  - 拆解武將入口（確認後呼叫 disassembleHero）
 */

import { useEffect, useState } from 'react';
import { loadTacticConfig, saveTacticConfig } from './tacticStore';
import { loadAdvancement, setAdvanceLevel } from './advancementStore';
import { advanceCost, advancementBonus, ADVANCE_MAX } from './engine';
import type { Hero, Tactic, TacticLibrary, TacticType } from './engine/types';
import {
  ROSTER, RECRUIT_POOL,
  genericActive, tacticFormation, tacticTroopCav,
} from './engine/sampleData';
import {
  disassembleHero,
  learnTactic,
  upgradeTactic,
  availableToLearn,
} from './engine/tacticbook';
import { FACTION_NAME } from './engine/types';

// ── 所有戰法目錄（書庫可習得來源）──────────────────────────────
// = 範例可學戰法 + 全武將自帶戰法（拆書取得的書才看得到、學得到）。依 id 去重。
const ALL_TACTICS: Tactic[] = (() => {
  const seed: Tactic[] = [genericActive, tacticFormation, tacticTroopCav];
  const innates = [...ROSTER, ...RECRUIT_POOL].map((h) => h.innate);
  const byId = new Map<string, Tactic>();
  for (const t of [...seed, ...innates]) if (!byId.has(t.id)) byId.set(t.id, t);
  return [...byId.values()];
})();

// ── 兵種適性 label ────────────────────────────────────────────
const APTITUDE_LABEL: Record<string, string> = {
  cavalry: '騎兵', spear: '槍兵', shield: '盾兵', bow: '弓兵', apparatus: '器械',
};

// ── 戰法類型 label ────────────────────────────────────────────
const TACTIC_TYPE_LABEL: Record<TacticType, string> = {
  command: '指揮', active: '主動', passive: '被動',
  assault: '突擊', pursuit: '追擊',
  formation: '陣法', troop: '兵種', domestic: '內政', innate: '自帶',
};

const TACTIC_TYPES_LEARNABLE: TacticType[] = ['command', 'active', 'passive', 'assault', 'pursuit', 'formation', 'troop'];

// ── 初始書庫（示範：給 genericActive 書 2 本，tacticFormation 書 1 本）──
const INITIAL_LIBRARY: TacticLibrary = {
  books: {
    [genericActive.id]: { tacticId: genericActive.id, quantity: 2 },
    [tacticFormation.id]: { tacticId: tacticFormation.id, quantity: 1 },
  },
  learned: {},
};

const HERO_NAME: Record<string, string> = {
  zhaoyun: '趙雲', lubu: '呂布', zhuge: '諸葛亮',
  luxun: '陸遜', zhouyu: '周瑜', guanping: '關平',
  huanggai: '黃蓋', lidian: '李典', zhoucang: '周倉',
};
const nameOf = (id: string) => HERO_NAME[id] ?? id;

// ── 樣式常量 ──────────────────────────────────────────────────
const style = {
  wrap: { padding: '16px', maxWidth: 900, margin: '0 auto', fontFamily: 'inherit' } as React.CSSProperties,
  panel: { background: '#2a1f14', border: '1px solid #5a4a32', borderRadius: 10, padding: 14, marginBottom: 14 } as React.CSSProperties,
  row: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 } as React.CSSProperties,
  tag: (color: string) => ({ background: color, color: '#fff', borderRadius: 4, padding: '2px 6px', fontSize: 12, fontWeight: 600 }) as React.CSSProperties,
  btn: (enabled: boolean) => ({
    background: enabled ? '#8b6914' : '#444',
    border: 'none', color: enabled ? '#fff' : '#888',
    borderRadius: 6, padding: '5px 12px', cursor: enabled ? 'pointer' : 'not-allowed', fontSize: 13,
  }) as React.CSSProperties,
  slotBox: { border: '1px dashed #6a5a3a', borderRadius: 8, padding: '10px 14px', minWidth: 180, background: '#1e1510' } as React.CSSProperties,
};

const TYPE_COLOR: Partial<Record<TacticType, string>> = {
  command: '#2a6a9a', active: '#9a3a2a', passive: '#3a7a3a',
  assault: '#9a6a2a', pursuit: '#6a3a9a', formation: '#2a7a7a',
  troop: '#7a6a2a', domestic: '#5a7a3a', innate: '#6a3a2a',
};

// ── 武將卡：顯示 innate + 2 可學槽 ──────────────────────────────
function HeroTacticCard({
  hero,
  lib,
  advanceLevel,
  onAdvance,
  onLearnSlot,
  onUpgrade,
  onClearSlot,
}: {
  hero: Hero;
  lib: TacticLibrary;
  advanceLevel: number;
  onAdvance: () => void;
  onLearnSlot: (slotIdx: 0 | 1) => void;
  onUpgrade: (tacticId: string) => void;
  onClearSlot: (slotIdx: 0 | 1) => void;
}) {
  const bestAptitude = Object.entries(hero.aptitude).find(([, v]) => v === 'S');
  const advCost = advanceCost(advanceLevel);

  return (
    <div style={style.panel}>
      <div style={{ ...style.row, marginBottom: 12 }}>
        <span style={{ fontSize: 18, fontWeight: 700 }}>{nameOf(hero.id)}</span>
        <span style={style.tag('#8b6914')}>{'★'.repeat(hero.rarity)}</span>
        <span style={style.tag('#2a6a4a')}>{FACTION_NAME[hero.faction]}</span>
        {bestAptitude && (
          <span style={style.tag('#6a3a6a')}>{APTITUDE_LABEL[bestAptitude[0]]} S</span>
        )}
      </div>

      {/* M5-4 進階／突破 */}
      <div style={{ ...style.row, marginBottom: 10, gap: 10 }}>
        <span style={{ fontSize: 13, color: '#8a7a5a' }}>進階</span>
        <span>{'◆'.repeat(advanceLevel)}{'◇'.repeat(ADVANCE_MAX - advanceLevel)}</span>
        <span style={{ color: 'var(--gold)', fontSize: 13 }}>（全屬性 +{Math.round(advancementBonus(advanceLevel) * 100)}%）</span>
        <button onClick={onAdvance} disabled={advCost === null}
          style={{ padding: '3px 12px', background: advCost === null ? '#333' : '#7a5c12', color: '#fff', border: 'none', borderRadius: 4, cursor: advCost === null ? 'not-allowed' : 'pointer', fontSize: 12 }}>
          {advCost === null ? '已滿階' : `進階（銀 ${advCost}）`}
        </button>
      </div>

      {/* 自帶戰法 */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 12, color: '#8a7a5a', marginBottom: 4 }}>自帶戰法（不可更換）</div>
        <div style={{ ...style.slotBox, borderStyle: 'solid', borderColor: '#6a3a2a' }}>
          <span style={style.tag(TYPE_COLOR[hero.innate.type] ?? '#555')}>{TACTIC_TYPE_LABEL[hero.innate.type]}</span>
          {' '}<b>{hero.innate.name}</b>
          <span style={{ color: '#8a7a5a', marginLeft: 8, fontSize: 13 }}>Lv.{hero.innate.level}</span>
        </div>
      </div>

      {/* 2 可學槽 */}
      <div style={{ fontSize: 12, color: '#8a7a5a', marginBottom: 4 }}>可學槽（最多 2 槽）</div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {([0, 1] as (0 | 1)[]).map((slotIdx) => {
          const tactic = hero.learnedSlots[slotIdx];
          const curLevel = tactic ? (lib.learned[tactic.id] ?? 1) : 0;
          const upgradeCost = curLevel > 0 && curLevel < 10 ? curLevel + 1 : 0;
          const canUpgrade = tactic !== null && upgradeCost > 0
            && (lib.books[tactic.id]?.quantity ?? 0) >= upgradeCost;

          return (
            <div key={slotIdx} style={style.slotBox}>
              <div style={{ fontSize: 12, color: '#8a7a5a', marginBottom: 6 }}>可學槽 {slotIdx + 1}</div>
              {tactic ? (
                <>
                  <div style={style.row}>
                    <span style={style.tag(TYPE_COLOR[tactic.type] ?? '#555')}>{TACTIC_TYPE_LABEL[tactic.type]}</span>
                    <b>{tactic.name}</b>
                    <span style={{ color: '#8a7a5a', fontSize: 13 }}>Lv.{curLevel}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={style.btn(canUpgrade)} onClick={() => canUpgrade && onUpgrade(tactic.id)} disabled={!canUpgrade}>
                      升級（需 {upgradeCost} 本）
                    </button>
                    <button style={style.btn(true)} onClick={() => onClearSlot(slotIdx)}>
                      移除
                    </button>
                  </div>
                  {upgradeCost > 0 && (
                    <div style={{ fontSize: 12, color: '#8a7a5a', marginTop: 4 }}>
                      書庫：{tactic.name} × {lib.books[tactic.id]?.quantity ?? 0}
                    </div>
                  )}
                </>
              ) : (
                <button style={style.btn(true)} onClick={() => onLearnSlot(slotIdx)}>
                  ＋ 學習
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 書庫列表（7 類 tab 篩選）────────────────────────────────────
function TacticBookList({
  lib,
  hero,
  activeSlot,
  onLearn,
}: {
  lib: TacticLibrary;
  hero: Hero;
  activeSlot: 0 | 1 | null;
  onLearn: (tacticId: string, slotIdx: 0 | 1) => void;
}) {
  const [filterType, setFilterType] = useState<TacticType | 'all'>('all');

  const available = availableToLearn(hero, lib, ALL_TACTICS);

  return (
    <div style={style.panel}>
      <div style={{ marginBottom: 10, fontWeight: 600 }}>書庫列表
        {activeSlot !== null && <span style={{ color: '#c9a227', marginLeft: 8, fontSize: 13 }}>— 選擇戰法放入可學槽 {activeSlot + 1}</span>}
      </div>

      {/* 類型 tab */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        {(['all', ...TACTIC_TYPES_LEARNABLE] as ('all' | TacticType)[]).map((type) => (
          <button
            key={type}
            style={{
              ...style.btn(true),
              background: filterType === type ? '#c9a227' : '#3a2e1e',
              color: filterType === type ? '#1a1410' : 'var(--ink, #c0a870)',
              padding: '4px 10px',
            }}
            onClick={() => setFilterType(type)}
          >
            {type === 'all' ? '全部' : TACTIC_TYPE_LABEL[type]}
          </button>
        ))}
      </div>

      {/* 戰法列表 */}
      {ALL_TACTICS
        .filter((t) => (filterType === 'all' || t.type === filterType))
        .map((t) => {
          const qty = lib.books[t.id]?.quantity ?? 0;
          const isAvailable = available.some((a) => a.id === t.id);
          const canLearn = qty > 0 && isAvailable && activeSlot !== null;

          return (
            <div key={t.id} style={{ ...style.row, padding: '8px 10px', background: '#1e1510', borderRadius: 6, marginBottom: 6 }}>
              <span style={style.tag(TYPE_COLOR[t.type] ?? '#555')}>{TACTIC_TYPE_LABEL[t.type]}</span>
              <b style={{ flex: 1 }}>{t.name}</b>
              <span style={{ color: qty > 0 ? '#c9a227' : '#666', fontSize: 13 }}>× {qty}</span>
              {activeSlot !== null && (
                <button
                  style={style.btn(canLearn)}
                  disabled={!canLearn}
                  onClick={() => canLearn && onLearn(t.id, activeSlot)}
                >
                  習得（消耗 1 本）
                </button>
              )}
            </div>
          );
        })}

      {ALL_TACTICS.filter((t) => (filterType === 'all' || t.type === filterType)).length === 0 && (
        <div style={{ color: '#666', fontSize: 13 }}>此類型無戰法資料</div>
      )}
    </div>
  );
}

// ── 拆解武將面板 ─────────────────────────────────────────────
function DisassemblePanel({
  onDisassemble,
}: {
  onDisassemble: (hero: Hero) => void;
}) {
  const [confirm, setConfirm] = useState<Hero | null>(null);

  return (
    <div style={style.panel}>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>拆解武將（取得自帶戰法書）</div>
      <div style={{ color: '#8a7a5a', fontSize: 13, marginBottom: 10 }}>
        3★/4★→書 ×1　5★→書 ×2　6★→書 ×3
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {RECRUIT_POOL.map((hero) => {
          const isConfirming = confirm?.id === hero.id;
          return (
            <div key={hero.id} style={{ background: '#1e1510', border: '1px solid #5a4a32', borderRadius: 8, padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>{nameOf(hero.id)}</span>
              <span style={style.tag('#5a3a1a')}>{'★'.repeat(hero.rarity)}</span>
              <span style={{ fontSize: 12, color: '#8a7a5a' }}>{hero.innate.name}</span>
              {isConfirming ? (
                <>
                  <button style={style.btn(true)} onClick={() => { onDisassemble(hero); setConfirm(null); }}>確認拆解</button>
                  <button style={style.btn(true)} onClick={() => setConfirm(null)}>取消</button>
                </>
              ) : (
                <button style={style.btn(true)} onClick={() => setConfirm(hero)}>拆解</button>
              )}
            </div>
          );
        })}
      </div>
      {confirm && (
        <div style={{ color: '#c9a227', marginTop: 8, fontSize: 13 }}>
          拆解 {nameOf(confirm.id)}（{confirm.rarity}★）將獲得「{confirm.innate.name}」書 × {confirm.rarity <= 4 ? 1 : confirm.rarity === 5 ? 2 : 3}
        </div>
      )}
    </div>
  );
}

// ── 主元件 ──────────────────────────────────────────────────
export default function TacticConfig() {
  const [selectedHeroId, setSelectedHeroId] = useState<string>(ROSTER[0].id);
  // M1.5：從 localStorage 還原已配置的可學槽 + 書庫（無則用預設）
  const [heroStates, setHeroStates] = useState<Record<string, Hero>>(() => {
    const cfg = loadTacticConfig();
    return Object.fromEntries(ROSTER.map((h) => {
      const slots = cfg?.slots[h.id];
      return [h.id, slots ? { ...h, learnedSlots: [slots[0] ?? null, slots[1] ?? null] as [Tactic | null, Tactic | null] } : h];
    }));
  });
  const [lib, setLib] = useState<TacticLibrary>(() => loadTacticConfig()?.library ?? INITIAL_LIBRARY);
  const [activeSlot, setActiveSlot] = useState<0 | 1 | null>(null);
  const [message, setMessage] = useState<string>('');
  // M5-4 進階等級（heroId → level，持久化於 advancementStore）
  const [advancement, setAdvancement] = useState<Record<string, number>>(() => loadAdvancement());

  // M1.5：配置任一變動即持久化，讓打地戰役/沙盒/PvP 實戰吃到
  useEffect(() => {
    const slots: Record<string, (Tactic | null)[]> = {};
    for (const [id, h] of Object.entries(heroStates)) slots[id] = h.learnedSlots;
    saveTacticConfig({ slots, library: lib });
  }, [heroStates, lib]);

  const hero = heroStates[selectedHeroId] ?? ROSTER[0];

  // M5-4：進階（提升等級並持久化）
  const handleAdvance = () => {
    const cur = advancement[hero.id] ?? 0;
    if (cur >= ADVANCE_MAX) { showMsg('已達最高階'); return; }
    const next = cur + 1;
    setAdvanceLevel(hero.id, next);
    setAdvancement((m) => ({ ...m, [hero.id]: next }));
    showMsg(`${nameOf(hero.id)} 進階至 ${next} 階（全屬性 +${Math.round(advancementBonus(next) * 100)}%）`);
  };

  const showMsg = (msg: string) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleLearnSlot = (slotIdx: 0 | 1) => {
    setActiveSlot(slotIdx);
    showMsg(`選擇書庫中的戰法放入可學槽 ${slotIdx + 1}`);
  };

  const handleLearn = (tacticId: string, slotIdx: 0 | 1) => {
    const result = learnTactic(hero, lib, tacticId, slotIdx, ALL_TACTICS);
    if (result.ok) {
      setHeroStates((prev) => ({ ...prev, [hero.id]: result.hero }));
      setLib(result.lib);
      setActiveSlot(null);
      const t = ALL_TACTICS.find((t) => t.id === tacticId);
      showMsg(`成功習得「${t?.name ?? tacticId}」到可學槽 ${slotIdx + 1}`);
    } else {
      showMsg(`習得失敗：${result.error}`);
    }
  };

  const handleUpgrade = (tacticId: string) => {
    const result = upgradeTactic(lib, tacticId);
    if (result.ok) {
      setLib(result.lib);
      // 更新 hero 中對應 learnedSlot 的等級
      const newSlots: [typeof hero.learnedSlots[0], typeof hero.learnedSlots[1]] = [
        hero.learnedSlots[0] && hero.learnedSlots[0].id === tacticId
          ? { ...hero.learnedSlots[0], level: result.newLevel }
          : hero.learnedSlots[0],
        hero.learnedSlots[1] && hero.learnedSlots[1].id === tacticId
          ? { ...hero.learnedSlots[1], level: result.newLevel }
          : hero.learnedSlots[1],
      ];
      const updatedHero = { ...hero, learnedSlots: newSlots };
      setHeroStates((prev) => ({ ...prev, [hero.id]: updatedHero }));
      const t = ALL_TACTICS.find((t) => t.id === tacticId);
      showMsg(`「${t?.name ?? tacticId}」升至 Lv.${result.newLevel}`);
    } else {
      showMsg(`升級失敗：${result.error}`);
    }
  };

  const handleClearSlot = (slotIdx: 0 | 1) => {
    const newSlots: [typeof hero.learnedSlots[0], typeof hero.learnedSlots[1]] = [...hero.learnedSlots] as [typeof hero.learnedSlots[0], typeof hero.learnedSlots[1]];
    newSlots[slotIdx] = null;
    setHeroStates((prev) => ({ ...prev, [hero.id]: { ...hero, learnedSlots: newSlots } }));
    showMsg(`已移除可學槽 ${slotIdx + 1} 的戰法`);
  };

  const handleDisassemble = (target: Hero) => {
    const result = disassembleHero(target, lib);
    setLib(result.lib);
    const gained = result.booksGained.map((b) => {
      const t = ALL_TACTICS.find((t) => t.id === b.tacticId);
      return `${t?.name ?? b.tacticId} × ${b.quantity}`;
    }).join('、');
    showMsg(`拆解 ${nameOf(target.id)} — 獲得：${gained}`);
  };

  return (
    <div style={style.wrap}>
      <h2 style={{ color: '#c9a227', marginBottom: 16 }}>武將戰法配置</h2>

      {/* 訊息提示 */}
      {message && (
        <div style={{ background: '#3a2e1e', border: '1px solid #c9a227', borderRadius: 8, padding: '8px 14px', marginBottom: 12, color: '#c9a227', fontSize: 13 }}>
          {message}
        </div>
      )}

      {/* 武將選擇 */}
      <div style={{ ...style.panel, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 600 }}>選擇武將：</span>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ROSTER.map((h) => (
            <button
              key={h.id}
              style={{
                ...style.btn(true),
                background: selectedHeroId === h.id ? '#c9a227' : '#3a2e1e',
                color: selectedHeroId === h.id ? '#1a1410' : 'var(--ink, #c0a870)',
                padding: '6px 14px',
              }}
              onClick={() => { setSelectedHeroId(h.id); setActiveSlot(null); }}
            >
              {nameOf(h.id)}（{h.rarity}★）
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        {/* 左側：武將戰法卡 */}
        <div style={{ flex: '1 1 340px' }}>
          <HeroTacticCard
            hero={hero}
            lib={lib}
            advanceLevel={advancement[hero.id] ?? 0}
            onAdvance={handleAdvance}
            onLearnSlot={handleLearnSlot}
            onUpgrade={handleUpgrade}
            onClearSlot={handleClearSlot}
          />
        </div>

        {/* 右側：書庫列表 */}
        <div style={{ flex: '1 1 340px' }}>
          <TacticBookList
            lib={lib}
            hero={hero}
            activeSlot={activeSlot}
            onLearn={handleLearn}
          />
        </div>
      </div>

      {/* 拆解武將 */}
      <DisassemblePanel onDisassemble={handleDisassemble} />
    </div>
  );
}
