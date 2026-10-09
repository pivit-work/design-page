import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Toast from '../shared/Toast.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import { DownloadIcon, AlertIcon, UsersIcon, CheckCircleIcon, RefreshIcon, ChatIcon, ClipboardIcon } from './evalIcons';
import Avatar from '../shared/Avatar.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';

/**
 * EvalFeedbackHrCanvas — 피드백 관리 (HR 대시보드, v2 재설계).
 *
 * KPI(커버리지·평균주기·리액션율) + 팀별 커버리지 + 피드백 필요 멤버 +
 * 매니저별 활동 점수(커버리지50+주기30+SBI20) + NudgeModal + [CSV 내보내기] 버튼.
 * 시안 feedback-hr-view.jsx.
 *
 * 네 섹션(KPI·팀 커버리지·피드백 필요 멤버·매니저 활동)은 앱이 따로 불러온다 (PW-1456 · 정책 §5·§6).
 * `sectionStatus` 로 섹션마다 «불러오는 중»·«실패»를 받아, 그 섹션 자리에만 자리 표시나 실패 안내 +
 * [다시 시도](`onRetrySection`)를 그린다. 상태를 안 주면 받은 값을 그대로 그린다.
 *
 * CSV 파일은 여기서 만들지 않는다 (PW-1028). 버튼은 `onExport` 로 앱에 알리기만 하고, 파일은
 * 앱이 다른 내려받기 파일과 같은 공용 처리로 만든다 — 엑셀 수식 막기 같은 규칙이 화면 원본에
 * 한 벌 더 있으면 한쪽만 고쳐질 때 파일이 조용히 갈린다(PW-970 이 그렇게 새어 나갔다).
 */

// 디자인시스템 토큰화(전면). navy(HR 강조)→system accent(brand)로 수렴(3화면 통일).
const C = {
  bg: 'var(--bg-primary)',
  surface: 'var(--bg-quaternary)',
  border: 'var(--border-secondary)',
  borderL: 'var(--border-tertiary)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  muted: 'var(--text-tertiary)',
  navy: 'var(--utility-brand-700)',
  accent: 'var(--utility-brand-600)',
  accentBg: 'var(--utility-brand-50)',
  accentBd: 'var(--utility-brand-200)',
  green: 'var(--utility-success-600)',
  greenBg: 'var(--utility-success-50)',
  greenBd: 'var(--utility-success-200)',
  amber: 'var(--utility-warning-700)',
  amberBg: 'var(--utility-warning-50)',
  amberBd: 'var(--utility-warning-200)',
  red: 'var(--utility-error-600)',
  redBg: 'var(--utility-error-50)',
  redBd: 'var(--utility-error-200)',
};
const FONT = 'var(--font-family-body)';

const DEFAULT_LABELS = {
  title: '피드백 관리',
  subtitle: '조직 전체 · {asOf} 기준',
  subtitleNoDate: '조직 전체',
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
  coverageTargetLegend: '기준 커버리지 {pct}%',
  atRiskTitle: '피드백 필요 멤버',
  atRiskNone: '사각지대 멤버가 없습니다',
  noData: '집계할 데이터가 없습니다',
  teamsEmpty: '집계할 팀 데이터가 없습니다',
  managersEmpty: '표시할 매니저 활동이 없습니다',
  sectionLoadFailed: '이 영역을 불러오지 못했습니다.',
  retry: '다시 시도',
  notWritten: '미작성',
  daysOver: '일 경과',
  managerName: '담당',
  nudgeManager: '매니저 알림',
  sent: '발송됨',
  noManager: '매니저 없음',
  noManagerTooltip: '담당 매니저 미지정 — HR이 직접 배정 필요',
  sentTooltip: '최근 발송됨 (24시간 후 재발송 가능)',
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
  toastSentRequest: '{manager} 매니저에게 {member} 님 피드백 요청 알림을 보냈습니다 ({channels})',
  toastSentEncourage: '{manager} 매니저에게 독려 알림을 보냈습니다 ({channels})',
  toastChannelCollab: '협업툴',
  toastChannelEmail: '이메일',
  toastPartial: '일부 채널 발송 실패',
  toastError: '발송에 실패했습니다',
  csvEmpty: '내보낼 데이터가 없습니다',
  exportFailed: '내보내기 실패',
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
function fmtLabel(tpl, vars) {
  return String(tpl ?? '').replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : `{${k}}`));
}
/** PW-1047 ⑥ 팀 커버리지 막대에 긋는 기준선. 아래 초록 문턱과 같은 값이다. */
const COVERAGE_TARGET_PCT = 90;
function covColor(pct) {
  if (pct >= COVERAGE_TARGET_PCT) return C.green;
  if (pct >= 70) return C.amber;
  return C.red;
}
function scoreColor(s) {
  if (s >= 80) return C.green;
  if (s >= 60) return C.amber;
  return C.red;
}

function Bar({ value, color, target }) {
  return (
    <span style={{ position: 'relative', display: 'block', width: '100%' }}>
      <span style={{ display: 'block', width: '100%', height: 6, background: C.borderL, borderRadius: 3, overflow: 'hidden' }}>
        <span style={{ display: 'block', width: `${Math.min(100, value)}%`, height: '100%', background: color }} />
      </span>
      {target != null && (
        <span
          aria-hidden
          data-testid="fbhr-coverage-target"
          style={{ position: 'absolute', top: -3, bottom: -3, left: `${target}%`, borderLeft: `1.5px dashed ${C.muted}` }}
        />
      )}
    </span>
  );
}

/** 알림 토스트가 떠 있는 시간 — 정책 §3.1 「2.5초 자동 소멸」. */
const TOAST_MS = 2500;

const CARD_STYLE = { background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 };

/** 섹션을 불러오는 동안의 자리 표시 (정책 §5 「각 섹션 스켈레톤 카드」). */
function SectionLoading({ testId, rows = 3 }) {
  return (
    <div style={CARD_STYLE} data-testid={testId}>
      <SkeletonList count={rows} height={36} />
    </div>
  );
}

/** 섹션 하나만 실패했을 때 그 자리의 안내 + [다시 시도] (정책 §5·§6). */
function SectionError({ L, onRetry, testId }) {
  return (
    <div role="alert" data-testid={testId} style={{ ...CARD_STYLE, display: 'flex', alignItems: 'center', gap: 10, color: C.red }}>
      <AlertIcon size={16} />
      <span style={{ fontSize: 13, color: C.text }}>{L.sectionLoadFailed}</span>
      <button type="button" className="evc-btn" style={{ marginLeft: 'auto' }} onClick={onRetry} data-testid={`${testId}-retry`}>
        <RefreshIcon size={14} />
        {L.retry}
      </button>
    </div>
  );
}

function KpiRow({ kpi, L }) {
  const noCoverage = kpi.coveragePct == null;
  const cards = [
    { icon: <UsersIcon size={18} />, label: L.kpiTotal, value: kpi.total, unit: L.unitPeople, color: C.text },
    // 집계 대상 0명이면 0% 가 아니라 「—」 (정책 §8-8).
    { icon: <CheckCircleIcon size={18} />, label: L.kpiCoverage, value: noCoverage ? '—' : kpi.coveragePct, unit: noCoverage ? '' : '%', color: noCoverage ? C.muted : covColor(kpi.coveragePct) },
    { icon: <RefreshIcon size={18} />, label: L.kpiInterval, value: kpi.avgInterval, unit: L.unitDays, color: kpi.avgInterval <= 30 ? C.green : C.amber },
    { icon: <ChatIcon size={18} />, label: L.kpiReaction, value: kpi.reactionRate, unit: '%', color: kpi.reactionRate >= 70 ? C.green : C.amber },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
      {cards.map((c) => (
        <div key={c.label} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '16px 20px' }}>
          <div style={{ fontSize: 18 }}>{c.icon}</div>
          <div style={{ fontSize: 'var(--font-size-display-xs)', fontWeight: 800, color: c.color, marginTop: 4 }}>
            {c.value}
            <span style={{ fontSize: 13, color: C.sub }}>{c.unit}</span>
          </div>
          <div style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub, marginTop: 2 }}>{c.label}</div>
        </div>
      ))}
      {kpi.total === 0 && (
        <p className="evc-empty-sub" data-testid="fbhr-no-data" style={{ gridColumn: '1 / -1', margin: 0 }}>{L.noData}</p>
      )}
    </div>
  );
}

function TeamCoverage({ teams, L }) {
  if (!teams || teams.length === 0) {
    return (
      <div style={CARD_STYLE} data-testid="fbhr-teams-empty">
        <div style={{ fontSize: 'var(--font-size-text-sm)', fontWeight: 700, color: C.text, marginBottom: 12 }}>{L.teamCoverageTitle}</div>
        <p className="evc-empty-sub">{L.teamsEmpty}</p>
      </div>
    );
  }
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
      <div style={{ fontSize: 'var(--font-size-text-sm)', fontWeight: 700, color: C.text, marginBottom: 12 }}>{L.teamCoverageTitle}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {teams.map((t) => (
          <div key={t.team} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 130, fontSize: 13, color: C.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.team}</span>
            <span style={{ width: 74, fontSize: 'var(--font-size-text-xs)', color: C.sub }}>{t.covered}/{t.total} {L.teamCovered}</span>
            <span style={{ width: 64, fontSize: 'var(--font-size-text-xs)', color: C.sub }}>{L.teamAvg} {t.avgInterval}{L.unitDays}</span>
            <span style={{ flex: 1 }}><Bar value={t.ratePct} color={covColor(t.ratePct)} target={COVERAGE_TARGET_PCT} /></span>
            <span style={{ width: 40, textAlign: 'right', fontSize: 'var(--font-size-text-xs)', fontWeight: 700, color: covColor(t.ratePct) }}>{t.ratePct}%</span>
          </div>
        ))}
      </div>
      <div data-testid="fbhr-coverage-legend" style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 'var(--font-size-text-xs)', color: C.sub }}>
        <span aria-hidden style={{ display: 'inline-block', height: 12, borderLeft: `1.5px dashed ${C.muted}` }} />
        {fmtLabel(L.coverageTargetLegend, { pct: COVERAGE_TARGET_PCT })}
      </div>
    </div>
  );
}

function AtRiskMembers({ atRisk, L, onNudge, isSent }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-text-sm)', fontWeight: 700, color: C.text }}><AlertIcon size={16} />{L.atRiskTitle}</span>
        {/* 0명이어도 칩을 보인다 (정책 §5 「섹션 인원 칩 0명」). */}
        <span data-testid="fbhr-atrisk-count" style={{ fontSize: 'var(--font-size-text-xs)', fontWeight: 700, color: atRisk.length ? C.red : C.green, background: atRisk.length ? C.redBg : C.greenBg, borderRadius: 6, padding: '1px 7px' }}>{atRisk.length}{L.unitPeople}</span>
      </div>
      {atRisk.length === 0 ? (
        // 기획 문구의 🎉 는 화면에 이모지를 쓰지 않는 규칙에 따라 같은 자리의 체크 아이콘으로 그린다.
        <p className="evc-empty-sub" data-testid="fbhr-atrisk-none" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: C.green, display: 'inline-flex' }}><CheckCircleIcon size={14} /></span>
          {L.atRiskNone}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {atRisk.map((m) => {
            const sent = isSent('request', null, m.id);
            return (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: m.urgent ? C.redBg : C.amberBg, border: `1px solid ${m.urgent ? C.redBd : C.amberBd}`, borderRadius: 10, padding: '12px 16px' }}>
                <Avatar name={m.name} photo={m.avatar} size={32} color={m.urgent ? C.red : C.amber} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{m.name}</div>
                  {/* 「역할 · 팀」 (정책 §2.4) — 역할(직무)이 없으면 팀만. */}
                  <div style={{ fontSize: 12, color: C.sub }} data-testid={`fbhr-atrisk-sub-${m.id}`}>{[m.role, m.department].filter(Boolean).join(' · ')}</div>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-text-xs)', color: m.urgent ? C.red : C.amber, fontWeight: 600 }}>
                  {m.lastFeedbackAt == null ? L.notWritten : `${m.daysSince}${L.daysOver}`}
                </span>
                <span style={{ fontSize: 12, color: C.sub, minWidth: 70 }}>{m.managerName ? `${L.managerName} ${m.managerName}` : ''}</span>
                {/* 못 누르는 이유를 말풍선으로 (정책 §3.3·§8-1). */}
                <Tooltip content={!m.managerName ? L.noManagerTooltip : sent ? L.sentTooltip : null}>
                  <button
                    type="button"
                    disabled={!m.managerName || sent}
                    onClick={() => onNudge({ type: 'request', targetManagerId: m.managerId, targetManagerName: m.managerName, memberId: m.id, memberName: m.name })}
                    data-testid={`fbhr-nudge-atrisk-${m.id}`}
                    style={{ border: `1px solid ${C.navy}`, background: sent ? C.borderL : 'var(--text-white)', color: sent ? C.muted : C.navy, borderRadius: 8, padding: '5px 10px', fontSize: 'var(--font-size-text-xs)', fontWeight: 600, cursor: !m.managerName || sent ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', opacity: !m.managerName ? 0.5 : 1 }}
                  >
                    {!m.managerName ? L.noManager : sent ? L.sent : L.nudgeManager}
                  </button>
                </Tooltip>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ManagerActivity({ rows, L, onNudge, isSent }) {
  if (!rows || rows.length === 0) {
    return (
      <div style={CARD_STYLE} data-testid="fbhr-managers-empty">
        <div style={{ fontSize: 'var(--font-size-text-sm)', fontWeight: 700, color: C.text }}>{L.managerActivityTitle}</div>
        <p className="evc-empty-sub">{L.managersEmpty}</p>
      </div>
    );
  }
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 24 }}>
      <div style={{ fontSize: 'var(--font-size-text-sm)', fontWeight: 700, color: C.text }}>{L.managerActivityTitle}</div>
      <div style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub, marginBottom: 12 }}>{L.managerActivitySub}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {rows.map((r, i) => {
          const sent = isSent('encourage', r.id, null);
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 4px', borderBottom: i < rows.length - 1 ? `1px solid ${C.borderL}` : 'none' }}>
              <span style={{ width: 20, fontSize: 'var(--font-size-text-xs)', color: C.sub, textAlign: 'center' }}>{i + 1}</span>
              <Avatar name={r.name} photo={r.avatar} size={34} />
              <div style={{ minWidth: 90 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{r.name}</div>
                <div style={{ fontSize: 12, color: C.sub }}>{r.team}</div>
              </div>
              <span style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub, width: 80 }}>{L.colCoverage} {r.coveragePct}%</span>
              <span style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub, width: 90 }}>{L.colInterval} {r.avgInterval == null ? '—' : `${r.avgInterval}${L.unitDays}`}</span>
              <span style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub, width: 90 }}>{L.colSbi} {r.sbiPct == null ? '—' : `${r.sbiPct}%`}</span>
              <span style={{ marginLeft: 'auto', width: 44, height: 44, borderRadius: '50%', border: `3px solid ${scoreColor(r.activityScore)}`, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--font-size-text-sm)', fontWeight: 800, color: scoreColor(r.activityScore) }}>
                {r.activityScore}
              </span>
              {r.activityScore < 70 && (
                <Tooltip content={sent ? L.sentTooltip : null}>
                  <button
                    type="button"
                    disabled={sent}
                    onClick={() => onNudge({ type: 'encourage', targetManagerId: r.id, targetManagerName: r.name, memberId: null, memberName: null })}
                    data-testid={`fbhr-nudge-encourage-${r.id}`}
                    style={{ border: `1px solid ${C.navy}`, background: sent ? C.borderL : 'var(--text-white)', color: sent ? C.muted : C.navy, borderRadius: 8, padding: '5px 10px', fontSize: 'var(--font-size-text-xs)', fontWeight: 600, cursor: sent ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}
                  >
                    {sent ? L.sent : L.encourage}
                  </button>
                </Tooltip>
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

  return (
    <ModalShell
      title={L.nudgeTitle}
      description={
        <>
          {L.nudgeTarget}: {target.targetManagerName}
          {target.memberName ? ` · ${L.nudgeMember}: ${target.memberName}` : ''}
        </>
      }
      titleId="fbhr-nudge-title"
      submitLabel={L.send}
      cancelLabel={L.cancel}
      closeLabel={L.cancel}
      canSubmit={canSend}
      busy={busy}
      onClose={onClose}
      onSubmit={confirm}
      zIndex={1000}
      className="evc-shell"
      testId="fbhr-nudge-modal"
    >
      <div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', opacity: collabAvail ? 1 : 0.5 }}>
          <input type="checkbox" checked={collab && collabAvail} disabled={!collabAvail} onChange={(e) => setCollab(e.target.checked)} data-testid="fbhr-ch-collab" />
          <span style={{ fontSize: 13, color: C.text }}>{L.channelCollab}</span>
          {!collabAvail && <span style={{ fontSize: 12, color: C.sub }}>({L.notIntegrated})</span>}
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', opacity: emailAvail ? 1 : 0.5 }}>
          <input type="checkbox" checked={email && emailAvail} disabled={!emailAvail} onChange={(e) => setEmail(e.target.checked)} data-testid="fbhr-ch-email" />
          <span style={{ fontSize: 13, color: C.text }}>{L.channelEmail}</span>
          {!emailAvail && <span style={{ fontSize: 12, color: C.sub }}>({L.notIntegrated})</span>}
        </label>
        <p style={{ fontSize: 12, margin: '8px 0 0', color: !collabAvail && !emailAvail ? C.red : !collabAvail ? C.amber : C.sub }}>
          {!collabAvail && <><AlertIcon size={13} /> </>}
          {!collabAvail && !emailAvail ? L.channelNone : !collabAvail ? L.channelEmailOnly : L.channelHint}
        </p>
      </div>
    </ModalShell>
  );
}

/** 섹션 하나의 상태 — 상태를 안 준 섹션은 받은 값을 그대로 그린다. */
function sectionView(status, key) {
  const st = status?.[key];
  return st === 'loading' || st === 'error' ? st : 'ready';
}

export default function EvalFeedbackHrCanvas({
  dashboard = null,
  /** 섹션별 상태 `{ kpi, teams, atRisk, managerActivity }` — 값은 'loading' | 'error' | 'ready' (PW-1456). */
  sectionStatus,
  /** 실패한 섹션의 [다시 시도] — 섹션 키를 넘긴다. */
  onRetrySection,
  channels = { collab: false, email: true },
  labels: providedLabels,
  /**
   * 알림 발송. 돌려주는 값(있으면) `{ sent, reason?, channels?: [{ channel, ok }] }` 로 결과를 가른다 —
   * 이미 보냄(`reason: 'duplicate'`)·일부 채널 실패·전부 실패 (정책 §3.2·§3.3·§8-6).
   */
  onNudge,
  /**
   * [CSV 내보내기] — 파일은 앱이 만든다 (PW-1028). 실패하면 던진다 → 「내보내기 실패」.
   * 앱이 명단을 다시 받아 보니 비었으면 `'empty'` 를 돌려준다 → 「내보낼 데이터가 없습니다」.
   */
  onExport,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const kpi = dashboard?.kpi ?? { total: 0, covered: 0, coveragePct: null, avgInterval: 0, reactionRate: 0 };
  const teams = dashboard?.teams ?? [];
  const atRisk = dashboard?.atRisk ?? [];
  const managerActivity = dashboard?.managerActivity ?? [];
  const view = {
    kpi: sectionView(sectionStatus, 'kpi'),
    teams: sectionView(sectionStatus, 'teams'),
    atRisk: sectionView(sectionStatus, 'atRisk'),
    managerActivity: sectionView(sectionStatus, 'managerActivity'),
  };
  const [nudgeTarget, setNudgeTarget] = useState(null);
  const [sentKeys, setSentKeys] = useState(() => new Set());
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), TOAST_MS);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const keyOf = (type, mgrId, memberId) => `${type}:${mgrId || ''}:${memberId || ''}`;
  const isSent = (type, mgrId, memberId) => sentKeys.has(keyOf(type, mgrId, memberId));

  const handleNudgeConfirm = async (selected) => {
    if (!nudgeTarget) return;
    const target = nudgeTarget;
    const markSent = () =>
      setSentKeys((prev) => {
        const next = new Set(prev);
        next.add(keyOf(target.type, target.type === 'encourage' ? target.targetManagerId : null, target.memberId));
        return next;
      });
    try {
      const res = await onNudge?.({
        type: target.type,
        targetManagerId: target.targetManagerId,
        memberId: target.memberId,
        channels: selected,
      });
      if (res && res.sent === false) {
        // 오늘 이미 보낸 알림 — 버튼을 「발송됨」으로 두고 이유를 말한다(정책 §3.3).
        // 그 밖(채널 전부 실패 `all_channels_failed` 등)은 실패 토스트 + 버튼 그대로 열어 둔다.
        if (res.reason === 'duplicate') {
          markSent();
          showToast(L.sentTooltip, 'error');
        } else {
          showToast(L.toastError, 'error');
        }
        return;
      }
      const results = Array.isArray(res?.channels) ? res.channels : [];
      const failed = results.filter((c) => !c.ok).length;
      if (failed > 0 && failed === results.length) {
        // 전부 실패 — 보낸 것이 아니다. 버튼을 다시 열어 둔다(정책 §5 「버튼 재활성, 쿨다운 미적용」).
        showToast(L.toastError, 'error');
        return;
      }
      // 일부 실패면 실패한 채널은 서버가 나중에 다시 보낸다 — 같은 알림을 또 누르지 않게 「발송됨」.
      markSent();
      if (failed > 0) {
        showToast(L.toastPartial, 'error');
      } else {
        const chLabel = selected.map((c) => (c === 'collab' ? L.toastChannelCollab : L.toastChannelEmail)).join('·');
        const tpl = target.type === 'request' ? L.toastSentRequest : L.toastSentEncourage;
        showToast(fmtLabel(tpl, { manager: target.targetManagerName, member: target.memberName, channels: chLabel }));
      }
    } catch {
      showToast(L.toastError, 'error');
    } finally {
      setNudgeTarget(null);
    }
  };

  const handleExport = async () => {
    if (view.atRisk === 'ready' && !atRisk.length) {
      showToast(L.csvEmpty, 'error');
      return;
    }
    try {
      const res = await onExport?.();
      if (res === 'empty') showToast(L.csvEmpty, 'error');
    } catch {
      showToast(L.exportFailed, 'error');
    }
  };

  const openNudge = (t) => setNudgeTarget(t);
  const retry = (key) => () => onRetrySection?.(key);
  const asOf = dashboard?.asOf;
  const showBadge = view.kpi === 'ready' && dashboard?.kpi != null;
  const noCoverage = kpi.coveragePct == null;

  return (
    <div className="evc-root" style={{ background: C.bg, fontFamily: FONT }}>
      {/* PW-983 — 공용 Toast 로 그린다(<body> 바로 아래). `.evc-root` 가 position: fixed 라 그 안에
          그리면 z-index 가 앱 위쪽 바를 넘지 못해 알림이 바 밑에 깔려 보이지 않았다(PW-978 과 같은 원인). */}
      <Toast
        message={toast?.msg}
        tone={toast?.type === 'success' ? 'success' : 'error'}
        data-testid="fbhr-toast"
      />
      {/* 폭은 .evc-root 의 기본값(1080px)을 그대로 쓴다 — 수시 피드백 3화면과 정기 평가가
          같은 본문 폭이라야 탭을 옮길 때 내용의 좌우 끝이 움직이지 않는다 (PW-218). */}
      <header className="evc-header" style={{ display: 'flex', alignItems: 'center' }}>
        <div>
          <h1 className="evc-title"><ClipboardIcon size={20} /> {L.title}</h1>
          {/* 「조직 전체 · {기준일} 기준」 — 기준일은 서버 집계 기준일 (정책 §1·§2.1). */}
          <p className="evc-summary" data-testid="fbhr-subtitle">{asOf ? fmtLabel(L.subtitle, { asOf }) : L.subtitleNoDate}</p>
        </div>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {showBadge && (
            <span data-testid="fbhr-coverage-badge" style={{ fontSize: 'var(--font-size-text-xs)', fontWeight: 700, color: noCoverage ? C.muted : covColor(kpi.coveragePct), background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px' }}>
              {!noCoverage && kpi.coveragePct >= 90 ? <CheckCircleIcon size={13} /> : <AlertIcon size={13} />} {L.kpiCoverage} {noCoverage ? '—' : `${kpi.coveragePct}%`}
            </span>
          )}
          <button type="button" onClick={handleExport} data-testid="fbhr-csv" className="evc-btn"><DownloadIcon size={15} />{L.exportCsv}</button>
        </span>
      </header>
      <div className="evc-list">
        {view.kpi === 'loading' ? <SectionLoading testId="fbhr-kpi-loading" rows={1} />
          : view.kpi === 'error' ? <SectionError L={L} onRetry={retry('kpi')} testId="fbhr-kpi-error" />
          : <KpiRow kpi={kpi} L={L} />}
        {view.teams === 'loading' ? <SectionLoading testId="fbhr-teams-loading" />
          : view.teams === 'error' ? <SectionError L={L} onRetry={retry('teams')} testId="fbhr-teams-error" />
          : <TeamCoverage teams={teams} L={L} />}
        {view.atRisk === 'loading' ? <SectionLoading testId="fbhr-atrisk-loading" />
          : view.atRisk === 'error' ? <SectionError L={L} onRetry={retry('atRisk')} testId="fbhr-atrisk-error" />
          : <AtRiskMembers atRisk={atRisk} L={L} onNudge={openNudge} isSent={isSent} />}
        {view.managerActivity === 'loading' ? <SectionLoading testId="fbhr-managers-loading" />
          : view.managerActivity === 'error' ? <SectionError L={L} onRetry={retry('managerActivity')} testId="fbhr-managers-error" />
          : <ManagerActivity rows={managerActivity} L={L} onNudge={openNudge} isSent={isSent} />}
      </div>
      {nudgeTarget && (
        <NudgeModal target={nudgeTarget} channels={channels} L={L} onConfirm={handleNudgeConfirm} onClose={() => setNudgeTarget(null)} />
      )}
    </div>
  );
}
