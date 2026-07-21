import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';

/**
 * EvalFeedbackCanvas — 내 피드백 (멤버 뷰, v2 재설계).
 *
 * 탭식(받은/보낸/요청)을 폐기하고 **KR/이니셔티브 블록카드 + 스레드 모달** 모델로
 * 재구성한다(spec-feedback FB3). 각 블록은 해당 KR/이니셔티브에 연결된 피드백·요청을
 * 묶어 최신 미리보기 + 턴 인디케이터를 보이고, 클릭하면 시간순 스레드 모달이 열린다.
 * 기간(PeriodSelector)으로 과거 기록을 조회하며 과거 기간은 읽기 전용이다.
 *
 * 시안: pivit-specs G. 성과평과 & feedback/feedback-member-view.jsx (인라인 스타일 정본).
 */

// ── 색 토큰 (시안 member view C) ──
const C = {
  bg: '#F5F4F0',
  surface: '#FFFFFF',
  border: '#E8E4DC',
  borderL: '#F0EDE8',
  text: '#1C1917',
  sub: '#57534E',
  muted: '#A8A29E',
  teal: '#0D9488',
  tealBg: '#F0FDFA',
  tealBd: '#99F6E4',
  blue: '#2563EB',
  blueBg: '#EFF6FF',
  blueBd: '#BFDBFE',
  green: '#17b26a',
  greenBg: '#ecfdf3',
  greenBd: '#abefc6',
  rose: '#E11D48',
  roseBg: '#FFF1F2',
  roseBd: '#FECDD3',
  purple: '#7C3AED',
  purpleBg: '#F5F3FF',
  purpleBd: '#DDD6FE',
  amber: '#C46A00',
  amberBg: '#FFF4E0',
  amberBd: '#F5C97A',
};
const FONT = "'Pretendard','Noto Sans KR',sans-serif";

const DEFAULT_LABELS = {
  title: '내 피드백',
  periodLabel: '기간',
  pastBanner: '⏰ 과거 기록을 조회 중입니다. 피드백 요청은 현재 기간에서만 가능합니다.',
  infoBanner:
    'OKR을 달성해 가는 과정에 대한 수시 피드백 화면입니다. 목표 설정은 OKR 화면에서 진행하세요.',
  unreadSuffix: '읽지 않은 피드백',
  sectionKr: 'KEY RESULTS',
  sectionInit: 'INITIATIVES',
  sectionEtc: '기타',
  emptyBlock: '아직 피드백이 없어요 — 요청해 보세요',
  emptyBlockInit: '아직 피드백이 없어요',
  countSuffix: '건',
  myTurn: '내 차례',
  waiting: '대기',
  openThread: '스레드 열기 ›',
  threadEmpty: '이 항목에 연결된 피드백이 없어요',
  newBadge: '새 피드백',
  replyToggle: '답변 달기 ↩',
  replyPlaceholder: '답변을 작성하거나, 내용 없이 전송하면 확인 처리됩니다',
  replySend: '전송',
  replyConfirmed: '✓ 확인했습니다',
  requestTag: '요청',
  requestCompose: '+ 피드백 요청',
  requestTextPlaceholder: '어떤 부분에 대한 피드백이 필요한지…(선택 사항)',
  requestSendPrefix: '',
  requestSendSuffix: '에게 요청 전송 →',
  pastReadonly: '과거 기록에는 요청할 수 없습니다',
  kindManager: '매니저',
  kindPeer: '동료',
  toastSent: '전송했습니다',
  toastError: '오류가 발생했습니다',
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
  return C.rose;
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

function Avatar({ name, size = 30, gradient }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: gradient || `linear-gradient(135deg,${C.teal},${C.blue})`,
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
    </span>
  );
}

function Chip({ label, color, bg, bd }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color,
        background: bg,
        border: `1px solid ${bd || bg}`,
        borderRadius: 6,
        padding: '1px 7px',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}

// ── 블록 카드(KR/이니셔티브 공통) ──
function BlockCard({ block, L, onOpen }) {
  const isKr = block.type === 'kr';
  const items = block.items;
  const accent = isKr ? C.blue : C.purple;
  const accentBg = isKr ? C.blueBg : C.purpleBg;
  const accentBd = isKr ? C.blueBd : C.purpleBd;
  const barColor = isKr ? krColor(block.progress ?? 0) : C.purple;
  const latest = [...items]
    .sort((a, b) => new Date(a.sentAt) - new Date(b.sentAt))
    .slice(-2);
  const last = items[items.length - 1];
  // 턴: 마지막이 받은 피드백이고 미응답이면 내 차례. 마지막이 내 요청이면 대기.
  const isMyTurn =
    last && last.itemType === 'feedback' && !last.myReply;
  const isWaiting = last && last.itemType === 'request';

  return (
    <button
      type="button"
      className="fbm-block"
      onClick={() => onOpen(block)}
      data-testid={`fbm-block-${block.key}`}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${barColor}`,
        borderRadius: 12,
        padding: 14,
        cursor: 'pointer',
        fontFamily: FONT,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {isKr ? (
          <Chip label={block.badge} color={accent} bg={accentBg} bd={accentBd} />
        ) : (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.purple }}>
            # {block.title}
          </span>
        )}
        {isKr && (
          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>
            {block.title}
          </span>
        )}
        {isKr && (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 40, height: 4, background: C.borderL, borderRadius: 2, overflow: 'hidden' }}>
              <span style={{ display: 'block', width: `${block.progress ?? 0}%`, height: '100%', background: barColor }} />
            </span>
            <span style={{ fontSize: 11, color: C.sub }}>{block.progress ?? 0}%</span>
          </span>
        )}
      </div>

      {latest.length === 0 ? (
        <p style={{ fontSize: 12, fontStyle: 'italic', color: C.muted, margin: '4px 0' }}>
          {isKr ? L.emptyBlock : L.emptyBlockInit}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {latest.map((it) => (
            <div key={it.id} style={{ display: 'flex', gap: 8 }}>
              <Avatar
                name={it.person?.name}
                size={22}
                gradient={
                  it.itemType === 'feedback'
                    ? 'linear-gradient(135deg,#3B5BDB,#0F1E5C)'
                    : `linear-gradient(135deg,${C.teal},${C.blue})`
                }
              />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.sub }}>
                  <span style={{ fontWeight: 700, color: C.text }}>
                    {it.itemType === 'feedback' ? it.person?.name || '' : '나'}
                  </span>
                  {it.itemType === 'request' && (
                    <Chip label={L.requestTag} color={C.blue} bg={C.blueBg} bd={C.blueBd} />
                  )}
                  <span>{fmtDate(it.sentAt)}</span>
                </div>
                <p
                  style={{
                    fontSize: 12,
                    color: C.sub,
                    margin: '2px 0 0',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}
                >
                  {it.text || (it.itemType === 'request' ? '(내용 없는 요청)' : '')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: C.muted }}>
          {items.length}{L.countSuffix}
        </span>
        {isMyTurn && <Chip label={L.myTurn} color={C.teal} bg={C.tealBg} bd={C.tealBd} />}
        {!isMyTurn && isWaiting && (
          <Chip label={L.waiting} color={C.green} bg={C.greenBg} bd={C.greenBd} />
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: isKr ? C.teal : C.purple }}>
          {L.openThread}
        </span>
      </div>
    </button>
  );
}

// ── 스레드 모달 ──
function ThreadModal({ block, L, isPastPeriod, recipients, onReply, onRequest, onClose }) {
  const isKr = block.type === 'kr';
  const items = [...block.items].sort(
    (a, b) => new Date(a.sentAt) - new Date(b.sentAt),
  );
  const hasItems = items.length > 0;
  const barColor = isKr ? krColor(block.progress ?? 0) : C.purple;

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.42)',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        data-testid="fbm-thread-modal"
        style={{
          width: '100%',
          maxWidth: 620,
          maxHeight: '88vh',
          background: C.bg,
          borderRadius: '20px 20px 0 0',
          borderTop: `4px solid ${barColor}`,
          display: 'flex',
          flexDirection: 'column',
          fontFamily: FONT,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px', borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
            {isKr ? `${block.badge} · ${block.title}` : `# ${block.title}`}
          </span>
          {isKr && (
            <span style={{ fontSize: 12, color: C.sub }}>{block.progress ?? 0}%</span>
          )}
          <button
            type="button"
            onClick={onClose}
            data-testid="fbm-thread-close"
            style={{ marginLeft: 'auto', border: 'none', background: 'none', fontSize: 18, cursor: 'pointer', color: C.muted }}
          >
            ✕
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {!hasItems ? (
            <p style={{ textAlign: 'center', color: C.muted, fontSize: 13, padding: 24 }}>
              {L.threadEmpty}
            </p>
          ) : (
            items.map((it) =>
              it.itemType === 'feedback' ? (
                <FeedbackBubble key={it.id} item={it} L={L} isPastPeriod={isPastPeriod} onReply={onReply} />
              ) : (
                <RequestBubble key={it.id} item={it} L={L} />
              ),
            )
          )}
        </div>

        {isPastPeriod ? (
          !hasItems && (
            <div style={{ padding: 16, background: C.amberBg, color: C.amber, fontSize: 12, textAlign: 'center' }}>
              {L.pastReadonly}
            </div>
          )
        ) : (
          !hasItems && (
            <RequestCompose block={block} L={L} recipients={recipients} onRequest={onRequest} />
          )
        )}
      </div>
    </div>,
    document.body,
  );
}

function FeedbackBubble({ item, L, isPastPeriod, onReply }) {
  const [replying, setReplying] = useState(false);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const submitted = !!item.myReply;

  const send = async () => {
    setBusy(true);
    try {
      await onReply(item.id, draft.trim());
      setReplying(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Avatar name={item.person?.name} size={30} gradient="linear-gradient(135deg,#3B5BDB,#0F1E5C)" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, color: C.text }}>{item.person?.name}</span>
            {!item.isRead && <Chip label={L.newBadge} color={C.teal} bg={C.tealBg} bd={C.tealBd} />}
            <span style={{ color: C.muted }}>{fmtDate(item.sentAt)}</span>
          </div>
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: '0 10px 10px 10px', padding: 10, fontSize: 13, color: C.text, whiteSpace: 'pre-wrap' }}>
            {item.text}
          </div>
        </div>
      </div>

      {/* 내 답변(1개) */}
      {submitted ? (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
          <div style={{ background: C.tealBg, border: `1px solid ${C.tealBd}`, borderRadius: '10px 0 10px 10px', padding: '8px 10px', fontSize: 13, color: C.text, maxWidth: '80%' }}>
            {item.myReply.text || L.replyConfirmed}
          </div>
        </div>
      ) : (
        !isPastPeriod && (
          <div style={{ marginTop: 6, marginLeft: 38 }}>
            {!replying ? (
              <button
                type="button"
                onClick={() => setReplying(true)}
                data-testid={`fbm-reply-toggle-${item.id}`}
                style={{ border: 'none', background: 'none', color: C.teal, fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
              >
                {L.replyToggle}
              </button>
            ) : (
              <div>
                <textarea
                  rows={2}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={L.replyPlaceholder}
                  data-testid={`fbm-reply-text-${item.id}`}
                  style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, fontSize: 13, fontFamily: FONT, resize: 'vertical' }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={send}
                    data-testid={`fbm-reply-send-${item.id}`}
                    style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {L.replySend}
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
}

function RequestBubble({ item, L }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
      <div style={{ maxWidth: '80%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: C.sub, justifyContent: 'flex-end', marginBottom: 3 }}>
          <span>→ {item.person?.name} ({item.recipientKind === 'peer' ? L.kindPeer : L.kindManager})</span>
          <span>{fmtDate(item.sentAt)}</span>
        </div>
        <div style={{ background: C.blueBg, border: `1px solid ${C.blueBd}`, borderRadius: '10px 0 10px 10px', padding: 10, fontSize: 13, color: C.text }}>
          {item.text || <span style={{ color: C.muted }}>(내용 없는 요청)</span>}
          <div style={{ marginTop: 6 }}>
            <Chip label="피드백 요청" color={C.blue} bg="#fff" bd={C.blueBd} />
          </div>
        </div>
      </div>
    </div>
  );
}

function RequestCompose({ block, L, recipients, onRequest }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [recipient, setRecipient] = useState(
    recipients.find((r) => r.kind === 'manager') || recipients[0] || null,
  );
  const [busy, setBusy] = useState(false);

  if (recipients.length === 0) return null;

  const send = async () => {
    if (!recipient) return;
    setBusy(true);
    try {
      await onRequest({
        linkedTargetType: block.type,
        linkedTargetId: block.id,
        recipientId: recipient.id,
        recipientKind: recipient.kind,
        text: text.trim(),
      });
      setOpen(false);
      setText('');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div style={{ padding: 14, borderTop: `1px solid ${C.border}` }}>
        <button
          type="button"
          onClick={() => setOpen(true)}
          data-testid="fbm-request-open"
          style={{ width: '100%', border: `1px dashed ${C.blueBd}`, background: C.blueBg, color: C.blue, borderRadius: 8, padding: 10, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {L.requestCompose}
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 14, borderTop: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxHeight: 96, overflowY: 'auto' }}>
        {recipients.map((r) => {
          const on = recipient?.id === r.id;
          const col = r.kind === 'peer' ? C.teal : C.blue;
          const bg = r.kind === 'peer' ? C.tealBg : C.blueBg;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRecipient(r)}
              data-testid={`fbm-recipient-${r.id}`}
              style={{ border: `1px solid ${on ? col : C.border}`, background: on ? bg : '#fff', color: on ? col : C.sub, borderRadius: 16, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
            >
              {r.name} ({r.kind === 'peer' ? L.kindPeer : L.kindManager})
            </button>
          );
        })}
      </div>
      <textarea
        rows={2}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={L.requestTextPlaceholder}
        data-testid="fbm-request-text"
        style={{ border: `1px solid ${C.border}`, borderRadius: 8, padding: 8, fontSize: 13, fontFamily: FONT, resize: 'vertical' }}
      />
      <button
        type="button"
        disabled={!recipient || busy}
        onClick={send}
        data-testid="fbm-request-send"
        style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: recipient ? 'pointer' : 'not-allowed', opacity: recipient ? 1 : 0.5 }}
      >
        {(recipient?.kind === 'peer' ? L.kindPeer : L.kindManager) + L.requestSendSuffix}
      </button>
    </div>
  );
}

function PeriodSelector({ periodKey, options, isPastPeriod, onChange, L }) {
  if (!options || options.length === 0) return null;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: isPastPeriod ? C.amberBg : C.surface,
        border: `1px solid ${isPastPeriod ? C.amberBd : C.border}`,
        borderRadius: 8,
        padding: '4px 10px',
      }}
    >
      <span style={{ fontSize: 11, color: isPastPeriod ? C.amber : C.muted }}>{L.periodLabel}</span>
      <select
        value={periodKey}
        onChange={(e) => onChange(e.target.value)}
        data-testid="fbm-period"
        style={{ border: 'none', background: 'transparent', fontSize: 13, fontWeight: 600, color: isPastPeriod ? C.amber : C.text, fontFamily: FONT, cursor: 'pointer' }}
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
            {o.isCurrent ? '' : ' ⏰'}
          </option>
        ))}
      </select>
    </span>
  );
}

// ── 그룹핑: items → KR/Init/기타 블록 ──
function groupBlocks(items, krs, initiatives) {
  const byKey = new Map();
  for (const it of items) {
    const key =
      it.linkedTargetType && it.linkedTargetId
        ? `${it.linkedTargetType}:${it.linkedTargetId}`
        : 'etc';
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(it);
  }
  const krBlocks = krs.map((kr, i) => ({
    type: 'kr',
    id: kr.id,
    key: `kr:${kr.id}`,
    badge: kr.badge || `KR${i + 1}`,
    title: kr.title,
    progress: kr.progress ?? 0,
    items: byKey.get(`kr:${kr.id}`) || [],
  }));
  const initBlocks = initiatives.map((it) => ({
    type: 'init',
    id: it.id,
    key: `init:${it.id}`,
    title: it.title,
    items: byKey.get(`init:${it.id}`) || [],
  }));
  const etc = byKey.get('etc') || [];
  return { krBlocks, initBlocks, etc };
}

export default function EvalFeedbackCanvas({
  periodKey = '',
  periodOptions = [],
  isPastPeriod = false,
  onChangePeriod,
  krs = [],
  initiatives = [],
  items = [],
  recipients = [],
  meName = '',
  meRole = '',
  labels: providedLabels,
  onReply,
  onRequest,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [openBlock, setOpenBlock] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3000);
  }, []);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const { krBlocks, initBlocks, etc } = useMemo(
    () => groupBlocks(items, krs, initiatives),
    [items, krs, initiatives],
  );
  const unread = items.filter(
    (i) => i.itemType === 'feedback' && !i.isRead,
  ).length;

  // 모달이 열려 있으면 최신 items 로 블록을 다시 찾아 반영(답변/요청 후 재조회 대비).
  const liveBlock = useMemo(() => {
    if (!openBlock) return null;
    const all = [...krBlocks, ...initBlocks];
    return all.find((b) => b.key === openBlock.key) || openBlock;
  }, [openBlock, krBlocks, initBlocks]);

  const handleReply = async (itemId, text) => {
    try {
      await onReply?.(itemId, text);
      showToast(L.toastSent);
    } catch {
      showToast(L.toastError, 'error');
      throw new Error('reply failed');
    }
  };
  const handleRequest = async (payload) => {
    try {
      await onRequest?.(payload);
      showToast(L.toastSent);
    } catch {
      showToast(L.toastError, 'error');
      throw new Error('request failed');
    }
  };

  return (
    <div className="evc-root" style={{ background: C.bg, fontFamily: FONT }}>
      {toast && (
        <div className={`evc-toast ${toast.type === 'success' ? 'is-success' : 'is-error'}`} role="status">
          {toast.msg}
        </div>
      )}

      <div className="evc-header" style={{ maxWidth: 620 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Avatar name={meName || L.title} size={40} />
          <div>
            <h1 className="evc-title" style={{ fontSize: 16 }}>{L.title}</h1>
            {(meName || meRole) && (
              <p style={{ fontSize: 12, color: C.sub, margin: 0 }}>
                {meName}{meRole ? ` · ${meRole}` : ''}
              </p>
            )}
          </div>
          <span style={{ marginLeft: 'auto' }}>
            <PeriodSelector
              periodKey={periodKey}
              options={periodOptions}
              isPastPeriod={isPastPeriod}
              onChange={(k) => { setOpenBlock(null); onChangePeriod?.(k); }}
              L={L}
            />
          </span>
        </div>
      </div>

      <div className="evc-list" style={{ maxWidth: 620 }}>
        {isPastPeriod && (
          <div data-testid="fbm-past-banner" style={{ background: C.amberBg, border: `1px solid ${C.amberBd}`, color: C.amber, borderRadius: 10, padding: '10px 12px', fontSize: 12 }}>
            {L.pastBanner}
          </div>
        )}
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 12, color: C.sub }}>
          💬 {L.infoBanner}
        </div>
        {unread > 0 && (
          <div style={{ background: C.tealBg, border: `1px solid ${C.tealBd}`, color: C.teal, borderRadius: 10, padding: '10px 12px', fontSize: 13, fontWeight: 600 }} data-testid="fbm-unread">
            {unread}{L.countSuffix} {L.unreadSuffix}
          </div>
        )}

        {krBlocks.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, margin: '4px 0 -4px' }}>
              {L.sectionKr}
            </div>
            {krBlocks.map((b) => (
              <BlockCard key={b.key} block={b} L={L} onOpen={setOpenBlock} />
            ))}
          </>
        )}

        {initBlocks.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, letterSpacing: 0.5, margin: '8px 0 -4px' }}>
              {L.sectionInit}
            </div>
            {initBlocks.map((b) => (
              <BlockCard key={b.key} block={b} L={L} onOpen={setOpenBlock} />
            ))}
          </>
        )}

        {krBlocks.length === 0 && initBlocks.length === 0 && (
          <p className="evc-empty-sub">{L.emptyBlockInit}</p>
        )}
      </div>

      {liveBlock && (
        <ThreadModal
          block={liveBlock}
          L={L}
          isPastPeriod={isPastPeriod}
          recipients={recipients}
          onReply={handleReply}
          onRequest={handleRequest}
          onClose={() => setOpenBlock(null)}
        />
      )}
    </div>
  );
}
