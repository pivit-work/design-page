import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DownloadIcon, AlertIcon, UsersIcon, CheckCircleIcon, RefreshIcon, ChatIcon, ClipboardIcon } from './evalIcons';
import AvatarPhoto from './AvatarPhoto';

/**
 * EvalFeedbackHrCanvas — 피드백 관리 (HR 대시보드, v2 재설계).
 *
 * KPI(커버리지·평균주기·리액션율) + 팀별 커버리지 + 피드백 필요 멤버 +
 * 매니저별 활동 점수(커버리지50+주기30+SBI20) + NudgeModal + CSV(BOM).
 * 시안 feedback-hr-view.jsx.
 */

// 디자인시스템 토큰화(전면). navy(HR 강조)→system accent(brand)로 수렴(3화면 통일).
const C = {
  bg: 'var(--bg-primary, #F0F2F8)',
  surface: 'var(--bg-quaternary, #FFFFFF)',
  border: 'var(--border-secondary, #DDE3EE)',
  borderL: 'var(--border-tertiary, #EEF1F8)',
  text: 'var(--text-primary, #0D1421)',
  sub: 'var(--text-secondary, #4A5568)',
  muted: 'var(--text-tertiary, #8896AE)',
  navy: 'var(--utility-brand-700, #1A2E6C)',
  accent: 'var(--utility-brand-600, #2dbd82)',
  accentBg: 'var(--utility-brand-50, #E1FEF2)',
  accentBd: 'var(--utility-brand-200, #B3FADE)',
  green: 'var(--utility-success-600, #0D9E6E)',
  greenBg: 'var(--utility-success-50, #E8F8F3)',
  greenBd: 'var(--utility-success-200, #A7E3CE)',
  amber: 'var(--utility-warning-700, #C46A00)',
  amberBg: 'var(--utility-warning-50, #FFF4E0)',
  amberBd: 'var(--utility-warning-200, #F5C97A)',
  red: 'var(--utility-error-600, #C0392B)',
  redBg: 'var(--utility-error-50, #FEF0EE)',
  redBd: 'var(--utility-error-200, #F5BCBA)',
};
const FONT = "'Pretendard','Noto Sans KR',sans-serif";

const DEFAULT_LABELS = {
  title: '피드백 관리',
  subtitle: '조직 전체 피드백 현황',
  exportCsv: 'CSV 내보내기',
  kpiTotal: '전체 멤버',
  kpiCoverage: '커버리지',
  kpiInterval: '평균 주기',
  kpiReaction: '리액션 완료율',
  unitPeople: '명',
  unitDays: '일',
  teamCoverageTitle: '팀별 피드백 커버리지 (30일 기준)',
  teamCovered: '커버',
  teamAvg: '평균',
  atRiskTitle: '피드백 필요 멤버',
  atRiskNone: '피드백 필요 멤버가 없습니다.',
  notWritten: '미작성',
  daysOver: '일 경과',
  managerName: '담당',
  nudgeManager: '매니저 알림',
  sent: '발송됨',
  noManager: '매니저 없음',
  managerActivityTitle: '매니저별 피드백 활동',
  managerActivitySub: '활동 점수 = 커버리지 × 50% + 주기 × 30% + 품질 × 20%',
  colCoverage: '커버리지',
  colInterval: '평균 주기',
  colSbi: 'SBI 준수',
  encourage: '독려 알림',
  nudgeTitle: '알림 발송 방법 선택',
  nudgeTarget: '대상 매니저',
  nudgeMember: '대상 멤버',
  channelCollab: '협업툴 (Slack/Discord)',
  channelEmail: '업무 이메일',
  notIntegrated: '미연동',
  channelNone: '발송 가능한 채널이 없습니다',
  channelEmailOnly: '협업툴 미연동 — 이메일로만 발송됩니다',
  channelHint: '선택한 채널로 동시 발송됩니다. 24시간 내 동일 알림 재발송 불가.',
  cancel: '취소',
  send: '발송',
  toastSent: '알림을 발송했습니다',
  toastError: '발송에 실패했습니다',
  csvEmpty: '내보낼 데이터가 없습니다',
  csvName: '피드백_현황',
  csvCols: '이름,팀,매니저,마지막 피드백,경과일',
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}
function initial(name) {
  return (name || '?').trim().charAt(0) || '?';
}
function Avatar({ name, photo, size = 36, color }) {
  return (
    <span style={{ position: 'relative', width: size, height: size, borderRadius: '50%', background: color || 'linear-gradient(135deg,#3B5BDB,#0F1E5C)', color: '#fff', fontSize: size * 0.42, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      {initial(name)}
      <AvatarPhoto photo={photo} name={name} />
    </span>
  );
}
function covColor(pct) {
  if (pct >= 90) return C.green;
  if (pct >= 70) return C.amber;
  return C.red;
}
function scoreColor(s) {
  if (s >= 80) return C.green;
  if (s >= 60) return C.amber;
  return C.red;
}

function Bar({ value, color }) {
  return (
    <span style={{ display: 'block', width: '100%', height: 6, background: C.borderL, borderRadius: 3, overflow: 'hidden' }}>
      <span style={{ display: 'block', width: `${Math.min(100, value)}%`, height: '100%', background: color }} />
    </span>
  );
}

function KpiRow({ kpi, L }) {
  const cards = [
    { icon: <UsersIcon size={18} />, label: L.kpiTotal, value: kpi.total, unit: L.unitPeople, color: C.text },
    { icon: <CheckCircleIcon size={18} />, label: L.kpiCoverage, value: kpi.coveragePct, unit: '%', color: covColor(kpi.coveragePct) },
    { icon: <RefreshIcon size={18} />, label: L.kpiInterval, value: kpi.avgInterval, unit: L.unitDays, color: kpi.avgInterval <= 30 ? C.green : C.amber },
    { icon: <ChatIcon size={18} />, label: L.kpiReaction, value: kpi.reactionRate, unit: '%', color: kpi.reactionRate >= 70 ? C.green : C.amber },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 14 }}>
          <div style={{ fontSize: 18 }}>{c.icon}</div>
          <div style={{ fontSize: 'var(--font-size-display-xs, 24px)', fontWeight: 800, color: c.color, marginTop: 4 }}>
            {c.value}
            <span style={{ fontSize: 13, color: C.sub }}>{c.unit}</span>
          </div>
          <div style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.sub, marginTop: 2 }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

function TeamCoverage({ teams, L }) {
  if (!teams || teams.length === 0) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 'var(--font-size-text-sm, 14px)', fontWeight: 700, color: C.text, marginBottom: 12 }}>{L.teamCoverageTitle}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {teams.map((t) => (
          <div key={t.team} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 130, fontSize: 13, color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.team}</span>
            <span style={{ width: 74, fontSize: 'var(--font-size-text-xs, 12px)', color: C.muted }}>{t.covered}/{t.total} {L.teamCovered}</span>
            <span style={{ width: 64, fontSize: 'var(--font-size-text-xs, 12px)', color: C.muted }}>{L.teamAvg} {t.avgInterval}{L.unitDays}</span>
            <span style={{ flex: 1 }}><Bar value={t.ratePct} color={covColor(t.ratePct)} /></span>
            <span style={{ width: 40, textAlign: 'right', fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 700, color: covColor(t.ratePct) }}>{t.ratePct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AtRiskMembers({ atRisk, L, onNudge, isSent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-text-sm, 14px)', fontWeight: 700, color: C.text }}><AlertIcon size={16} />{L.atRiskTitle}</span>
        {atRisk.length > 0 && <span style={{ fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 700, color: C.red, background: C.redBg, borderRadius: 6, padding: '1px 7px' }}>{atRisk.length}</span>}
      </div>
      {atRisk.length === 0 ? (
        <p className="evc-empty-sub">{L.atRiskNone}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {atRisk.map((m) => {
            const sent = isSent('request', null, m.id);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: m.urgent ? C.redBg : C.amberBg, border: `1px solid ${m.urgent ? C.redBd : C.amberBd}`, borderRadius: 10, padding: 10 }}>
                <Avatar name={m.name} photo={m.avatar} size={32} color={m.urgent ? `linear-gradient(135deg,${C.red},#8B2318)` : `linear-gradient(135deg,${C.amber},#8A4B00)`} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: C.sub }}>{m.department || ''}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-text-xs, 12px)', color: m.urgent ? C.red : C.amber, fontWeight: 600 }}>
                  {m.lastFeedbackAt == null ? L.notWritten : `${m.daysSince}${L.daysOver}`}
                </span>
                <span style={{ fontSize: 11, color: C.muted, minWidth: 70 }}>{m.managerName ? `${L.managerName} ${m.managerName}` : ''}</span>
                <button
                  type="button"
                  disabled={!m.managerName || sent}
                  onClick={() => onNudge({ type: 'request', targetManagerId: m.managerId, targetManagerName: m.managerName, memberId: m.id, memberName: m.name })}
                  data-testid={`fbhr-nudge-atrisk-${m.id}`}
                  style={{ border: `1px solid ${C.navy}`, background: sent ? C.borderL : '#fff', color: sent ? C.muted : C.navy, borderRadius: 8, padding: '5px 10px', fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 600, cursor: !m.managerName || sent ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: !m.managerName ? 0.5 : 1 }}
                >
                  {!m.managerName ? L.noManager : sent ? L.sent : L.nudgeManager}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManagerActivity({ rows, L, onNudge, isSent }) {
  if (!rows || rows.length === 0) return null;
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 'var(--font-size-text-sm, 14px)', fontWeight: 700, color: C.text }}>{L.managerActivityTitle}</div>
      <div style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.muted, marginBottom: 12 }}>{L.managerActivitySub}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => {
          const sent = isSent('encourage', r.id, null);
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: i < rows.length - 1 ? `1px solid ${C.borderL}` : 'none' }}>
              <span style={{ width: 20, fontSize: 'var(--font-size-text-xs, 12px)', color: C.muted, textAlign: 'center' }}>{i + 1}</span>
              <Avatar name={r.name} photo={r.avatar} size={34} />
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>{r.team}</div>
              </div>
              <span style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.sub, width: 80 }}>{L.colCoverage} {r.coveragePct}%</span>
              <span style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.sub, width: 90 }}>{L.colInterval} {r.avgInterval == null ? '—' : `${r.avgInterval}${L.unitDays}`}</span>
              <span style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.sub, width: 90 }}>{L.colSbi} {r.sbiPct == null ? '—' : `${r.sbiPct}%`}</span>
              <span style={{ marginLeft: 'auto', width: 44, height: 44, borderRadius: '50%', border: `3px solid ${scoreColor(r.activityScore)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-text-sm, 14px)', fontWeight: 800, color: scoreColor(r.activityScore) }}>
                {r.activityScore}
              </span>
              {r.activityScore < 70 && (
                <button
                  type="button"
                  disabled={sent}
                  onClick={() => onNudge({ type: 'encourage', targetManagerId: r.id, targetManagerName: r.name, memberId: null, memberName: null })}
                  data-testid={`fbhr-nudge-encourage-${r.id}`}
                  style={{ border: `1px solid ${C.navy}`, background: sent ? C.borderL : '#fff', color: sent ? C.muted : C.navy, borderRadius: 8, padding: '5px 10px', fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 600, cursor: sent ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  {sent ? L.sent : L.encourage}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NudgeModal({ target, channels, L, onConfirm, onClose }) {
  const collabAvail = !!channels?.collab;
  const emailAvail = !!channels?.email;
  const [collab, setCollab] = useState(collabAvail);
  const [email, setEmail] = useState(emailAvail);
  const [busy, setBusy] = useState(false);

  const selected = [collab && collabAvail && 'collab', email && emailAvail && 'email'].filter(Boolean);
  const canSend = selected.length > 0 && !busy;

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm(selected);
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg-overlay, #111927) 45%, transparent)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} data-testid="fbhr-nudge-modal" style={{ width: 380, background: C.surface, borderRadius: 14, padding: 20, fontFamily: FONT }}>
        <h3 style={{ fontSize: 'var(--font-size-text-md, 16px)', fontWeight: 800, color: C.text, margin: '0 0 4px' }}>{L.nudgeTitle}</h3>
        <p style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.sub, margin: '0 0 14px' }}>
          {L.nudgeTarget}: {target.targetManagerName}
          {target.memberName ? ` · ${L.nudgeMember}: ${target.memberName}` : ''}
        </p>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', opacity: collabAvail ? 1 : 0.5 }}>
          <input type="checkbox" checked={collab && collabAvail} disabled={!collabAvail} onChange={(e) => setCollab(e.target.checked)} data-testid="fbhr-ch-collab" />
          <span style={{ fontSize: 13, color: C.text }}>{L.channelCollab}</span>
          {!collabAvail && <span style={{ fontSize: 11, color: C.muted }}>({L.notIntegrated})</span>}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', opacity: emailAvail ? 1 : 0.5 }}>
          <input type="checkbox" checked={email && emailAvail} disabled={!emailAvail} onChange={(e) => setEmail(e.target.checked)} data-testid="fbhr-ch-email" />
          <span style={{ fontSize: 13, color: C.text }}>{L.channelEmail}</span>
          {!emailAvail && <span style={{ fontSize: 11, color: C.muted }}>({L.notIntegrated})</span>}
        </label>
        <p style={{ fontSize: 11, margin: '8px 0 14px', color: !collabAvail && !emailAvail ? C.red : !collabAvail ? C.amber : C.muted }}>
          {!collabAvail && <><AlertIcon size={13} /> </>}
          {!collabAvail && !emailAvail ? L.channelNone : !collabAvail ? L.channelEmailOnly : L.channelHint}
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" onClick={onClose} style={{ border: `1px solid ${C.border}`, background: '#fff', color: C.sub, borderRadius: 8, padding: '8px 14px', fontSize: 13, cursor: 'pointer' }}>{L.cancel}</button>
          <button type="button" disabled={!canSend} onClick={confirm} data-testid="fbhr-nudge-send" style={{ background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: canSend ? 'pointer' : 'not-allowed', opacity: canSend ? 1 : 0.5 }}>{L.send}</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function EvalFeedbackHrCanvas({
  dashboard = null,
  channels = { collab: false, email: true },
  labels: providedLabels,
  onNudge,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const d = dashboard || { kpi: { total: 0, covered: 0, coveragePct: 0, avgInterval: 0, reactionRate: 0 }, teams: [], atRisk: [], managerActivity: [] };
  const [nudgeTarget, setNudgeTarget] = useState(null);
  const [sentKeys, setSentKeys] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const keyOf = (type, mgrId, memberId) => `${type}:${mgrId || ''}:${memberId || ''}`;
  const isSent = (type, mgrId, memberId) => sentKeys.has(keyOf(type, mgrId, memberId));

  const handleNudgeConfirm = async (selected) => {
    if (!nudgeTarget) return;
    try {
      await onNudge?.({
        type: nudgeTarget.type,
        targetManagerId: nudgeTarget.targetManagerId,
        memberId: nudgeTarget.memberId,
        channels: selected,
      });
      setSentKeys((prev) => {
        const next = new Set(prev);
        next.add(keyOf(nudgeTarget.type, nudgeTarget.type === 'encourage' ? nudgeTarget.targetManagerId : null, nudgeTarget.memberId));
        return next;
      });
      showToast(L.toastSent);
    } catch {
      showToast(L.toastError, 'error');
    } finally {
      setNudgeTarget(null);
    }
  };

  const handleExport = () => {
    if (!d.atRisk.length) {
      showToast(L.csvEmpty, 'error');
      return;
    }
    const rows = d.atRisk.map((m) =>
      [m.name, m.department || '', m.managerName || '', m.lastFeedbackAt ? new Date(m.lastFeedbackAt).toISOString().slice(0, 10) : L.notWritten, m.daysSince == null ? '' : m.daysSince]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = `﻿${L.csvCols}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${L.csvName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="evc-root" style={{ background: C.bg, fontFamily: FONT }}>
      {toast && (
        <div className={`evc-toast ${toast.type === 'success' ? 'is-success' : 'is-error'}`} role="status">{toast.msg}</div>
      )}
      <header className="evc-header" style={{ maxWidth: 900, display: 'flex', alignItems: 'center' }}>
        <div>
          <h1 className="evc-title"><ClipboardIcon size={20} /> {L.title}</h1>
          <p className="evc-summary">{L.subtitle}</p>
        </div>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 700, color: covColor(d.kpi.coveragePct), background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px' }}>
            {d.kpi.coveragePct >= 90 ? <CheckCircleIcon size={13} /> : <AlertIcon size={13} />} {L.kpiCoverage} {d.kpi.coveragePct}%
          </span>
          <button type="button" onClick={handleExport} data-testid="fbhr-csv" className="evc-btn"><DownloadIcon size={15} />{L.exportCsv}</button>
        </span>
      </header>
      <div className="evc-list" style={{ maxWidth: 900, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <KpiRow kpi={d.kpi} L={L} />
        <TeamCoverage teams={d.teams} L={L} />
        <AtRiskMembers atRisk={d.atRisk} L={L} onNudge={(t) => setNudgeTarget(t)} isSent={isSent} />
        <ManagerActivity rows={d.managerActivity} L={L} onNudge={(t) => setNudgeTarget(t)} isSent={isSent} />
      </div>
      {nudgeTarget && (
        <NudgeModal target={nudgeTarget} channels={channels} L={L} onConfirm={handleNudgeConfirm} onClose={() => setNudgeTarget(null)} />
      )}
    </div>
  );
}
