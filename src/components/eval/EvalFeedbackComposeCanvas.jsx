import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TargetIcon, CpuIcon, MailIcon, SparkleIcon, ClockIcon } from './evalIcons';
import AvatarPhoto from './AvatarPhoto';

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
  bg: 'var(--bg-primary, #F7F8FA)',
  surface: 'var(--bg-quaternary, #FFFFFF)',
  border: 'var(--border-secondary, #E4E8EF)',
  borderL: 'var(--border-tertiary, #F0F2F6)',
  text: 'var(--text-primary, #0D1421)',
  sub: 'var(--text-secondary, #5A6478)',
  muted: 'var(--text-tertiary, #9AA3B2)',
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
  purple: 'var(--utility-purple-500, #7B2FBE)',
  purpleBg: 'var(--utility-purple-50, #F5EEFF)',
  purpleBd: 'var(--utility-purple-200, #D9C4F5)',
};
const FONT = "'Pretendard','Noto Sans KR',sans-serif";

const DEFAULT_LABELS = {
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
  pastBanner: '과거 기간을 조회 중입니다. 작성은 현재 기간에서만 가능합니다.',
  sectionKr: 'KEY RESULTS',
  sectionInit: 'INITIATIVES',
  emptyBlock: '이 KR에 연결된 피드백이 없어요',
  myTurn: '내 차례',
  waiting: '대기',
  openThread: '스레드 열기 ›',
  threadEmpty: '이 항목에 연결된 피드백이 없어요',
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
  toastError: '전송에 실패했습니다',
  aiError: 'AI 추천 생성에 실패했습니다. 직접 작성해 주세요.',
  emptyTeam: '직속 팀원이 없습니다.',
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
function initial(name) {
  return (name || '?').trim().charAt(0) || '?';
}
function Avatar({ name, photo, size = 36, gradient }) {
  return (
    <span
      style={{
        position: 'relative',
        width: size,
        height: size,
        borderRadius: '50%',
        background: gradient || 'linear-gradient(135deg,#3B5BDB,#0F1E5C)',
        color: '#fff',
        fontSize: size * 0.42,
        fontWeight: 700,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      {initial(name)}
      <AvatarPhoto photo={photo} name={name} />
    </span>
  );
}
function Chip({ label, color, bg, bd }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${bd || bg}`, borderRadius: 6, padding: '1px 7px', whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

// ── 팀 목록 화면 ──
function TeamListScreen({ team, L, onSelect }) {
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
            <div style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.sub, marginTop: 2 }}>{c.label}</div>
          </div>
        ))}
      </div>

      {members.length === 0 ? (
        <p className="evc-empty-sub">{L.emptyTeam}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map((m) => {
            const noFb = m.lastFeedbackAt == null;
            const over = !noFb && m.daysSince != null && m.daysSince >= 30;
            const badge = noFb
              ? { label: L.noFeedbackBadge, color: C.red, bg: C.redBg }
              : over
                ? { label: `${m.daysSince}${L.daysOver}`, color: C.amber, bg: C.amberBg }
                : { label: `${m.daysSince}${L.daysAgo}`, color: C.green, bg: C.greenBg };
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => onSelect(m)}
                data-testid={`fbmgr-member-${m.id}`}
                style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 12, cursor: 'pointer', textAlign: 'left', fontFamily: FONT }}
              >
                <Avatar name={m.name} photo={m.avatar} size={36} />
                <span style={{ fontSize: 'var(--font-size-text-sm, 14px)', fontWeight: 700, color: C.text }}>{m.name}</span>
                <Chip label={badge.label} color={badge.color} bg={badge.bg} bd={badge.bg} />
                {m.pendingRequests > 0 && (
                  <Chip label={<><MailIcon size={11} /> {`${L.requestChip} ${m.pendingRequests}`}</>} color={C.accent} bg={C.accentBg} bd={C.accentBd} />
                )}
                {m.department && <span style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.muted }}>{m.department}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 600, color: C.accent }}>{L.writeFeedback}</span>
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
  const items = block.items;
  const incoming = items.filter((i) => i.itemType === 'request');
  const barColor = isKr ? krColor(block.progress ?? 0) : C.purple;
  const latest = [...items].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt)).slice(-2);
  const hasMyTurn = incoming.length > 0;
  const hasFeedback = items.some((i) => i.itemType === 'feedback');

  return (
    <button
      type="button"
      onClick={() => onOpen(block)}
      data-testid={`fbmgr-block-${block.key}`}
      // 카드가 1080px 폭으로 넓어졌다 — 좌우 패딩만 소폭 키운다 (PW-218)
      style={{ display: 'block', width: '100%', textAlign: 'left', background: C.surface, border: `1px solid ${C.border}`, borderLeft: `3px solid ${barColor}`, borderRadius: 12, padding: '14px 18px', cursor: 'pointer', fontFamily: FONT }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isKr ? <Chip label={block.badge} color={C.accent} bg={C.accentBg} bd={C.accentBd} /> : <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}># {block.title}</span>}
        {isKr && <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{block.title}</span>}
        {isKr && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: PROGRESS_BAR_W, height: 4, background: C.borderL, borderRadius: 2, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${block.progress ?? 0}%`, height: '100%', background: barColor }} />
            </span>
            <span style={{ fontSize: 11, color: C.sub }}>{block.progress ?? 0}%</span>
          </span>
        )}
      </div>
      {latest.length === 0 ? (
        <p style={{ fontSize: 'var(--font-size-text-xs, 12px)', fontStyle: 'italic', color: C.muted, margin: '4px 0' }}>{L.emptyBlock}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {latest.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 8 }}>
              <Avatar name={it.itemType === 'request' ? it.author?.name : '나'} photo={it.author?.avatar} size={22} gradient={it.itemType === 'request' ? `linear-gradient(135deg,${C.accent},#2563EB)` : 'linear-gradient(135deg,#3B5BDB,#0F1E5C)'} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.sub }}>
                  <span style={{ fontWeight: 700, color: C.text }}>{it.itemType === 'request' ? it.author?.name : '나'}</span>
                  {it.itemType === 'request' && <Chip label={L.requestChip} color={C.accent} bg={C.accentBg} bd={C.accentBd} />}
                  <span>{fmtDate(it.sentAt)}</span>
                </div>
                <p style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.sub, margin: '2px 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {it.text || '(내용 없음)'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: C.muted }}>{items.length}{L.countSuffix}</span>
        {hasMyTurn && <Chip label={L.myTurn} color={C.red} bg={C.redBg} bd={C.redBg} />}
        {!hasMyTurn && hasFeedback && <Chip label={L.waiting} color={C.green} bg={C.greenBg} bd={C.greenBd} />}
        <span style={{ marginLeft: 'auto', fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 600, color: isKr ? C.accent : C.purple }}>{L.openThread}</span>
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

  const ai = async () => {
    if (!onAiDraft) return;
    setAiState('loading');
    try {
      const res = await onAiDraft({ recipientName: memberName, hint: text.trim() || `${block.title} 관련 피드백` });
      if (res) {
        setText(typeof res === 'string' ? res : res.draft);
        setPersonalized(typeof res === 'object' ? !!res.personalized : false);
        setAiState('done');
      } else {
        setAiState('idle');
      }
    } catch {
      setAiState('idle');
    }
  };
  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await onSend({ linkedTargetType: block.type, linkedTargetId: block.id, text: text.trim() });
      setText('');
      setAiState('idle');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <textarea
        rows={4}
        value={text}
        onChange={(e) => { setText(e.target.value); if (aiState === 'done') setAiState('idle'); }}
        placeholder={L.composePlaceholder}
        data-testid="fbmgr-compose-text"
        style={{ border: `1px solid ${aiState === 'done' ? C.accentBd : C.border}`, background: aiState === 'done' ? C.accentBg : '#fff', borderRadius: 8, padding: 10, fontSize: 13, fontFamily: FONT, resize: 'vertical', whiteSpace: 'pre-wrap' }}
      />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: C.muted }}>
          {aiState === 'done' ? L.aiHintDone : L.aiHintIdle}
        </span>
        {aiState === 'done' && personalized && (
          <Chip label={<><TargetIcon size={11} /> {L.aiPersonalized}</>} color={C.accent} bg={C.accentBg} bd={C.accentBd} />
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
            style={{ background: C.accent, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.5 }}
          >
            {L.send}
          </button>
        </span>
      </div>
      {aiState === 'done' && <p style={{ fontSize: 11, color: C.muted, margin: 0 }}><CpuIcon size={11} /> {L.aiFooter}</p>}
    </div>
  );
}

function FeedbackBubble({ item }) {
  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Avatar name="나" photo={item.author?.avatar} size={30} gradient="linear-gradient(135deg,#3B5BDB,#0F1E5C)" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-text-xs, 12px)', marginBottom: 3 }}>
            <span style={{ fontWeight: 700, color: C.text }}>나</span>
            <span style={{ color: C.muted }}>{fmtDate(item.sentAt)}</span>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '0 10px 10px 10px', padding: 10, fontSize: 13, color: C.text, whiteSpace: 'pre-wrap' }}>
            {item.text}
          </div>
        </div>
      </div>
      {item.memberReply && (
        <div style={{ marginLeft: 38, marginTop: 6 }}>
          <div style={{ background: C.borderL, border: `1px solid ${C.border}`, borderRadius: 10, padding: '8px 10px', fontSize: 13, color: C.text }}>
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
      <Avatar name={item.author?.name} photo={item.author?.avatar} size={30} gradient={`linear-gradient(135deg,${C.accent},#2563EB)`} />
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-text-xs, 12px)', marginBottom: 3 }}>
          <span style={{ fontWeight: 700, color: C.text }}>{item.author?.name}</span>
          <Chip label={<><MailIcon size={11} /> {L.incomingReq}</>} color={C.accent} bg={C.accentBg} bd={C.accentBd} />
          <span style={{ color: C.muted }}>{fmtDate(item.sentAt)}</span>
        </div>
        <div style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: '0 10px 10px 10px', padding: 10, fontSize: 13, color: C.text }}>
          {item.text || '(내용 없는 요청)'}
        </div>
      </div>
    </div>
  );
}

function ThreadModal({ block, memberName, L, isPastPeriod, onSend, onAiDraft, onSummarize, onClose }) {
  const isKr = block.type === 'kr';
  const items = [...block.items].sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt));
  const barColor = isKr ? krColor(block.progress ?? 0) : C.purple;
  const [summary, setSummary] = useState(null);
  const [summaryState, setSummaryState] = useState('idle'); // idle | loading | error
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
        setSummaryState('idle');
      } else {
        setSummaryState('error');
      }
    } catch {
      setSummaryState('error');
    }
  };

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'color-mix(in srgb, var(--bg-overlay, #111927) 45%, transparent)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={(e) => e.stopPropagation()} data-testid="fbmgr-thread-modal" style={{ width: '100%', maxWidth: 760, maxHeight: '88vh', background: C.bg, borderRadius: '20px 20px 0 0', borderTop: `4px solid ${barColor}`, display: 'flex', flexDirection: 'column', fontFamily: FONT }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{isKr ? `${block.badge} · ${block.title}` : `# ${block.title}`}</span>
          {isKr && <span style={{ fontSize: 'var(--font-size-text-xs, 12px)', color: C.sub }}>{block.progress ?? 0}%</span>}
          {onSummarize && (
            <button
              type="button"
              disabled={!canSummarize || summaryState === 'loading'}
              onClick={summarize}
              data-testid="fbmgr-summarize"
              title={canSummarize ? '' : '아직 대화가 충분하지 않습니다'}
              style={{ marginLeft: 'auto', border: `1px solid ${canSummarize ? C.accentBd : C.border}`, background: canSummarize ? C.accentBg : C.borderL, color: canSummarize ? C.accent : C.muted, borderRadius: 8, padding: '5px 10px', fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 600, cursor: canSummarize ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
            >
              {summaryState === 'loading' ? '⏳ 요약 중...' : <><SparkleIcon size={12} /> 대화 요약</>}
            </button>
          )}
          <button type="button" onClick={onClose} data-testid="fbmgr-thread-close" style={{ marginLeft: onSummarize ? 0 : 'auto', border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: C.muted }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {summary && (
            <div data-testid="fbmgr-summary" style={{ background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 'var(--font-size-text-xs, 12px)', fontWeight: 700, color: C.accent, marginBottom: 4 }}><SparkleIcon size={12} /> 대화 요약</div>
              <p style={{ fontSize: 13, color: C.text, margin: 0, whiteSpace: 'pre-wrap' }}>{summary.summaryText}</p>
            </div>
          )}
          {summaryState === 'error' && (
            <div style={{ background: C.redBg, color: C.red, borderRadius: 10, padding: 10, fontSize: 'var(--font-size-text-xs, 12px)' }}>
              대화 요약에 실패했습니다. 직접 스크롤하여 확인해 주세요.
            </div>
          )}
          {items.length === 0 ? (
            <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 24 }}>{L.threadEmpty}</p>
          ) : (
            items.map((it) => it.itemType === 'feedback' ? <FeedbackBubble key={it.id} item={it} /> : <RequestBubble key={it.id} item={it} L={L} />)
          )}
        </div>
        {isPastPeriod ? (
          <div style={{ padding: 16, background: C.amberBg, color: C.amber, fontSize: 'var(--font-size-text-xs, 12px)', textAlign: 'center' }}><ClockIcon size={12} /> {L.pastReadonly}</div>
        ) : (
          <ModalComposeBox block={block} memberName={memberName} L={L} onSend={onSend} onAiDraft={onAiDraft} />
        )}
      </div>
    </div>,
    document.body,
  );
}

function PeriodSelector({ periodKey, options, isPastPeriod, onChange, L }) {
  if (!options || options.length === 0) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: isPastPeriod ? C.amberBg : C.surface, border: `1px solid ${isPastPeriod ? C.amberBd : C.border}`, borderRadius: 8, padding: '4px 10px' }}>
      <span style={{ fontSize: 11, color: isPastPeriod ? C.amber : C.muted }}>{L.periodLabel}</span>
      <select value={periodKey} onChange={(e) => onChange(e.target.value)} data-testid="fbmgr-period" style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: isPastPeriod ? C.amber : C.text, fontFamily: FONT, cursor: 'pointer' }}>
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}{o.isCurrent ? '' : ' ⏰'}</option>
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
  return { krBlocks, initBlocks };
}

// ── 팀원 스레드 화면 ──
function ThreadScreen({ member, thread, krs, initiatives, L, onBack, onChangePeriod, onSend, onAiDraft, onSummarize }) {
  const [openBlock, setOpenBlock] = useState(null);
  const items = useMemo(() => thread?.items || [], [thread]);
  const { krBlocks, initBlocks } = useMemo(() => groupBlocks(items, krs, initiatives), [items, krs, initiatives]);
  const liveBlock = useMemo(() => {
    if (!openBlock) return null;
    return [...krBlocks, ...initBlocks].find((b) => b.key === openBlock.key) || openBlock;
  }, [openBlock, krBlocks, initBlocks]);

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
        <div data-testid="fbmgr-past-banner" style={{ background: C.amberBg, border: `1px solid ${C.amberBd}`, color: C.amber, borderRadius: 10, padding: '10px 12px', fontSize: 'var(--font-size-text-xs, 12px)' }}><ClockIcon size={12} /> {L.pastBanner}</div>
      )}
      {krBlocks.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5 }}>{L.sectionKr}</div>}
      {krBlocks.map((b) => <BlockCard key={b.key} block={b} L={L} onOpen={setOpenBlock} />)}
      {initBlocks.length > 0 && <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, marginTop: 6 }}>{L.sectionInit}</div>}
      {initBlocks.map((b) => <BlockCard key={b.key} block={b} L={L} onOpen={setOpenBlock} />)}
      {krBlocks.length === 0 && initBlocks.length === 0 && <p className="evc-empty-sub">{L.emptyBlock}</p>}

      {liveBlock && (
        <ThreadModal block={liveBlock} memberName={member.name} L={L} isPastPeriod={thread?.isPastPeriod} onSend={onSend} onAiDraft={onAiDraft} onSummarize={onSummarize} onClose={() => setOpenBlock(null)} />
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
  labels: providedLabels,
  onSelectMember,
  onBack,
  onChangePeriod,
  onSendFeedback,
  onAiDraft,
  onSummarize,
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

  return (
    <div className="evc-root" style={{ background: C.bg, fontFamily: FONT }}>
      {toast && (
        <div className={`evc-toast ${toast.type === 'success' ? 'is-success' : 'is-error'}`} role="status">{toast.msg}</div>
      )}
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
            L={L}
            onBack={onBack}
            onChangePeriod={onChangePeriod}
            onSend={handleSend}
            onAiDraft={onAiDraft}
            onSummarize={onSummarize}
          />
        ) : (
          <TeamListScreen team={team} L={L} onSelect={onSelectMember} />
        )}
      </div>
    </div>
  );
}
