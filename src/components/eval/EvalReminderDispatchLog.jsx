import { useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * EvalReminderDispatchLog — 예약 리마인더가 «나갔는지 · 왜 안 나갔는지» 보는 접힌 칸.
 * 정책 `screen-eval-cycle-hr.policy.md` §6.10 (PW-585).
 *
 * 순수 표현이다. 🔴 **상태 판정과 사유 문구를 여기서 만들지 않는다** — 서버에 상태 칼럼이
 * 없어서 「발송 완료 / 보낼 사람 없음 / 보내지 않음 / 발송 중」은 세 칸의 조합으로 갈리고,
 * 사유는 코드값이라 화면 문구로 바꿀 때 번역(t)이 필요하다. 둘 다 호출부가 하고, 여기는
 * 이미 사람이 읽는 말이 된 `rows` 를 받아 그린다.
 *
 * 기본은 **접힘**이다 — 평시에 보는 것이 아니라 「왜 안 왔나」를 물을 때 여는 자리다(§6.10.1).
 * 처음 펼칠 때 `onOpen` 을 한 번 부른다(그때 불러온다).
 */
export default function EvalReminderDispatchLog({
  /** `[{ id, badgeLabel, badgeTone, scheduledLabel, sentLabel, channelLabel, recipientLabel, noteLabel }]` */
  rows = [],
  count,
  title = '리마인더 발송 기록',
  loading = false,
  loadingLabel = '불러오는 중…',
  /** 기록이 아직 0건일 때의 한 줄 — 호출부가 「다음 예약: …」까지 담아 넘긴다(§6.10.6). */
  emptyLabel = '',
  error = null,
  retryLabel = '다시 시도',
  onRetry,
  onOpen,
  defaultOpen = false,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
  };
  // 🔴 아직 안 불러왔을 때 「0」을 적지 않는다 — 「기록이 없다」로 읽힌다. 호출부는 그때
  // `count` 를 주지 않는다.
  const shown = typeof count === 'number' ? count : rows.length > 0 ? rows.length : null;

  return (
    <div className="evmon-dispatch" data-testid="evmon-dispatch">
      <button
        type="button"
        className="evmon-dispatch-head"
        onClick={toggle}
        aria-expanded={open}
        data-testid="evmon-dispatch-toggle"
      >
        <span className="evmon-dispatch-title">{title}</span>
        {shown !== null && (
          <StatusBadge className="evc-status-badge tone-neutral">{shown}</StatusBadge>
        )}
        <span className={`evmon-dispatch-chevron${open ? ' is-open' : ''}`} aria-hidden="true">›</span>
      </button>
      {open && (
        <div className="evmon-dispatch-body">
          {error ? (
            <p className="evc-empty-sub" data-testid="evmon-dispatch-error">
              {error}
              {onRetry && (
                <button type="button" className="evc-btn is-ghost" onClick={() => onRetry()} data-testid="evmon-dispatch-retry">
                  {retryLabel}
                </button>
              )}
            </p>
          ) : loading ? (
            <p className="evc-empty-sub" data-testid="evmon-dispatch-loading">{loadingLabel}</p>
          ) : rows.length === 0 ? (
            <p className="evc-empty-sub" data-testid="evmon-dispatch-empty">{emptyLabel}</p>
          ) : (
            rows.map((r) => (
              <div className="evmon-dispatch-row" key={r.id} data-testid="evmon-dispatch-row">
                <StatusBadge className={`evc-status-badge ${r.badgeTone || 'tone-neutral'}`}>{r.badgeLabel}</StatusBadge>
                <span className="evmon-dispatch-when">{r.scheduledLabel}</span>
                <span className="evmon-dispatch-when">{r.sentLabel}</span>
                <span className="evmon-dispatch-channel">{r.channelLabel}</span>
                <span className="evmon-dispatch-count">{r.recipientLabel}</span>
                {/* 사유 — 안 보냈거나 받을 사람이 없었던 줄만. 빈칸을 그리면 「사유 없이
                    안 갔다」로 읽힌다(§6.10.2). 문구는 호출부가 만든다. */}
                {r.noteLabel && (
                  <span className="evmon-dispatch-note" data-testid="evmon-dispatch-note">{r.noteLabel}</span>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
