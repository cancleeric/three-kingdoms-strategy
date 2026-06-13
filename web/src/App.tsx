import { useEffect, useMemo, useState } from 'react';
import Pvp from './Pvp';
import World from './World';
import Onboarding from './Onboarding';
import TacticConfig from './TacticConfig';
import { applyConfiguredTactics } from './tacticStore';
import {
  ROSTER, RECRUIT_POOL, GUAN_PING,
  makeUnit, makeSquad, resolveBattle, makeRng,
  TILES, grantXp, leveledHero, attackTile, makeGarrison,
  newCity, produce, upgrade, addResources, capacityForTroop, upgradeCost, canAfford, BUILDINGS,
  serializeCampaign, deserializeCampaign,
  newRoster, recruit, ownedList, RECRUIT_COST,
  newAccount, endAndAdvance, SEASON_NAME,
  LORD_DEF, ITEM_NAME, lordStartBonus, stateName, TUTORIAL_QUESTS,
  newStamina, currentStamina, hasStamina, spend as spendStamina, secondsToFull, STAMINA_MAX, ATTACK_COST,
  applyAdvisor, advisorBonus,
} from './engine';
import type { Stamina } from './engine';
import type { Hero, TroopType, CombatEvent, CampaignHero, TileBattleOutcome, City, BuildingId, Resource, SaveState, Roster, RecruitResult, Account, LordProfile } from './engine';

const LORD_KEY = 'sanguo-lord-v1';
const loadLord = (): LordProfile | null => { try { const s = localStorage.getItem(LORD_KEY); return s ? JSON.parse(s) as LordProfile : null; } catch { return null; } };
const saveLord = (p: LordProfile) => { try { localStorage.setItem(LORD_KEY, JSON.stringify(p)); } catch { /* ignore */ } };

const SAVE_KEY = 'sanguo-campaign-v1';
const loadSave = (): SaveState | null => {
  try { const s = localStorage.getItem(SAVE_KEY); return s ? JSON.parse(s) as SaveState : null; } catch { return null; }
};
const clearSave = () => { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignore */ } };

const HEROES: Hero[] = ROSTER;
const HERO_NAME: Record<string, string> = { zhaoyun: '趙雲', lubu: '呂布', zhuge: '諸葛亮', luxun: '陸遜', zhouyu: '周瑜', guanping: '關平' };
const nameOf = (id: string) => HERO_NAME[id] ?? (id.startsWith('garrison') ? '守將' : id);
const heroById = (id: string) => HEROES.find((h) => h.id === id)!;
const TROOPS: { v: TroopType; label: string }[] = [
  { v: 'cavalry', label: '騎兵' }, { v: 'spear', label: '槍兵' },
  { v: 'shield', label: '盾兵' }, { v: 'bow', label: '弓兵' }, { v: 'apparatus', label: '器械' },
];
const PHASE_LABEL: Record<CombatEvent['phase'], string> = {
  formation: '陣法', command: '指揮', passive: '被動', active: '主動', pursuit: '追擊', attack: '普攻', assault: '突擊', end: '結束',
};
const WINNER_LABEL: Record<string, string> = { attacker: '進攻方勝', defender: '防守方勝', draw: '平手' };

function HeroPicker({ hero, troop, onHero, onTroop }: { hero: string; troop: TroopType; onHero: (v: string) => void; onTroop: (v: TroopType) => void }) {
  return (
    <>
      <div className="row"><label>武將</label>
        <select value={hero} onChange={(e) => onHero(e.target.value)}>
          {HEROES.map((h) => <option key={h.id} value={h.id}>{HERO_NAME[h.id]}（{h.rarity}★）</option>)}
        </select>
      </div>
      <div className="row"><label>兵種</label>
        <select value={troop} onChange={(e) => onTroop(e.target.value as TroopType)}>
          {TROOPS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
        </select>
      </div>
    </>
  );
}

function BattleLog({ events }: { events: CombatEvent[] }) {
  const byTurn = useMemo(() => {
    const map = new Map<number, CombatEvent[]>();
    for (const e of events) { if (!map.has(e.turn)) map.set(e.turn, []); map.get(e.turn)!.push(e); }
    return [...map.entries()].sort((x, y) => x[0] - y[0]);
  }, [events]);
  return (
    <div className="log">
      {byTurn.map(([t, evs]) => (
        <div key={t}>
          <div className="turn-head">{t === 0 ? '開戰' : `第 ${t} 回合`}</div>
          {evs.map((e, i) => (
            <div className="ev" key={i}>
              <span className="phase-tag">[{PHASE_LABEL[e.phase]}]</span>{' '}
              <span>{nameOf(e.actorId)}</span>
              {e.tacticId && <span> 施展戰法</span>}
              {e.targetId && <span> → {nameOf(e.targetId)}</span>}
              {e.damage != null && <span className="dmg"> 造成 {e.damage} 傷害</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── 沙盒模式 ───────────────────────────────────────────────────
function Sandbox() {
  const [attHero, setAttHero] = useState('zhaoyun');
  const [attTroop, setAttTroop] = useState<TroopType>('cavalry');
  const [defHero, setDefHero] = useState('luxun');
  const [defTroop, setDefTroop] = useState<TroopType>('bow');
  const [troops, setTroops] = useState(5000);
  const [seed, setSeed] = useState(42);
  const [result, setResult] = useState<ReturnType<typeof resolveBattle> | null>(null);

  const fight = () => {
    // M1.5：套用玩家在戰法配置頁設定的 deck（含 formation/兵種類戰法）
    const a = applyConfiguredTactics(HEROES.find((h) => h.id === attHero)!);
    const d = applyConfiguredTactics(HEROES.find((h) => h.id === defHero)!);
    setResult(resolveBattle({
      attacker: makeSquad([makeUnit(a, attTroop, troops, 'attacker')]),
      defender: makeSquad([makeUnit(d, defTroop, troops, 'defender')]),
      seed,
    }));
  };

  return (
    <>
      <div className="grid">
        <div className="panel side-att"><h2>⚔️ 進攻方</h2><HeroPicker hero={attHero} troop={attTroop} onHero={setAttHero} onTroop={setAttTroop} /></div>
        <div className="panel side-def"><h2>🛡️ 防守方</h2><HeroPicker hero={defHero} troop={defTroop} onHero={setDefHero} onTroop={setDefTroop} /></div>
      </div>
      <div className="controls">
        <span>兵力 <input type="number" style={{ width: 90 }} value={troops} onChange={(e) => setTroops(+e.target.value || 0)} /></span>
        <span>Seed <input type="number" style={{ width: 90 }} value={seed} onChange={(e) => setSeed(+e.target.value || 0)} /></span>
        <button className="fight" onClick={fight}>開 戰</button>
      </div>
      {result && (
        <>
          <div className="result">
            <div className="winner">{WINNER_LABEL[result.winner]}</div>
            <div className="subtitle">共 {result.turns} 回合 ｜ 進攻方剩餘 {result.attackerHpLeft} ｜ 防守方剩餘 {result.defenderHpLeft}</div>
          </div>
          <BattleLog events={result.events} />
        </>
      )}
    </>
  );
}

// ── 打地戰役模式 ───────────────────────────────────────────────
const RES_LABEL: Record<Resource, string> = { food: '糧', wood: '木', stone: '石', iron: '鐵', silver: '銀' };
const BUILD_ORDER: BuildingId[] = ['cavalryCamp', 'spearCamp', 'shieldCamp', 'bowCamp', 'farm', 'lumber', 'quarry', 'ironForge', 'mint'];

function Campaign() {
  const [formation, setFormation] = useState<{ id: string; troop: TroopType }[]>([{ id: 'guanping', troop: 'spear' }]);
  const [started, setStarted] = useState(false);
  const [ch, setCh] = useState<CampaignHero>({ hero: GUAN_PING, level: 1, xp: 0 });
  const [city, setCity] = useState<City>(newCity());
  const [roster, setRoster] = useState<Roster>(() => newRoster(GUAN_PING));
  const [account, setAccount] = useState<Account>(() => newAccount(newRoster(GUAN_PING)));
  const [tileIdx, setTileIdx] = useState(0);
  const [seedCtr, setSeedCtr] = useState(1);
  const [outcome, setOutcome] = useState<(TileBattleOutcome & { events: CombatEvent[] }) | null>(null);
  const [pulled, setPulled] = useState<RecruitResult | null>(null);
  // M5-2 體力系統：出兵節流閥（每秒 tick 更新回復顯示）
  const [stamina, setStamina] = useState<Stamina>(() => newStamina(Date.now()));
  const [advisorId, setAdvisorId] = useState<string>(''); // M5-3 軍師（formation 中某將 id，空=無）
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const [hasSave, setHasSave] = useState(() => !!loadSave());
  const [lord, setLord] = useState<LordProfile | null>(() => loadLord());
  const [wizard, setWizard] = useState(false);

  // 自動存檔：開戰後，戰役狀態一變動即寫入 localStorage（§13.3 進度持久化）
  useEffect(() => {
    if (started) {
      const season = { seasonNumber: account.seasonNumber, seasonType: account.seasonType, prestige: account.prestige, rank: account.rank };
      try { localStorage.setItem(SAVE_KEY, JSON.stringify(serializeCampaign({ formation, commander: ch, city, roster, tileIdx, seedCtr, season }))); } catch { /* ignore */ }
    }
  }, [started, formation, ch, city, roster, tileIdx, seedCtr, account]);

  const resume = () => {
    const save = loadSave();
    const st = save && deserializeCampaign(save, RECRUIT_POOL);
    if (!st) { setHasSave(false); return; }
    setFormation(st.formation); setCh(st.commander); setCity(st.city); setRoster(st.roster);
    if (st.season) setAccount((a) => ({ ...a, seasonNumber: st.season!.seasonNumber, seasonType: st.season!.seasonType as Account['seasonType'], prestige: st.season!.prestige, rank: st.season!.rank, roster: st.roster }));
    setTileIdx(st.tileIdx); setSeedCtr(st.seedCtr); setOutcome(null); setPulled(null); setStarted(true);
  };

  const start = (lp: LordProfile | null = lord) => {
    clearSave(); setHasSave(false);
    setCh({ hero: heroById(formation[0].id), level: 1, xp: 0 });
    let c = newCity();
    if (lp) c = addResources(c, { silver: lordStartBonus(lp).silver }); // §4.1 主公起始加成
    setCity(c); setRoster(newRoster(GUAN_PING)); setAccount(newAccount(newRoster(GUAN_PING)));
    setStamina(newStamina(Date.now())); // M5-2 出征滿體力
    setTileIdx(0); setSeedCtr(1); setOutcome(null); setPulled(null); setStarted(true);
  };

  // 首次出征：未創建主公 → 跑 §4 新手引導精靈；完成後存檔並出征
  const beginCampaign = () => { if (lord) start(lord); else setWizard(true); };
  const finishWizard = (p: LordProfile) => { saveLord(p); setLord(p); setWizard(false); start(p); };

  // §4.3 新手任務完成判定（依當前戰役狀態）
  const questDone: Record<string, boolean> = {
    capture1: tileIdx >= 1,
    build4: ['farm', 'lumber', 'quarry', 'ironForge'].every((b) => city.levels[b as BuildingId] >= 1),
    equipHero: formation.some((f) => f.id === 'guanping'),
    barracks3: city.levels.cavalryCamp >= 3,
    joinAlliance: false,
  };

  // §13 進入下一賽季：結算聲望、英雄/紅度保留、地圖/城建/佈陣重置
  const nextSeason = () => {
    const { account: adv } = endAndAdvance(account, roster, tileIdx);
    setAccount({ ...adv, roster });
    setCh({ hero: heroById(formation[0].id), level: 1, xp: 0 });
    setCity(newCity()); setTileIdx(0); setOutcome(null); setPulled(null);
  };

  // 招募一名武將（花銀錢，§14）
  const doRecruit = () => {
    if (city.resources.silver < RECRUIT_COST) return;
    const res = recruit(roster, RECRUIT_POOL, makeRng(seedCtr * 7919 + 13));
    setCity((c) => addResources(c, { silver: -RECRUIT_COST }));
    setSeedCtr((s) => s + 1);
    setRoster(res.roster);
    setPulled(res);
  };

  // 佈陣可選武將 = 已招募名冊
  const ownedHeroes = ownedList(roster).map((o) => o.hero);

  const cleared = tileIdx >= TILES.length;
  const tile = cleared ? null : TILES[tileIdx];
  // M5-1：每將帶兵量由其兵種對應的兵營等級決定（騎走騎兵營、槍走槍兵營…）
  // 多將佈陣：每名武將依軍隊等級成長，各帶該兵種容量兵（§7.1）
  // M1.5：套用戰法配置頁的 deck，讓打地實戰吃到玩家配置的戰法
  // M5-3：軍師（formation 中指定一將）以其智力給全隊增益
  const advisorHero = advisorId && formation.some((f) => f.id === advisorId) ? leveledHero({ hero: heroById(advisorId), level: ch.level, xp: ch.xp }) : null;
  const buildSquad = () => applyAdvisor(makeSquad(formation.map((f) => makeUnit(leveledHero({ hero: applyConfiguredTactics(heroById(f.id)), level: ch.level, xp: ch.xp }), f.troop, capacityForTroop(city, f.troop), 'attacker'))), advisorHero);

  const attack = () => {
    if (!tile) return;
    // M5-2：體力不足不能出兵（SLG 節奏節流）
    const sp = spendStamina(stamina, Date.now(), ATTACK_COST);
    if (!sp.ok) return;
    setStamina(sp.stamina);
    const out = attackTile(buildSquad(), tile, seedCtr);
    const full = resolveBattle({ attacker: buildSquad(), defender: makeGarrison(tile), seed: seedCtr });
    setOutcome({ ...out, events: full.events });
    setSeedCtr((s) => s + 1);
    // 每次出戰，內政照常產出（§11）
    setCity((c) => produce(c, 1));
    if (out.won && out.reward) {
      setCh((c) => grantXp(c, out.reward!.xp));
      // 打地獎勵：銀 + 糧木石（§11 地塊產資源）
      setCity((c) => addResources(c, { silver: out.reward!.silver, food: out.reward!.xp, wood: out.reward!.xp, stone: Math.round(out.reward!.xp * 0.6) }));
      setTileIdx((i) => i + 1);
    }
  };

  const doBuild = (b: BuildingId) => setCity((c) => upgrade(c, b).city);

  if (!started) {
    if (wizard) return <Onboarding onDone={finishWizard} />;
    return (
      <>
        <div className="panel" style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2>🚩 開始打地戰役</h2>
          <p className="subtitle" style={{ textAlign: 'left' }}>起始主將關平（§4.3 贈送）。出征後在戰役中花銀錢招募更多武將、編入佈陣。核心循環：打地賺資源 → 招募/蓋城 → 變強 → 打更高地 → 攻克洛陽。</p>
          {lord ? (
            <div className="row"><label>當前主公</label>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 26, height: 26, background: lord.bannerColor, color: '#fff', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{lord.sigil}</span>
                <b>{LORD_DEF[lord.type].name}</b>（{LORD_DEF[lord.type].perk}）｜ {stateName(lord.birthState)} ｜ 道具 {lord.items.map((it) => ITEM_NAME[it]).join('、')}
                <button onClick={() => setWizard(true)} style={{ background: '#3a2e1e', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}>重新創建</button>
              </span>
            </div>
          ) : <p className="subtitle" style={{ textAlign: 'left', color: 'var(--gold)' }}>尚未創建主公，出征將先進行新手引導（§4）。</p>}
          <div className="row"><label>起始兵種</label>
            <select value={formation[0].troop} onChange={(e) => setFormation([{ id: 'guanping', troop: e.target.value as TroopType }])}>
              {TROOPS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
            </select>
          </div>
        </div>
        <div className="controls">
          {hasSave && <button className="fight" style={{ background: 'var(--gold)', color: '#1a1410' }} onClick={resume}>繼續上次戰役</button>}
          <button className="fight" onClick={beginCampaign}>{hasSave ? '新戰役' : lord ? '出 征' : '創建主公 · 出征'}</button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="grid">
        <div className="panel side-att">
          <h2>{lord && <span title={`${LORD_DEF[lord.type].name}·${stateName(lord.birthState)}`} style={{ display: 'inline-flex', width: 22, height: 22, background: lord.bannerColor, color: '#fff', borderRadius: 5, alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, marginRight: 6, verticalAlign: 'middle' }}>{lord.sigil}</span>}🗡️ 我軍佈陣 ｜ {SEASON_NAME[account.seasonType]} ｜ 聲望 {account.prestige}（{account.rank}階）</h2>
          {formation.map((slot, i) => (
            <div className="row" key={i}><label>{i === 0 ? '主將' : `副將${i}`}</label>
              <select value={slot.id} onChange={(e) => setFormation((f) => f.map((s, j) => j === i ? { ...s, id: e.target.value } : s))}>
                {ownedHeroes.map((h) => <option key={h.id} value={h.id}>{nameOf(h.id)}（{h.rarity}★）</option>)}
              </select>
              <select value={slot.troop} onChange={(e) => setFormation((f) => f.map((s, j) => j === i ? { ...s, troop: e.target.value as TroopType } : s))}>
                {TROOPS.map((t) => <option key={t.v} value={t.v}>{t.label}</option>)}
              </select>
              {formation.length > 1 && <button onClick={() => setFormation((f) => f.filter((_, j) => j !== i))} style={{ flex: '0 0 auto', background: '#5a2a2a', border: 'none', color: '#fff', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>✕</button>}
            </div>
          ))}
          {formation.length < 3 && ownedHeroes.length > formation.length && <div style={{ marginBottom: 8 }}><button onClick={() => setFormation((f) => [...f, { id: ownedHeroes.find((h) => !f.some((s) => s.id === h.id))!.id, troop: 'spear' }])} style={{ background: '#3a2e1e', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>＋ 編入副將</button></div>}
          <div className="row"><label>軍師</label>
            <select value={advisorId} onChange={(e) => setAdvisorId(e.target.value)}>
              <option value="">無軍師</option>
              {formation.map((f) => <option key={f.id} value={f.id}>{nameOf(f.id)}</option>)}
            </select>
            {advisorHero ? <span style={{ color: 'var(--gold)', fontSize: 13 }}>運籌帷幄：全隊武力/智力 +{Math.round(advisorBonus(advisorHero) * 100)}%</span> : <span style={{ color: 'var(--muted)', fontSize: 13 }}>指定高智力武將為軍師可全隊加成</span>}
          </div>
          <div className="row"><label>軍隊</label><span>Lv.{ch.level}／50（XP {ch.xp}）｜ {formation.map((f) => `${TROOPS.find((t) => t.v === f.troop)?.label} ${capacityForTroop(city, f.troop)}兵`).join('　')}</span></div>
          <div className="row"><label>進度</label><span>{Math.min(tileIdx, TILES.length)} / {TILES.length} 關</span></div>
          <div className="row"><label>體力</label>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-block', width: 120, height: 10, background: '#241c14', borderRadius: 5, overflow: 'hidden', verticalAlign: 'middle' }}>
                <span style={{ display: 'block', height: '100%', width: `${(currentStamina(stamina, now) / STAMINA_MAX) * 100}%`, background: currentStamina(stamina, now) >= ATTACK_COST ? '#3a8a3a' : '#a05a2a' }} />
              </span>
              <b style={{ color: currentStamina(stamina, now) >= ATTACK_COST ? 'var(--ink)' : '#e0a060' }}>{currentStamina(stamina, now)} / {STAMINA_MAX}</b>
              <span style={{ color: 'var(--muted)', fontSize: 12 }}>（每戰 -{ATTACK_COST}{secondsToFull(stamina, now) > 0 ? `，回滿 ${secondsToFull(stamina, now)} 秒` : '，已滿'}）</span>
            </span>
          </div>
        </div>
        <div className="panel side-def">
          <h2>🏯 {cleared ? '全境平定' : tile!.name}</h2>
          {!cleared && <>
            <div className="row"><label>守軍</label><span>武力 {tile!.garrisonForce} ／ {tile!.garrisonTroops} 兵（{TROOPS.find((t) => t.v === tile!.garrisonTroop)?.label}）</span></div>
            <div className="row"><label>建議</label><span>英雄 Lv.{tile!.recHeroLv}+</span></div>
            <div className="row"><label>獎勵</label><span>XP {tile!.reward.xp} ／ 銀 {tile!.reward.silver}</span></div>
          </>}
        </div>
      </div>

      {/* 城建面板（§9/§11）*/}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>🏛️ 城建 ｜ 資源：{(['food', 'wood', 'stone', 'iron', 'silver'] as Resource[]).map((r) => `${RES_LABEL[r]} ${city.resources[r]}`).join('　')}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {BUILD_ORDER.map((b) => {
            const lv = city.levels[b];
            const cost = upgradeCost(b, lv);
            const afford = canAfford(city.resources, cost) && lv < 25;
            const costStr = (Object.keys(cost) as Resource[]).filter((k) => cost[k] > 0).map((k) => `${RES_LABEL[k]}${cost[k]}`).join('/');
            return (
              <button key={b} onClick={() => doBuild(b)} disabled={!afford}
                style={{ flex: '1 1 140px', background: afford ? '#3a2e1e' : '#241c14', color: afford ? 'var(--ink)' : '#666', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 10px', cursor: afford ? 'pointer' : 'not-allowed', textAlign: 'left', fontSize: 13 }}>
                <b>{BUILDINGS[b].name} Lv.{lv}</b><br />
                <span style={{ color: 'var(--muted)' }}>{BUILDINGS[b].desc}</span><br />
                <span style={{ color: afford ? 'var(--gold)' : '#666' }}>升級：{costStr}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 招募面板（§5.4/§14）*/}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>🎴 招募武將 ｜ 名冊 {ownedHeroes.length} 名 ｜ 保底 {roster.pity}/60</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="fight" disabled={city.resources.silver < RECRUIT_COST} onClick={doRecruit} style={{ background: city.resources.silver >= RECRUIT_COST ? 'var(--accent)' : '#444', fontSize: 14, padding: '8px 18px', cursor: city.resources.silver >= RECRUIT_COST ? 'pointer' : 'not-allowed' }}>招募（銀 {RECRUIT_COST}）</button>
          {pulled && <span style={{ fontSize: 14 }}>招得 <b style={{ color: pulled.gotSix ? 'var(--gold)' : 'var(--ink)' }}>{nameOf(pulled.hero.id)}（{pulled.hero.rarity}★）</b>{pulled.dup ? ` — 重複！紅度 → ${pulled.redStars}` : ' — 新武將加入！'}</span>}
        </div>
        <div style={{ marginTop: 10, color: 'var(--muted)', fontSize: 13 }}>名冊：{ownedList(roster).map((o) => `${nameOf(o.hero.id)}(${'★'.repeat(o.redStars)})`).join('　')}</div>
      </div>

      {/* §4.3 新手任務追蹤 */}
      <div className="panel" style={{ marginTop: 16 }}>
        <h2>📜 新手任務（§4.3）｜ {Object.values(questDone).filter(Boolean).length} / {TUTORIAL_QUESTS.length}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {TUTORIAL_QUESTS.map((q) => (
            <div key={q.id} style={{ fontSize: 13, color: questDone[q.id] ? 'var(--gold)' : 'var(--muted)' }}>
              {questDone[q.id] ? '✅' : '⬜'} {q.title}　<span style={{ color: '#8a7c5f' }}>獎勵：{q.reward}{q.id === 'joinAlliance' ? '（於連線對戰／天下加入）' : ''}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="controls">
        {cleared
          ? <><div className="winner">🎉 攻克洛陽！本賽季結算 +聲望 {tileIdx * 100 + 500}</div>
              <button className="fight" style={{ background: 'var(--gold)', color: '#1a1410' }} onClick={nextSeason}>進入下一賽季（保留武將/紅度）</button></>
          : <button className="fight" onClick={attack} disabled={!hasStamina(stamina, now, ATTACK_COST)} style={!hasStamina(stamina, now, ATTACK_COST) ? { background: '#444', cursor: 'not-allowed' } : undefined}>{hasStamina(stamina, now, ATTACK_COST) ? `攻打 ${tile!.name}` : `體力不足（回滿 ${secondsToFull(stamina, now)} 秒）`}</button>}
        <button className="fight" style={{ background: '#444' }} onClick={() => { clearSave(); setHasSave(false); setStarted(false); }}>重新佈陣</button>
      </div>
      {outcome && (
        <>
          <div className="result">
            <div className="winner" style={{ color: outcome.won ? '#c9a227' : '#e06666' }}>{outcome.won ? `攻克 ${outcome.tile.name}！` : `攻打 ${outcome.tile.name} 失敗`}</div>
            <div className="subtitle">{outcome.turns} 回合 ｜ 我軍剩 {outcome.playerHpLeft} ｜ 守軍剩 {outcome.garrisonHpLeft}{outcome.reward ? ` ｜ +XP ${outcome.reward.xp} +資源` : ''}</div>
          </div>
          <BattleLog events={outcome.events} />
        </>
      )}
    </>
  );
}

export default function App() {
  const [mode, setMode] = useState<'campaign' | 'sandbox' | 'pvp' | 'world' | 'tactic'>('campaign');
  return (
    <div className="wrap">
      <h1>三國志戰略 — 戰鬥模擬器</h1>
      <p className="subtitle">自動戰鬥引擎 v0.1（決定性、兵種相剋、戰法、士氣、8 回合）</p>
      <div className="controls" style={{ marginTop: 0 }}>
        <button className="fight" style={{ background: mode === 'campaign' ? 'var(--accent)' : '#444', padding: '8px 20px', fontSize: 14 }} onClick={() => setMode('campaign')}>打地戰役</button>
        <button className="fight" style={{ background: mode === 'world' ? 'var(--accent)' : '#444', padding: '8px 20px', fontSize: 14 }} onClick={() => setMode('world')}>天下大地圖</button>
        <button className="fight" style={{ background: mode === 'pvp' ? 'var(--accent)' : '#444', padding: '8px 20px', fontSize: 14 }} onClick={() => setMode('pvp')}>連線對戰</button>
        <button className="fight" style={{ background: mode === 'sandbox' ? 'var(--accent)' : '#444', padding: '8px 20px', fontSize: 14 }} onClick={() => setMode('sandbox')}>對戰沙盒</button>
        <button className="fight" style={{ background: mode === 'tactic' ? 'var(--accent)' : '#444', padding: '8px 20px', fontSize: 14 }} onClick={() => setMode('tactic')}>戰法配置</button>
      </div>
      {mode === 'campaign' ? <Campaign />
        : mode === 'world' ? <World />
        : mode === 'pvp' ? <Pvp />
        : mode === 'tactic' ? <TacticConfig />
        : <Sandbox />}
    </div>
  );
}
