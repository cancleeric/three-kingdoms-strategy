import { useMemo, useState } from 'react';
import {
  LORD_DEF, QUIZ, quizReward, newLordProfile, lordStartBonus, birthStates, stateName,
  BANNER_COLORS, SIGILS, ITEM_NAME, FACTION_NAME,
} from './engine';
import type { LordType, LordProfile, ItemType, StateId, FactionId } from './engine';

const LORDS: LordType[] = ['sage', 'hero', 'wise'];
const FACTIONS: FactionId[] = ['wei', 'shu', 'wu', 'qun'];
const FACTION_DESC: Record<FactionId, string> = {
  wei: '曹魏 — 中原霸主，兵多將廣',
  shu: '蜀漢 — 漢室正統，忠義之師',
  wu:  '東吳 — 江東水師，雄踞南方',
  qun: '群雄 — 割據一方，不拘一格',
};

/** §4 新手引導精靈：主公創建 → 選陣營 → 賢者問答 → 確認，產出 LordProfile。 */
export default function Onboarding({ onDone }: { onDone: (p: LordProfile) => void }) {
  const [step, setStep] = useState(0);
  const [type, setType] = useState<LordType>('sage');
  const [birth, setBirth] = useState<StateId>(birthStates()[0]);
  const [color, setColor] = useState<string>(BANNER_COLORS[0]);
  const [sigil, setSigil] = useState<string>(SIGILS[0]);
  const [faction, setFaction] = useState<FactionId>('wei');
  const [answers, setAnswers] = useState<(ItemType | null)[]>(Array(QUIZ.length).fill(null));

  const allAnswered = answers.every((a) => a !== null);
  const items = useMemo(() => allAnswered ? quizReward(answers as ItemType[]) : [], [answers, allAnswered]);
  const profile = useMemo(() => newLordProfile(type, birth, color, sigil, items, faction), [type, birth, color, sigil, items, faction]);
  const bonus = lordStartBonus(profile);
  const reroll = () => setAnswers(Array(QUIZ.length).fill(null));

  return (
    <div className="panel" style={{ maxWidth: 640, margin: '0 auto' }}>
      <h2>新手引導（§4）｜ {step === 0 ? '① 主公創建' : step === 1 ? '② 賢者問答' : '③ 確認出征'}</h2>

      {step === 0 && (
        <>
          <div className="row" style={{ alignItems: 'flex-start' }}><label>主公類型</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {LORDS.map((t) => (
                <button key={t} onClick={() => setType(t)}
                  style={{ background: type === t ? 'var(--accent)' : '#3a2e1e', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 13 }}>
                  <b>{LORD_DEF[t].name}</b>（{LORD_DEF[t].perk}）
                </button>
              ))}
            </div>
          </div>

          {/* M3：選擇陣營（一次性，選後不可更改） */}
          <div className="row" style={{ alignItems: 'flex-start' }}><label>選擇陣營</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {FACTIONS.map((f) => (
                <button key={f} onClick={() => setFaction(f)}
                  style={{
                    background: faction === f ? 'var(--accent)' : '#3a2e1e',
                    border: faction === f ? '2px solid var(--gold)' : '1px solid var(--line)',
                    color: 'var(--ink)', borderRadius: 8, padding: '8px 14px',
                    cursor: 'pointer', fontSize: 13, minWidth: 120,
                  }}>
                  <b>{FACTION_NAME[f]}</b><br />
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>{FACTION_DESC[f]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="row" style={{ fontSize: 12, color: 'var(--muted)' }}>
            <label></label>
            <span>陣營選定後不可更改，與同陣營玩家協力爭奪州城。</span>
          </div>

          <div className="row"><label>出生州</label>
            <select value={birth} onChange={(e) => setBirth(e.target.value as StateId)}>
              {birthStates().map((s) => <option key={s} value={s}>{stateName(s)}</option>)}
            </select>
          </div>
          <div className="row"><label>旗幟色</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {BANNER_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)} title={c}
                  style={{ width: 26, height: 26, background: c, border: color === c ? '3px solid var(--gold)' : '2px solid #15110b', borderRadius: 6, cursor: 'pointer' }} />
              ))}
            </div>
          </div>
          <div className="row"><label>旗印</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {SIGILS.map((s) => (
                <button key={s} onClick={() => setSigil(s)}
                  style={{ width: 32, height: 32, background: sigil === s ? color : '#3a2e1e', border: sigil === s ? '2px solid var(--gold)' : '1px solid var(--line)', color: '#fff', borderRadius: 6, cursor: 'pointer', fontWeight: 700 }}>{s}</button>
              ))}
            </div>
          </div>
          <div className="controls" style={{ marginTop: 8 }}>
            <button className="fight" onClick={() => setStep(1)}>下一步：賢者問答 →</button>
          </div>
        </>
      )}

      {step === 1 && (
        <>
          <p className="subtitle" style={{ textAlign: 'left' }}>賢者考問五題，依你的心性贈予兩件起始道具（不滿意可重答）。</p>
          {QUIZ.map((q, i) => (
            <div key={q.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, marginBottom: 6 }}>{q.id}. {q.q}</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {q.options.map((o) => (
                  <button key={o.item} onClick={() => setAnswers((a) => a.map((x, j) => j === i ? o.item : x))}
                    style={{ background: answers[i] === o.item ? 'var(--accent)' : '#3a2e1e', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
                    {o.text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {allAnswered && (
            <div className="result" style={{ padding: '10px 0' }}>
              <div className="subtitle">賢者賜予：<b style={{ color: 'var(--gold)' }}>{items.map((it) => ITEM_NAME[it]).join(' ＋ ')}</b></div>
            </div>
          )}
          <div className="controls" style={{ marginTop: 8 }}>
            <button className="fight" style={{ background: '#444' }} onClick={() => setStep(0)}>← 上一步</button>
            {allAnswered && <button className="fight" style={{ background: '#3a2e1e' }} onClick={reroll}>重答</button>}
            <button className="fight" disabled={!allAnswered} style={{ background: allAnswered ? 'var(--accent)' : '#444' }} onClick={() => setStep(2)}>下一步：確認 →</button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="row"><label>主公</label>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 28, height: 28, background: color, color: '#fff', borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{sigil}</span>
              <b>{LORD_DEF[type].name}</b>（{LORD_DEF[type].perk}）｜ 出生 {stateName(birth)}
            </span>
          </div>
          <div className="row"><label>陣營</label>
            <span>
              <b style={{ color: 'var(--gold)' }}>{FACTION_NAME[faction]}</b>
              <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>{FACTION_DESC[faction]}</span>
              <span style={{ fontSize: 11, color: '#c0392b', marginLeft: 8 }}>（選定後不可更改）</span>
            </span>
          </div>
          <div className="row"><label>起始道具</label><span>{items.map((it) => ITEM_NAME[it]).join('、') || '—'}</span></div>
          <div className="row"><label>主公加成</label>
            <span>{bonus.silver > 0 && `銀 +${bonus.silver}　`}{bonus.tacticPoints > 0 && `戰法點 +${bonus.tacticPoints}　`}{bonus.gear > 0 && `裝備 +${bonus.gear}`}</span>
          </div>
          <div className="controls" style={{ marginTop: 8 }}>
            <button className="fight" style={{ background: '#444' }} onClick={() => setStep(1)}>← 上一步</button>
            <button className="fight" style={{ background: 'var(--gold)', color: '#1a1410' }} onClick={() => onDone(profile)}>結束引導，出征！</button>
          </div>
        </>
      )}
    </div>
  );
}
