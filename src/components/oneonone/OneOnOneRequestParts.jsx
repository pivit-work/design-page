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
 * - 매니저 대시보드 «1on1 신청» 묶음(2026-11-10 · 기획 v3.16) = 다른 묶음 머리 + 팀원 카드 판 · 사람 표시를
 *   나눔선 줄로 조합한 것(커트 시안). 버튼은 공용 버튼 sm, 사유 칸은 공용 입력칸 기본 모양.
 */

export const REQUEST_DEFAULT_LABELS = {
  requestButton: '1on1 신청',
  pendingChip: '신청함 · 응답 대기',
  cancel: '신청 취소',
  cancelFailed: '신청을 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  rowHead: '{sent} · {when} · {minutes}분',
  inboxHeading: '1on1 신청',
  inboxCount: '{count}건',
  cardChip: '1on1 신청',
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
 * 매니저 대시보드 맨 앞(«오늘 예정» 위) «1on1 신청 {N}건» 묶음 (pivit-work PW-2639 · 기획 v3.16 §13-10 «신청 묶음»).
 * 머리는 대시보드의 다른 묶음 머리(`.ono-section-heading-row` · stesslee)와 같고, 줄들은 팀원 카드와 같은 판
 * 하나 안에서 나눔선으로 나뉜다(커트 시안 2026-11-10). 줄이 없으면 호출부가 그리지 않는다.
 */
export function OneOnOneRequestInbox({ heading, countLabel, children }) {
  return (
    <section className="ono-section" data-testid="ono-request-inbox">
      <div className="ono-section-heading-row">
        <h2 className="ono-section-heading">{heading}</h2>
        <span className="ono-section-count ono-request-inbox-count">{countLabel}</span>
      </div>
      <div className="ono-request-inbox">{children}</div>
    </section>
  );
}

/**
 * 묶음의 한 줄 — 얼굴 · 이름 · 직급 / 보낸 날 · 희망 시기 · 길이 + 이야기 전문 / 버튼 셋.
 * [이번엔 어려워요]를 누르면 버튼 셋 자리를 사유 칸(선택 · 100자) · [취소] · [보내기]가 차지한다 —
 * 그동안 버튼 셋은 감춘다(한 신청에 응답이 둘 나가지 않게 · 기획 EC-MR15).
 *
 * @param {object} props
 * @param {{name: string, role?: string, avatar?: import('react').ReactNode}} props.member 줄 앞 사람 표시
 * @param {{sentLabel: string, whenLabel: string, minutes: number, text: string}} props.request
 * @param {boolean} props.canAdd 그 매니저가 잡은 시작 전 회차가 있을 때만 [잡아 둔 1on1 에 넣기]
 * @param {null|'add'|'decline'} [props.busy] 보내는 중인 응답 — 누른 버튼만 흐린다
 */
export function OneOnOneRequestRow({
  member,
  request,
  canAdd,
  onBook,
  onAdd,
  onDecline,
  busy = null,
  error = '',
  labels,
  rowRef,
  ...rest
}) {
  const L = { ...REQUEST_DEFAULT_LABELS, ...(labels || {}) };
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState('');
  return (
    <div className="ono-request-row" ref={rowRef} data-testid="ono-member-request" {...rest}>
      <div className="ono-member-identity ono-request-row-who">
        <div className="ono-member-avatar">{member?.avatar}</div>
        <div className="ono-member-name-block">
          <p className="ono-member-name">{member?.name}</p>
          {member?.role && <p className="ono-member-role">{member.role}</p>}
        </div>
      </div>
      <div className="ono-request-row-body">
        <p className="ono-member-request-head">
          {fill(L.rowHead, { sent: request.sentLabel, when: request.whenLabel, minutes: request.minutes })}
        </p>
        <p className="ono-member-request-text">{request.text}</p>
        {error && (
          <p className="ono-done-inline-error" role="alert" data-testid="ono-member-request-error">
            {error}
          </p>
        )}
      </div>
      {declining ? (
        <div className="ono-member-request-actions">
          {/* 공용 입력칸 기본 모양(dp-input · 회색 채움) 그대로 — className 을 넘기면 기본 모양이 빠진다. */}
          <div className="ono-request-row-reason">
            <TextInput
              value={reason}
              maxLength={100}
              placeholder={L.declineReason}
              aria-label={L.declineReason}
              onChange={(e) => setReason(e.target.value)}
              data-testid="ono-member-request-reason"
            />
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy === 'decline'}
            onClick={() => {
              setReason('');
              setDeclining(false);
            }}
            data-testid="ono-member-request-decline-cancel"
          >
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
    </div>
  );
}
