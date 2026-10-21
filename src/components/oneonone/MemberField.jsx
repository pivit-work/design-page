import StatusBadge from '../shared/StatusBadge.jsx';

/**
 * 멤버 준비 화면의 입력 칸 한 벌 — 제목 줄(제목 + 출처 딱지 + 오른쪽 보조) 과 본문
 * (작성 중이면 textarea · 제출 뒤면 읽기 상자). Figma 17416:28035(수동) · 17556:23962(AI 생성됨).
 *
 * 색의 뜻(policy §4.2.1 · §7.2):
 *  - 「직접 입력」 회색 딱지 = 팀원이 손으로 쓰는 칸.
 *  - 「AI 생성됨」 보라 딱지 + 보라 바탕 = AI 초안. 카드(보고서) 안에서는 바탕을 따로 칠하지 않는다 —
 *    카드 자체가 AI 영역이라 보라를 겹치면 칸이 묻힌다(Figma 17556:23913).
 *
 * @param {'lg'|'sm'} size   제목 크기 — 섹션 안 항목은 lg(18px), 카드·코멘트 안 항목은 sm(14px)
 * @param {'manual'|'ai'|'context'|null} badge  제목 옆 딱지. context 는 「전체 컨텍스트」(아젠다 AI 제안의 출처)
 * @param {boolean} editable  true 면 textarea, false 면 읽기 상자
 * @param {boolean} ai        본문이 AI 초안인가(보라 바탕). editable 이어도 초안이면 보라다
 * @param {boolean} inCard    보고서 카드 안 — AI 초안이어도 바탕을 칠하지 않는다
 * @param {ReactNode} aux     제목 줄 오른쪽(「직접 선택」·「✓ 작성됨」·AI 버튼)
 * @param {ReactNode} children  본문을 직접 그릴 때(역량 막대 등). 있으면 value/placeholder 는 쓰지 않는다
 */
export default function MemberField({
  title,
  size = 'lg',
  badge = null,
  badgeLabels,
  aux = null,
  editable = false,
  ai = false,
  inCard = false,
  value = '',
  placeholder = '',
  onChange,
  minHeight,
  children,
  testId,
}) {
  const L = badgeLabels ?? {};
  const badgeNode =
    badge === 'manual' ? (
      <StatusBadge tone="neutral" className="ono-done-badge">{L.manual ?? '직접 입력'}</StatusBadge>
    ) : badge === 'ai' ? (
      <StatusBadge tone="ai" className="ono-done-badge">{L.aiGenerated ?? 'AI 생성됨'}</StatusBadge>
    ) : badge === 'context' ? (
      <StatusBadge tone="ai" className="ono-done-badge">{L.fullContext ?? '전체 컨텍스트'}</StatusBadge>
    ) : null;
  const tinted = ai && !inCard;

  let body = children;
  if (body === undefined) {
    body = editable ? (
      <textarea
        className={`ono-my-textarea${tinted ? ' is-ai' : ''}`}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        style={minHeight ? { minHeight } : undefined}
        aria-label={title}
        data-testid={testId}
      />
    ) : (
      <p
        className={`ono-my-readbox${tinted ? ' is-ai' : ''}${value ? '' : ' is-empty'}`}
        data-testid={testId}
      >
        {value || placeholder}
      </p>
    );
  }

  return (
    <div className="ono-start-field">
      <div className="ono-my-field-head">
        <div className="ono-my-field-label-row">
          {size === 'lg' ? <h3 className="ono-my-h3">{title}</h3> : <span className="ono-my-label-sm">{title}</span>}
          {badgeNode}
        </div>
        {aux}
      </div>
      {body}
    </div>
  );
}
