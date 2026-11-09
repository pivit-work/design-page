import { useState } from 'react';
import Button from '../shared/Button.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import TextInput from '../shared/TextInput.jsx';
import Icon from '../shared/Icon.jsx';
import { fill } from './sessionHelpers.js';

/**
 * 팀원의 1on1 신청 — 화면 조각 둘 (pivit-work PW-2639 · oneonone-spec §13-10 · policy §6.8).
 *
 * 디자이너 원본이 없다. 그래서 새 모양을 그리지 않고 같은 화면의 디자이너 부품을 옮겨 쓴다:
 * - 팀원 머리 [1on1 신청] = 매니저 대시보드 [1on1 일정 추가](`.ono-add-btn` · stesslee)와 같은 자리 · 같은 모양
 *   (기획 v3.12 «자리» — arch-design-tokens §9-O-1 ① «우측 버튼»). 대기 중 칩은 공용 상태 딱지(«진행 중» 뜻),
 *   [신청 취소]는 공용 버튼 ghost.
 * - 매니저 카드 신청 줄 = 팀원 화면 «준비 완료» 띠(`.ono-my-ready-banner` · stesslee · Figma 17556:23843)의
 *   브랜드 테두리 · 글씨를 세로로 쌓은 것. 버튼은 공용 버튼 sm.
 */

export const REQUEST_DEFAULT_LABELS = {
  requestButton: '1on1 신청',
  pendingChip: '신청함 · 응답 대기',
  cancel: '신청 취소',
  cancelFailed: '신청을 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  rowHead: '1on1 신청 · {sent} · {when} · {minutes}분',
  book: '일정 잡기',
  add: '잡아 둔 1on1 에 넣기',
  decline: '이번엔 어려워요',
  declineReason: '사유 (선택)',
  declineSend: '보내기',
  declineCancel: '취소',
  respondFailed: '응답을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

/**
 * 팀원 1on1 화면 제목 줄 오른쪽 끝 — 대기 신청이 없으면 [1on1 신청], 있으면 칩 + [신청 취소].
 * «내 매니저»가 없으면 호출부가 그리지 않는다.
 */
export function MemberRequestHeaderSlot({
  pending,
  onOpen,
  onCancel,
  cancelling = false,
  error = '',
  labels,
  icons,
  baseUrl = '',
}) {
  const L = { ...REQUEST_DEFAULT_LABELS, ...(labels || {}) };
  if (!pending) {
    return (
      <button type="button" className="ono-add-btn" onClick={onOpen} data-testid="ono-request-open">
        <Icon src={icons?.plus} size={20} color="var(--text-white)" baseUrl={baseUrl} />
        <span>{L.requestButton}</span>
      </button>
    );
  }
  return (
    <div className="ono-request-pending" data-testid="ono-request-pending">
      <div className="ono-request-pending-row">
        {/* 칩은 1on1 화면의 작은 칩(.ono-mem-chip · 회색) — 막지 않는 안내라 중립 뜻. */}
        <StatusBadge tone="neutral" className="ono-mem-chip" data-testid="ono-request-pending-chip">{L.pendingChip}</StatusBadge>
        <Button variant="ghost" size="sm" pending={cancelling} onClick={onCancel} data-testid="ono-request-cancel">
          {L.cancel}
        </Button>
      </div>
      {error && (
        <p className="ono-done-inline-error" role="alert" data-testid="ono-request-cancel-error">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * 매니저 대시보드 팀원 카드 맨 위 신청 줄 — 보낸 날 · 희망 시기 · 길이 + 이야기 전문 + 버튼 셋.
 * [이번엔 어려워요]를 누르면 카드 안에 사유 칸(선택 · 100자)과 [보내기]가 펼쳐진다.
 *
 * @param {object} props
 * @param {{sentLabel: string, whenLabel: string, minutes: number, text: string}} props.request
 * @param {boolean} props.canAdd 그 매니저가 잡은 시작 전 회차가 있을 때만 [잡아 둔 1on1 에 넣기]
 * @param {null|'add'|'decline'} [props.busy] 보내는 중인 응답 — 누른 버튼만 흐린다
 */
export function OneOnOneRequestRow({
  request,
  canAdd,
  onBook,
  onAdd,
  onDecline,
  busy = null,
  error = '',
  labels,
}) {
  const L = { ...REQUEST_DEFAULT_LABELS, ...(labels || {}) };
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  const stop = (e) => e.stopPropagation();
  return (
    <div className="ono-member-request" onClick={stop} data-testid="ono-member-request">
      <p className="ono-member-request-head">
        {fill(L.rowHead, { sent: request.sentLabel, when: request.whenLabel, minutes: request.minutes })}
      </p>
      <p className="ono-member-request-text">{request.text}</p>
      {declining ? (
        <div className="ono-member-request-actions">
          <TextInput
            className="ono-member-request-reason"
            value={reason}
            maxLength={100}
            placeholder={L.declineReason}
            aria-label={L.declineReason}
            onChange={(e) => setReason(e.target.value)}
            data-testid="ono-member-request-reason"
          />
          <Button variant="secondary" size="sm" disabled={busy === 'decline'} onClick={() => setDeclining(false)}>
            {L.declineCancel}
          </Button>
          <Button
            variant="primary"
            size="sm"
            pending={busy === 'decline'}
            onClick={() => onDecline?.(reason)}
            data-testid="ono-member-request-decline-send"
          >
            {L.declineSend}
          </Button>
        </div>
      ) : (
        <div className="ono-member-request-actions">
          <Button variant="primary" size="sm" disabled={!!busy} onClick={onBook} data-testid="ono-member-request-book">
            {L.book}
          </Button>
          {canAdd && (
            <Button
              variant="secondary"
              size="sm"
              pending={busy === 'add'}
              disabled={!!busy && busy !== 'add'}
              onClick={onAdd}
              data-testid="ono-member-request-add"
            >
              {L.add}
            </Button>
          )}
          <Button
            variant="secondary"
            size="sm"
            disabled={!!busy}
            onClick={() => setDeclining(true)}
            data-testid="ono-member-request-decline"
          >
            {L.decline}
          </Button>
        </div>
      )}
      {error && (
        <p className="ono-done-inline-error" role="alert" data-testid="ono-member-request-error">
          {error}
        </p>
      )}
    </div>
  );
}
