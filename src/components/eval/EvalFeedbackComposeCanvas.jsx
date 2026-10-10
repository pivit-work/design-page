import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Toast from '../shared/Toast.jsx';
import ModalShell from '../shared/ModalShell.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import { TargetIcon, CpuIcon, MailIcon, SparkleIcon, ClockIcon, ChatIcon, ChevronDownIcon } from './evalIcons';
import Avatar from '../shared/Avatar.jsx';
import Chip from '../shared/Chip.jsx';
import FeedbackOkrPanel from './FeedbackOkrPanel.jsx';
import { SkeletonList } from '../shared/Skeleton.jsx';

/**
 * EvalFeedbackComposeCanvas — 팀 피드백 (매니저 뷰, v2 재설계).
 *
 * 단일 작성 폼을 폐기하고 **TeamListScreen(팀원 목록) + FeedbackThreadScreen(팀원
 * 드릴인: KR/이니셔티브 블록카드 + 스레드 모달 + AI 초안 작성)** 로 재구성한다
 * (spec-feedback FB3, screen-feedback-manager.policy). 시안 feedback-manager-view.jsx.
 */

// 디자인시스템 토큰화(전면) — 정기평가 캔버스와 동일한 semantic 토큰 사용.
// 유틸리티 스케일이 sparse 해 미정의 스텝은 fallback hex 로 렌더된다.
const C = {
  bg: 'var(--bg-primary)',
  surface: 'var(--bg-quaternary)',
  border: 'var(--border-secondary)',
  borderL: 'var(--border-tertiary)',
  text: 'var(--text-primary)',
  sub: 'var(--text-secondary)',
  muted: 'var(--text-tertiary)',
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
  purple: 'var(--utility-purple-500)',
  purpleBg: 'var(--utility-purple-50)',
  purpleBd: 'var(--utility-purple-200)',
};
const FONT = 'var(--font-family-body)';

const DEFAULT_LABELS = {
  // 내가 쓴 피드백의 작성자 이름 — 영어 화면에서는 소비 측이 'Me' 를 넘긴다.
  me: '나',
  emptyItemText: '(내용 없음)',
  title: '팀 피드백',
  subtitle: '팀원별로 OKR 달성 과정에 대한 피드백을 남깁니다.',
  cardRequests: '피드백 요청',
  cardNoFeedback: '피드백 없음',
  cardOverdue: '30일 초과',
  cardNormal: '정상',
  countSuffix: '건',
  peopleSuffix: '명',
  noFeedbackBadge: '피드백 없음',
  daysAgo: '일 전',
  daysOver: '일 경과',
  requestChip: '요청',
  writeFeedback: '피드백 작성 ›',
  back: '← 팀 목록',
  periodLabel: '기간',
  // 지난 기간 옵션 뒤에 붙는 표시. 이모지 글리프를 쓰지 않는다 — 앱 저장소 규칙 (PW-1261).
  pastPeriodMark: ' (과거 기간)',
  pastBanner: '과거 기간을 조회 중입니다. 작성은 현재 기간에서만 가능합니다.',
  sectionKr: 'KEY RESULTS',
  sectionInit: 'INITIATIVES',
  emptyBlock: '이 KR에 연결된 피드백이 없어요',
  myTurn: '내 차례',
  waiting: '대기',
  openThread: '스레드 열기 ›',
  threadEmpty: '이 항목에 연결된 피드백이 없어요',
  close: '닫기',
  incomingReq: '받은 피드백 요청',
  composePlaceholder:
    'SBI 형식을 참고해 자유롭게 작성해 주세요.\n상황(S): 언제, 어떤 맥락에서\n행동(B): 구체적으로 어떤 행동을\n영향(I): 팀/OKR에 어떤 영향이 있었는지',
  aiDraft: 'AI 추천 받기',
  aiDrafting: '⏳ 생성 중...',
  aiHintIdle: 'KR 달성률·최근 스니핏 기반 추천',
  aiHintDone: 'AI 초안 — 수정 후 전달하세요',
  aiPersonalized: '수신자 선호 스타일 반영됨',
  aiFooter: '스니핏·OKR 데이터를 기반으로 AI가 초안을 작성했습니다',
  send: '전달 →',
  pastReadonly: '과거 기간은 읽기 전용입니다. 현재 기간에서만 작성할 수 있습니다.',
  toastSent: '피드백을 전달했습니다',
  toastError: '전송에 실패했습니다. 다시 시도해 주세요',
  aiError: 'AI 추천 생성에 실패했습니다. 직접 작성해 주세요.',
  // 요약을 연 뒤 대화가 늘었을 때 요약 블록 안내 (screen-feedback-member §10-17)
  summaryStale: '요약 이후 새 대화가 있습니다',
  // ── 팀원 스레드 화면 (screen-feedback-manager §3.2~§3.8, PW-1455) ──
  // 진입점 성격 안내 — {name} 에 팀원 이름 (§3.2.1)
  infoBanner:
    '{name} 님이 OKR을 달성해 가는 과정에 대한 수시 피드백 화면입니다. 목표 수립·조정에 대한 피드백은 OKR 화면에서 진행됩니다.',
  // OKR 컨텍스트 패널 (§3.3) — {objectives}·{krs}·{covered}·{total} 을 채운다.
  okrPanelTitle: 'OKR 컨텍스트',
  okrPanelCounts: 'OBJECTIVE {objectives}개 · KR {krs}개',
  okrPanelCoverage: '{covered}/{total} KR 커버',
  okrObjectiveSuffix: ' OBJECTIVE',
  okrPanelSnippets: '최근 스니핏',
  // 받은 요청 칸 (§3.4) — {count} 에 건수
  incomingSection: '받은 피드백 요청 {count}건',
  answerRequest: '이 요청에 답변 작성',
  linkedKrFallback: 'KR',
  linkedInitFallback: '이니셔티브',
  // 기타 칸 (§3.2-8) — 연결 없거나 목록 밖 대상의 피드백. 새로 쓰는 칸은 없다(FB1).
  sectionEtc: '기타',
  etcHint: '목록 밖의 KR에 연결되었거나 연결 대상이 없는 피드백이에요',
  // 보낸 피드백 수정·삭제 (§3.8)
  feedbackEdit: '수정',
  feedbackDelete: '삭제',
  feedbackEditSave: '저장',
  feedbackEditCancel: '취소',
  feedbackEditError: '수정에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  feedbackDeleteError: '삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.',
  // 팀원 0명 빈 상태(FB-1) — 1행은 매니저 뷰 ME-1 과 같은 문장, 2행은 사유 (screen-feedback-manager §5-A).
  emptyTeam: '관리 중인 팀원이 없습니다.',
  emptyTeamHint: '팀원 배정은 관리자가 합니다. 워크스페이스 관리자에게 요청하세요.',
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
function fill(template, vars) {
  return String(template).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}
function krColor(p) {
  if (p >= 80) return C.green;
  if (p >= 50) return C.amber;
  return C.red;
}
function fmtDate(v) {
  if (!v) return '';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}.${d.getDate()}`;
}

// ── 팀 목록 화면 ──
function TeamListScreen({ team, L, onSelect, loading = false, failed = false }) {
  // 불러오는 동안 카드 자리 셋을 깐다(§5). 못 불러왔으면 아무것도 그리지 않는다 — 「팀원이 없다」로
  // 읽히지 않게, 실패 안내와 다시 시도는 화면(소비 측)이 띄운다(§5 「API 실패」).
  if (loading) return <SkeletonList count={3} height={62} data-testid="fbmgr-team-skeleton" />;
  if (failed) return null;
  const members = [...(team.members || [])].sort((a, b) => {
    if (a.lastFeedbackAt == null && b.lastFeedbackAt != null) return -1;
    if (a.lastFeedbackAt != null && b.lastFeedbackAt == null) return 1;
    return new Date(a.lastFeedbackAt || 0) - new Date(b.lastFeedbackAt || 0);
  });
  const s = team.summary || { requests: 0, noFeedback: 0, overdue: 0, normal: 0 };
  const cards = [
    { label: L.cardRequests, value: s.requests, color: C.accent, bg: C.accentBg, suffix: L.countSuffix },
    { label: L.cardNoFeedback, value: s.noFeedback, color: C.red, bg: C.redBg, suffix: L.peopleSuffix },
    { label: L.cardOverdue, value: s.overdue, color: C.amber, bg: C.amberBg, suffix: L.peopleSuffix },
    { label: L.cardNormal, value: s.normal, color: C.green, bg: C.greenBg, suffix: L.peopleSuffix },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
        {cards.map((c) => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: 12, textAlign: 'center' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: c.color }}>
              {c.value}
              <span style={{ fontSize: 13 }}>{c.suffix}</span>
            </div>
            <div style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {members.length === 0 ? (
        <div data-testid="fbmgr-team-empty" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-text-sm)', fontWeight: 600, color: C.text }}>{L.emptyTeam}</p>
          {L.emptyTeamHint && <p style={{ margin: '4px 0 0', fontSize: 'var(--font-size-text-xs)', fontWeight: 500, color: C.sub }}>{L.emptyTeamHint}</p>}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map((m) => {
            const noFb = m.lastFeedbackAt == null;
            const over = !noFb && m.daysSince != null && m.daysSince >= 30;
            const badge = noFb
              ? { label: L.noFeedbackBadge, tone: 'danger' }
              : over
                ? { label: `${m.daysSince}${L.daysOver}`, tone: 'warning' }
                : { label: `${m.daysSince}${L.daysAgo}`, tone: 'success' };
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m)}
                data-testid={`fbmgr-member-${m.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}
              >
                <Avatar name={m.name} photo={m.avatar} size={36} />
                <span style={{ fontSize: 'var(--font-size-text-sm)', fontWeight: 700, color: C.text }}>{m.name}</span>
                <Chip tone={badge.tone}>{badge.label}</Chip>
                {m.pendingRequests > 0 && (
                  <Chip tone="accent" icon={<MailIcon size={11} />}>{`${L.requestChip} ${m.pendingRequests}${L.countSuffix}`}</Chip>
                )}
                {m.department && <span style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub }}>{m.department}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-text-xs)', fontWeight: 600, color: C.accent }}>{L.writeFeedback}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── 블록 카드(매니저) ──
/** KR 진행률 바 폭. 카드가 1080px 로 넓어져 40px 는 점처럼 보였다 (PW-218). */
const PROGRESS_BAR_W = 96;

function BlockCard({ block, L, onOpen }) {
  const isKr = block.type === 'kr';
  const isEtc = block.type === 'etc';
  const items = block.items;
  const incoming = items.filter((i) => i.itemType === 'request');
  const barColor = isKr ? krColor(block.progress ?? 0) : C.purple;
  const latest = [...items].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt)).slice(-2);
  /* [PW-1054] 답하지 않은 요청이 있을 때만 「내 차례」. 같은 화면 팀 목록의 「요청 N」은 서버가
     답 안 된 것만 센다 — 요청이 하나라도 있으면 띄우던 종전 판정은 답을 보낸 뒤에도 남았다.
     `resolvedAt` 이 없는(모르는) 요청은 종전대로 답 안 된 것으로 본다. */
  const hasMyTurn = incoming.some((i) => !i.resolvedAt);
  const hasFeedback = items.some((i) => i.itemType === 'feedback');

  return (
    <button
      type="button"
      onClick={() => onOpen(block)}
      data-testid={`fbmgr-block-${block.key}`}
      // 카드가 1080px 폭으로 넓어졌다 — 좌우 패딩만 소폭 키운다 (PW-218)
      style={{ display: 'block', width: '100%', textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', fontFamily: FONT }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isKr ? (
          <Chip tone="info">{block.badge}</Chip>
        ) : isEtc ? (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{L.sectionEtc}</span>
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}># {block.title}</span>
        )}
        {isKr && <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{block.title}</span>}
        {isKr && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: PROGRESS_BAR_W, height: 4, background: C.borderL, borderRadius: 2, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${block.progress ?? 0}%`, height: '100%', background: barColor }} />
            </span>
            <span style={{ fontSize: 12, color: C.sub }}>{block.progress ?? 0}%</span>
          </span>
        )}
      </div>
      {latest.length === 0 ? (
        <p style={{ fontSize: 'var(--font-size-text-xs)', fontStyle: 'italic', color: C.sub, margin: '4px 0' }}>{L.emptyBlock}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {latest.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 8 }}>
              <Avatar name={it.itemType === 'request' ? it.author?.name : L.me} photo={it.author?.avatar} size={22} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.sub }}>
                  <span style={{ fontWeight: 700, color: C.text }}>{it.itemType === 'request' ? it.author?.name : L.me}</span>
                  {it.itemType === 'request' && <Chip tone="accent">{L.requestChip}</Chip>}
                  <span>{fmtDate(it.sentAt)}</span>
                </div>
                <p style={{ fontSize: 'var(--font-size-text-xs)', color: C.sub, margin: '2px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {it.text || L.emptyItemText}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 12, color: C.sub }}>{items.length}{L.countSuffix}</span>
        {hasMyTurn && <Chip tone="warning">{L.myTurn}</Chip>}
        {!hasMyTurn && hasFeedback && <Chip tone="progress">{L.waiting}</Chip>}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-text-xs)', fontWeight: 600, color: isKr ? C.accent : C.purple }}>{L.openThread}</span>
      </div>
    </button>
  );
}

// ── AI 초안 작성 박스 ──
function ModalComposeBox({ block, memberName, L, onSend, onAiDraft }) {
  const [text, setText] = useState('');
  const [aiState, setAiState] = useState('idle'); // idle | loading | done
  const [personalized, setPersonalized] = useState(false);
  const [busy, setBusy] = useState(false);
  // AI 를 기다리는 동안 매니저가 직접 고쳤는가 — 그러면 늦게 온 초안은 버린다(manager §8-2).
  const typedDuringAi = useRef(false);

  // 실패·빈 응답 안내는 onAiDraft 쪽(캔버스 루트)이 띄우고 null 을 준다. 입력은 그대로 둔다.
  const ai = async () => {
    if (!onAiDraft) return;
    typedDuringAi.current = false;
    setAiState('loading');
    let res = null;
    try {
      res = await onAiDraft({ recipientName: memberName, hint: text.trim() || `${block.title} 관련 피드백` });
    } catch {
      res = null;
    }
    const draft = typeof res === 'string' ? res : res?.draft;
    if (!draft || typedDuringAi.current) {
      setAiState('idle');
      return;
    }
    setText(draft);
    setPersonalized(typeof res === 'object' ? !!res.personalized : false);
    setAiState('done');
  };
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSend({ linkedTargetType: block.type, linkedTargetId: block.id, text: text.trim() });
      setText('');
      setAiState('idle');
    } catch {
      // 실패 안내는 캔버스 루트가 띄웠다 — 입력은 그대로 둔다(manager §8-4).
      // 잡지 않으면 클릭 처리기에서 처리되지 않은 거절로 새어 나간다.
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (aiState === 'loading') typedDuringAi.current = true;
          if (aiState === 'done') setAiState('idle');
        }}
        placeholder={L.composePlaceholder}
        data-testid="fbmgr-compose-text"
        style={{ border: `1px solid ${aiState === 'done' ? C.accentBd : C.border}`, background: aiState === 'done' ? C.accentBg : 'var(--text-white)', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: FONT, resize: 'vertical', whiteSpace: 'pre-wrap' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: C.sub }}>
          {aiState === 'done' ? L.aiHintDone : L.aiHintIdle}
        </span>
        {aiState === 'done' && personalized && (
          <Chip tone="accent" icon={<TargetIcon size={11} />}>{L.aiPersonalized}</Chip>
        )}
        <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {onAiDraft && (
            <button
              type="button"
              disabled={aiState === 'loading'}
              onClick={ai}
              data-testid="fbmgr-ai-draft"
              style={{ border: `1px solid ${C.accentBd}`, background: C.accentBg, color: C.accent, borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600, cursor: aiState === 'loading' ? 'wait' : 'pointer' }}
            >
              {aiState === 'loading' ? L.aiDrafting : <><SparkleIcon size={13} /> {L.aiDraft}</>}
            </button>
          )}
          <button
            type="button"
            disabled={!text.trim() || busy}
            onClick={send}
            data-testid="fbmgr-send"
            style={{ background: C.accent, color: 'var(--text-white)', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.5 }}
          >
            {L.send}
          </button>
        </span>
      </div>
      {aiState === 'done' && <p style={{ fontSize: 12, color: C.sub, margin: 0 }}><CpuIcon size={11} /> {L.aiFooter}</p>}
    </div>
  );
}

/**
 * 내가 보낸 피드백 한 개 (§3.8). 팀원이 아직 답하지 않았고 지금 기간이면 수정·삭제가 붙는다.
 * 수정은 그 자리 입력칸 — 빈 글은 저장 못 하고, 취소하면 원래 글로 돌아간다. 삭제는 확인 없이 바로.
 * 실패하면 입력을 그대로 두고 말풍선 아래에 알린다.
 */
function FeedbackBubble({ item, member, L, canModify, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(item.text || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const modifiable = canModify && !item.memberReply;

  const cancelEdit = () => {
    setEditing(false);
    setEditText(item.text || '');
    setError(null);
  };
  const save = async () => {
    if (!editText.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await onEdit(item, editText.trim());
      setEditing(false);
    } catch {
      setError(L.feedbackEditError);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await onDelete(item);
    } catch {
      setError(L.feedbackDeleteError);
      setBusy(false);
    }
  };

  return (
    <div data-testid={`fbmgr-feedback-${item.id}`}>
      <div style={{ display: 'flex', gap: 8 }}>
        <Avatar name={L.me} photo={item.author?.avatar} size={30} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-text-xs)', marginBottom: 3 }}>
            <span style={{ fontWeight: 700, color: C.text }}>{L.me}</span>
            <span style={{ color: C.sub }}>{fmtDate(item.sentAt)}</span>
            {modifiable && !editing && (
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setEditing(true)} disabled={busy} data-testid="fbmgr-feedback-edit" style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: C.sub, padding: 0 }}>
                  {L.feedbackEdit}
                </button>
                <button type="button" onClick={remove} disabled={busy} data-testid="fbmgr-feedback-delete" style={{ background: 'none', border: 'none', cursor: busy ? 'default' : 'pointer', fontSize: 12, color: C.red, padding: 0, opacity: busy ? 0.6 : 1 }}>
                  {L.feedbackDelete}
                </button>
              </span>
            )}
          </div>
          {editing ? (
            <div style={{ background: C.surface, border: `1px solid ${C.accentBd}`, borderRadius: '0 10px 10px 10px', padding: 10 }}>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                data-testid="fbmgr-feedback-edit-input"
                style={{ width: '100%', minHeight: 72, padding: '8px 10px', borderRadius: 7, border: `1px solid ${C.accentBd}`, fontSize: 13, color: C.text, resize: 'vertical', boxSizing: 'border-box', fontFamily: FONT, lineHeight: 1.6, marginBottom: 8 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" onClick={cancelEdit} data-testid="fbmgr-feedback-edit-cancel" style={{ padding: '6px 12px', borderRadius: 7, border: `1px solid ${C.border}`, background: 'transparent', color: C.sub, fontSize: 12, cursor: 'pointer' }}>
                  {L.feedbackEditCancel}
                </button>
                <button type="button" onClick={save} disabled={busy || !editText.trim()} data-testid="fbmgr-feedback-edit-save" style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: C.accent, color: 'var(--text-white)', fontSize: 12, fontWeight: 700, cursor: busy || !editText.trim() ? 'not-allowed' : 'pointer', opacity: busy || !editText.trim() ? 0.5 : 1 }}>
                  {L.feedbackEditSave}
                </button>
              </div>
            </div>
          ) : (
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '0 10px 10px 10px', padding: 10, fontSize: 13, color: C.text, whiteSpace: 'pre-wrap' }}>
              {item.text}
            </div>
          )}
          {error && <p data-testid="fbmgr-feedback-error" style={{ margin: '4px 0 0', fontSize: 12, color: C.red }}>{error}</p>}
        </div>
      </div>
      {item.memberReply && (
        // 팀원 답변 — 팀원 아바타 + 텍스트 (screen-feedback-manager §3.8).
        <div data-testid="fbmgr-member-reply" style={{ marginLeft: 38, marginTop: 6, display: 'flex', gap: 8 }}>
          <Avatar name={member?.name} photo={member?.avatar} size={24} />
          <div style={{ minWidth: 0, flex: 1, background: C.borderL, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 13, color: C.text }}>
            {item.memberReply.text || '✓ 확인했습니다'}
          </div>
        </div>
      )}
    </div>
  );
}
function RequestBubble({ item, L }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <Avatar name={item.author?.name} photo={item.author?.avatar} size={30} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-text-xs)', marginBottom: 3 }}>
          <span style={{ fontWeight: 700, color: C.text }}>{item.author?.name}</span>
          <Chip tone="accent" icon={<MailIcon size={11} />}>{L.incomingReq}</Chip>
          <span style={{ color: C.sub }}>{fmtDate(item.sentAt)}</span>
        </div>
        <div style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: '0 10px 10px 10px', padding: 10, fontSize: 13, color: C.text }}>
          {item.text || '(내용 없는 요청)'}
        </div>
      </div>
    </div>
  );
}

function ThreadModal({ block, member, memberName, L, isPastPeriod, onSend, onAiDraft, onSummarize, onEditFeedback, onDeleteFeedback, onClose }) {
  const isKr = block.type === 'kr';
  const isEtc = block.type === 'etc';
  const items = [...block.items].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  const [summary, setSummary] = useState(null);
  const [summaryState, setSummaryState] = useState('idle'); // idle | loading | error
  // 요약을 만들 때의 대화 수 — 그 뒤 늘면 요약은 그대로 두고 안내만 붙인다(일회성 뷰).
  const [summaryCount, setSummaryCount] = useState(0);
  // 활성화 조건: 스레드 아이템(피드백+요청+답변) ≥ 5 (ai-spec §11.2).
  const threadCount = items.reduce((n, it) => n + 1 + (it.memberReply ? 1 : 0), 0);
  const canSummarize = threadCount >= 5;

  const summarize = async () => {
    if (!onSummarize || !canSummarize) return;
    setSummaryState('loading');
    try {
      const res = await onSummarize(block);
      if (res) {
        setSummary(res);
        setSummaryCount(threadCount);
        setSummaryState('idle');
      } else {
        setSummaryState('error');
      }
    } catch {
      setSummaryState('error');
    }
  };

  return (
    <ModalShell
      title={isKr ? `${block.badge} · ${block.title}` : isEtc ? L.sectionEtc : `# ${block.title}`}
      description={isKr ? `${block.progress ?? 0}%` : isEtc ? L.etcHint : undefined}
      titleId="fbmgr-thread-title"
      closeLabel={L.close}
      onClose={onClose}
      zIndex={1000}
      className="evc-shell is-wide has-own-footer"
      testId="fbmgr-thread-modal"
      closeTestId="fbmgr-thread-close"
      footer={
        // 「기타」는 한 대상의 스레드가 아니라 새로 쓸 곳이 없다(FB1 — 연결 없는 피드백 작성 UI 미제공).
        isEtc ? null : isPastPeriod ? (
          <div style={{ padding: 16, background: C.amberBg, color: C.amber, fontSize: 'var(--font-size-text-xs)', textAlign: 'center' }}><ClockIcon size={12} /> {L.pastReadonly}</div>
        ) : (
          <ModalComposeBox block={block} memberName={memberName} L={L} onSend={onSend} onAiDraft={onAiDraft} />
        )
      }
    >
      <div className="evc-shell-thread-list">
        {onSummarize && (
          <Tooltip content={canSummarize ? '' : '아직 대화가 충분하지 않습니다'} className="fbmgr-summarize-tip">
          <button
            type="button"
            disabled={!canSummarize || summaryState === 'loading'}
            onClick={summarize}
            data-testid="fbmgr-summarize"
            style={{ alignSelf: 'flex-end', border: `1px solid ${canSummarize ? C.accentBd : C.border}`, background: canSummarize ? C.accentBg : C.borderL, color: canSummarize ? C.accent : C.muted, borderRadius: 8, padding: '5px 10px', fontSize: 'var(--font-size-text-xs)', fontWeight: 600, cursor: canSummarize ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
          >
            {summaryState === 'loading' ? '⏳ 요약 중...' : <><SparkleIcon size={12} /> 대화 요약</>}
          </button>
          </Tooltip>
        )}
        {summary && (
          <div data-testid="fbmgr-summary" style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 'var(--font-size-text-xs)', fontWeight: 700, color: C.accent, marginBottom: 4 }}><SparkleIcon size={12} /> 대화 요약</div>
            <p style={{ fontSize: 13, color: C.text, margin: 0, whiteSpace: 'pre-wrap' }}>{summary.summaryText}</p>
            {threadCount > summaryCount && (
              <p data-testid="fbmgr-summary-stale" style={{ fontSize: 12, color: C.sub, margin: '6px 0 0' }}>{L.summaryStale}</p>
            )}
          </div>
        )}
        {summaryState === 'error' && (
          <div style={{ background: C.redBg, color: C.red, borderRadius: 10, padding: 10, fontSize: 'var(--font-size-text-xs)' }}>
            대화 요약에 실패했습니다. 직접 스크롤하여 확인해 주세요.
          </div>
        )}
        {items.length === 0 ? (
          <p style={{ textAlign: 'center', color: C.sub, fontSize: 13, padding: 24 }}>{L.threadEmpty}</p>
        ) : (
          items.map((it) => it.itemType === 'feedback' ? (
            <FeedbackBubble
              key={it.id}
              item={it}
              member={member}
              L={L}
              canModify={!isPastPeriod && !!onEditFeedback && !!onDeleteFeedback}
              onEdit={onEditFeedback}
              onDelete={onDeleteFeedback}
            />
          ) : <RequestBubble key={it.id} item={it} L={L} />)
        )}
      </div>
    </ModalShell>
  );
}

function PeriodSelector({ periodKey, options, isPastPeriod, onChange, L }) {
  if (!options || options.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isPastPeriod ? C.amberBg : C.surface, border: `1px solid ${isPastPeriod ? C.amberBd : C.border}`, borderRadius: 8, padding: '4px 10px' }}>
      <span style={{ fontSize: 12, color: isPastPeriod ? C.amber : C.sub }}>{L.periodLabel}</span>
      <select value={periodKey} onChange={(e) => onChange(e.target.value)} data-testid="fbmgr-period" style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: isPastPeriod ? C.amber : C.text, fontFamily: FONT, cursor: 'pointer' }}>
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}{o.isCurrent ? '' : L.pastPeriodMark}</option>
        ))}
      </select>
    </span>
  );
}

function groupBlocks(items, krs, initiatives) {
  const byKey = new Map();
  for (const it of items) {
    const key = it.linkedTargetType && it.linkedTargetId ? `${it.linkedTargetType}:${it.linkedTargetId}` : 'etc';
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(it);
  }
  const krBlocks = krs.map((kr, i) => ({ type: 'kr', id: kr.id, key: `kr:${kr.id}`, badge: kr.badge || `KR${i + 1}`, title: kr.title, progress: kr.progress ?? 0, items: byKey.get(`kr:${kr.id}`) || [] }));
  const initBlocks = initiatives.map((it) => ({ type: 'init', id: it.id, key: `init:${it.id}`, title: it.title, items: byKey.get(`init:${it.id}`) || [] }));
  // 「기타」 — 연결 대상이 없거나 연결된 KR·이니셔티브가 지금 목록에 없는 것 전부(§3.2-8).
  // 버리면 그 피드백이 이 화면 어디에도 안 보인다.
  const shown = new Set([...krBlocks, ...initBlocks].map((b) => b.key));
  const etcItems = [];
  for (const [key, list] of byKey) {
    if (!shown.has(key)) etcItems.push(...list);
  }
  const etc = etcItems.length ? { type: 'etc', id: 'etc', key: 'etc', title: '', items: etcItems } : null;
  return { krBlocks, initBlocks, etc };
}

/** 요청에 걸린 대상 배지 문구 — 목록에 있으면 카드와 같은 이름, 없으면 종류만. */
function linkedLabel(item, krBlocks, initBlocks, L) {
  if (!item.linkedTargetType || !item.linkedTargetId) return null;
  const key = `${item.linkedTargetType}:${item.linkedTargetId}`;
  const kr = krBlocks.find((b) => b.key === key);
  if (kr) return `${kr.badge} · ${kr.title}`;
  const init = initBlocks.find((b) => b.key === key);
  if (init) return `# ${init.title}`;
  return item.linkedTargetType === 'kr' ? L.linkedKrFallback : L.linkedInitFallback;
}

/**
 * 받은 피드백 요청 칸 (§3.4) — 그 팀원이 나에게 보낸, 아직 답하지 않은 요청만. 같은 대상으로
 * 피드백을 보내면 서버가 그 요청을 해결로 바꾸고 다시 읽은 스레드에서 빠진다.
 * 「답변 작성」은 그 요청의 KR/이니셔티브 대화 창을 연다. 걸린 대상이 지금 목록에 없으면
 * 버튼을 달지 않는다 — 그때 무엇을 할지는 기획 질문으로 남겼다(§8-7, PW-1455).
 */
function IncomingRequestsSection({ requests, krBlocks, initBlocks, L, onAnswer }) {
  if (requests.length === 0) return null;
  const sorted = [...requests].sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  const blockFor = (it) =>
    it.linkedTargetType && it.linkedTargetId
      ? [...krBlocks, ...initBlocks].find((b) => b.key === `${it.linkedTargetType}:${it.linkedTargetId}`) || null
      : null;
  return (
    <div data-testid="fbmgr-incoming" style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: C.accent }}>
        <MailIcon size={14} /> {fill(L.incomingSection, { count: requests.length })}
      </div>
      {sorted.map((it) => {
        const target = blockFor(it);
        const label = linkedLabel(it, krBlocks, initBlocks, L);
        return (
          <div key={it.id} data-testid={`fbmgr-incoming-${it.id}`} style={{ display: 'flex', gap: 8 }}>
            <Avatar name={it.author?.name} photo={it.author?.avatar} size={30} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-text-xs)', marginBottom: 3 }}>
                <span style={{ fontWeight: 700, color: C.text }}>{it.author?.name}</span>
                {label && <Chip tone="info">{label}</Chip>}
                <span style={{ color: C.sub }}>{fmtDate(it.sentAt)}</span>
              </div>
              {it.text && (
                <div style={{ background: 'var(--bg-primary)', border: `1px solid ${C.accentBd}`, borderRadius: '0 10px 10px 10px', padding: 10, fontSize: 13, color: C.text, whiteSpace: 'pre-wrap' }}>
                  {it.text}
                </div>
              )}
              {target && (
                <button type="button" onClick={() => onAnswer(target)} data-testid={`fbmgr-incoming-answer-${it.id}`} style={{ marginTop: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: C.accent, display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FONT }}>
                  {L.answerRequest} <ChevronDownIcon size={12} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── 팀원 스레드 화면 ──
function ThreadScreen({ member, thread, krs, initiatives, okrGroups, snippets, L, onBack, onChangePeriod, onSend, onAiDraft, onSummarize, onEditFeedback, onDeleteFeedback, openTarget, onOpenTargetHandled, openBlockKey, onOpenBlockChange }) {
  // 연 창은 소비 측이 쥘 수도 있다(`openBlockKey` 를 넘기면) — 브라우저 뒤로가기로 창만 닫으려면
  // 창이 열린 것을 주소 기록에 남겨야 해서다(manager §8-10). 안 넘기면 종전처럼 캔버스가 쥔다.
  const controlled = openBlockKey !== undefined;
  const [localOpen, setLocalOpen] = useState(null);
  const openBlock = useMemo(
    () => (controlled ? (openBlockKey ? { key: openBlockKey } : null) : localOpen),
    [controlled, openBlockKey, localOpen],
  );
  const setOpenBlock = (block) => {
    if (!controlled) setLocalOpen(block);
    onOpenBlockChange?.(block ? block.key : null);
  };
  // 딥링크로 열린 모달을 사용자가 닫았는가 — 닫은 뒤 재조회로 되살아나지 않게.
  const [linkDismissed, setLinkDismissed] = useState(false);
  // 답한(해결된) 요청은 이 화면에서 뺀다 — 같은 대상으로 피드백을 보내면 사라진다(§3.4 · §3.6).
  const items = useMemo(
    () => (thread?.items || []).filter((i) => !(i.itemType === 'request' && i.resolvedAt)),
    [thread],
  );
  const { krBlocks, initBlocks, etc } = useMemo(() => groupBlocks(items, krs, initiatives), [items, krs, initiatives]);
  const openRequests = useMemo(() => items.filter((i) => i.itemType === 'request'), [items]);

  // 딥링크 진입(OKR 타인 KR 「전체 보기」 → `/feedback/team?member=…&kr=…`).
  // 멤버 뷰와 같은 규칙 — 열 블록은 **파생값**이고 state 로 복사하지 않는다.
  // 비교는 문자열 일치다(id 는 UUID 일 수 있다).
  const linkedBlock = useMemo(() => {
    if (linkDismissed || !openTarget?.type || !openTarget?.id) return null;
    const key = `${openTarget.type}:${openTarget.id}`;
    return [...krBlocks, ...initBlocks].find((b) => b.key === key) || null;
  }, [openTarget, krBlocks, initBlocks, linkDismissed]);

  // 도착 결과를 한 번만 알린다. 소비 측은 스레드 로딩이 끝난 뒤에 `openTarget` 을
  // 넘겨야 한다 — 로딩 중에 넘기면 «찾을 수 없음» 으로 잘못 판정된다.
  const notified = useRef(null);
  useEffect(() => {
    if (!openTarget?.type || !openTarget?.id) return;
    const key = `${openTarget.type}:${openTarget.id}`;
    if (notified.current === key) return;
    notified.current = key;
    onOpenTargetHandled?.(Boolean(linkedBlock));
    // 소비 측이 창을 쥐면 딥링크로 연 창도 넘긴다 — 그래야 뒤로가기가 이 창을 닫는다.
    // 그 뒤로는 소비 측의 `openBlockKey` 만 창을 연다(아래 liveBlock).
    if (controlled && linkedBlock) onOpenBlockChange?.(linkedBlock.key);
  }, [openTarget, linkedBlock, onOpenTargetHandled, controlled, onOpenBlockChange]);

  const liveBlock = useMemo(() => {
    const active = openBlock || (controlled ? null : linkedBlock);
    if (!active) return null;
    const found = [...krBlocks, ...initBlocks, ...(etc ? [etc] : [])].find((b) => b.key === active.key);
    if (found) return found;
    // 다시 읽은 뒤 블록이 사라졌으면(기타의 마지막 피드백을 지움 등) 창을 닫는다.
    // 소비 측이 준 키만 있고 블록이 아직 없으면(스레드 로딩 중) 열지 않는다.
    return active.items && active.type !== 'etc' ? active : null;
  }, [openBlock, controlled, linkedBlock, krBlocks, initBlocks, etc]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <button type="button" onClick={onBack} data-testid="fbmgr-back" style={{ border: 'none', background: 'none', color: C.accent, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0 }}>{L.back}</button>
        <Avatar name={member.name} photo={member.avatar} size={30} />
        <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{member.name}</span>
        <span style={{ marginLeft: 'auto' }}>
          <PeriodSelector periodKey={thread?.periodKey} options={thread?.periodOptions} isPastPeriod={thread?.isPastPeriod} onChange={(k) => { setOpenBlock(null); onChangePeriod(k); }} L={L} />
        </span>
      </div>
      {thread?.isPastPeriod && (
        <div data-testid="fbmgr-past-banner" style={{ background: C.amberBg, border: `1px solid ${C.amberBd}`, color: C.amber, borderRadius: 10, padding: '10px 12px', fontSize: 'var(--font-size-text-xs)' }}><ClockIcon size={12} /> {L.pastBanner}</div>
      )}
      <div data-testid="fbmgr-info-banner" style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 'var(--font-size-text-xs)', color: C.sub }}>
        <ChatIcon size={12} /> {fill(L.infoBanner, { name: member.name })}
      </div>
      {okrGroups.length > 0 && krBlocks.length > 0 && (
        <FeedbackOkrPanel groups={okrGroups} krBlocks={krBlocks} initBlocks={initBlocks} snippets={snippets} L={L} testIdPrefix="fbmgr" />
      )}
      <IncomingRequestsSection requests={openRequests} krBlocks={krBlocks} initBlocks={initBlocks} L={L} onAnswer={setOpenBlock} />
      {krBlocks.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: 0.5 }}>{L.sectionKr}</div>}
      {krBlocks.map((b) => <BlockCard key={b.key} block={b} L={L} onOpen={setOpenBlock} />)}
      {initBlocks.length > 0 && <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: 0.5, marginTop: 6 }}>{L.sectionInit}</div>}
      {initBlocks.map((b) => <BlockCard key={b.key} block={b} L={L} onOpen={setOpenBlock} />)}
      {etc && <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, letterSpacing: 0.5, marginTop: 6 }}>{L.sectionEtc}</div>}
      {etc && <BlockCard block={etc} L={L} onOpen={setOpenBlock} />}
      {krBlocks.length === 0 && initBlocks.length === 0 && !etc && <p className="evc-empty-sub">{L.emptyBlock}</p>}

      {liveBlock && (
        <ThreadModal block={liveBlock} member={member} memberName={member.name} L={L} isPastPeriod={thread?.isPastPeriod} onSend={onSend} onAiDraft={onAiDraft} onSummarize={onSummarize} onEditFeedback={onEditFeedback} onDeleteFeedback={onDeleteFeedback} onClose={() => { setOpenBlock(null); setLinkDismissed(true); }} />
      )}
    </div>
  );
}

export default function EvalFeedbackComposeCanvas({
  team = { members: [], summary: null },
  selectedMember = null,
  thread = null,
  krs = [],
  initiatives = [],
  // 팀원 OKR 컨텍스트 (§3.3) — Objective 그룹 `[{ id, unitLabel, title, progress, krIds }]` · 최근 스니핏 `[{ id, date, summary }]`
  okrGroups = [],
  snippets = [],
  labels: providedLabels,
  onSelectMember,
  onBack,
  openTarget = null,
  onOpenTargetHandled,
  onChangePeriod,
  onSendFeedback,
  onAiDraft,
  onSummarize,
  // 보낸 피드백 수정·삭제 (§3.8) — `(item, text)` · `(item)`. 실패는 던진다(말풍선이 받아 알린다).
  onUpdateFeedback,
  onDeleteFeedback,
  // 팀원 목록을 불러오는 중 / 못 불러왔다 (manager §5). 실패 안내는 소비 측이 띄운다.
  teamLoading = false,
  teamFailed = false,
  // 연 창(블록 key) — 넘기면 소비 측이 쥔다. 열고 닫을 때 onOpenBlockChange(key | null).
  openBlockKey,
  onOpenBlockChange,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const handleSend = async (payload) => {
    try {
      await onSendFeedback?.(payload);
      showToast(L.toastSent);
    } catch {
      showToast(L.toastError, 'error');
      throw new Error('send failed');
    }
  };

  // AI 초안 실패·빈 응답은 안내하고 null 을 준다 — 입력칸은 건드리지 않는다(manager §4.3·§8-9).
  const handleAiDraft = onAiDraft
    ? async (input) => {
        let res = null;
        try {
          res = await onAiDraft(input);
        } catch {
          res = null;
        }
        const draft = typeof res === 'string' ? res : res?.draft;
        if (!draft || !draft.trim()) {
          showToast(L.aiError, 'error');
          return null;
        }
        return res;
      }
    : undefined;

  return (
    <div className="evc-root" style={{ background: C.bg, fontFamily: FONT }}>
      {/* PW-983 — 공용 Toast 로 그린다(<body> 바로 아래). `.evc-root` 가 position: fixed 라 그 안에
          그리면 z-index 가 앱 위쪽 바를 넘지 못해 알림이 바 밑에 깔려 보이지 않았다(PW-978 과 같은 원인). */}
      <Toast
        message={toast?.msg}
        tone={toast?.type === 'success' ? 'success' : 'error'}
        data-testid="fbmgr-toast"
      />
      {/* 폭은 .evc-root 의 기본값(1080px)을 그대로 쓴다 — 수시 피드백 3화면과 정기 평가가
          같은 본문 폭이라야 탭을 옮길 때 내용의 좌우 끝이 움직이지 않는다 (PW-218). */}
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          <p className="evc-summary">{L.subtitle}</p>
        </div>
      </header>
      <div className="evc-list">
        {selectedMember ? (
          <ThreadScreen
            member={selectedMember}
            thread={thread}
            krs={krs}
            initiatives={initiatives}
            okrGroups={okrGroups}
            snippets={snippets}
            L={L}
            onBack={onBack}
            onChangePeriod={onChangePeriod}
            onSend={handleSend}
            onAiDraft={handleAiDraft}
            onSummarize={onSummarize}
            onEditFeedback={onUpdateFeedback}
            onDeleteFeedback={onDeleteFeedback}
            openTarget={openTarget}
            onOpenTargetHandled={onOpenTargetHandled}
            openBlockKey={openBlockKey}
            onOpenBlockChange={onOpenBlockChange}
          />
        ) : (
          <TeamListScreen team={team} L={L} onSelect={onSelectMember} loading={teamLoading} failed={teamFailed} />
        )}
      </div>
    </div>
  );
}
