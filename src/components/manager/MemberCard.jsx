import Icon from '../shared/Icon.jsx';
import SplineHero from './SplineHero.jsx';
import StatusBadge from './StatusBadge.jsx';
import { STATUS_COLORS } from './constants.js';

/**
 * 매니저 페이지의 멤버 카드.
 * 상단 Spline 헥사 + 이름/직급 + 코멘트 + 상태 배지 + 원온원/메시지 버튼.
 *
 * 본문(이름/직급/코멘트/배지/버튼) 은 Spline 로드와 무관하게 즉시 표시한다.
 * Spline 헥사는 본문 위에서 자체 spinner 를 보여주다 ready 시점에 fade-in 한다.
 *
 * 클릭은 카드 div 의 onClick 으로 일원화 — SplineHero 가 `<Spline>` canvas 를
 * 부모 문서에 직접 렌더하므로 (iframe 아님) canvas 클릭도 정상 버블된다.
 */
export default function MemberCard({
  name,
  role,
  comment,
  status,
  splineScene,
  splineImage,
  splineIndex = 0,
  icons,
  baseUrl = '',
  onCardClick,
  onOneOnOneClick,
  onMessageClick,
}) {
  const conf = STATUS_COLORS[status] ?? STATUS_COLORS.good;

  // 버튼 클릭 시 카드 onClick 으로 버블링되어 모달이 동시에 열리는 걸 막는다.
  const stop = (handler) => (e) => {
    e.stopPropagation();
    handler?.();
  };

  return (
    <div
      className="manager-member-card is-body-visible"
      onClick={onCardClick}
    >
      <SplineHero
        scene={splineScene}
        image={splineImage}
        index={splineIndex}
      />
      <div className="manager-member-body">
        <div className="manager-member-name-block">
          <p className="manager-member-name">{name}</p>
          <p className="manager-member-role">{role}</p>
        </div>
        <p className="manager-member-comment" style={{ color: conf.text }}>
          {comment}
        </p>
        <StatusBadge status={status} />
        <div className="manager-member-actions">
          <button type="button" className="manager-member-action-btn" onClick={stop(onOneOnOneClick)}>
            <Icon src={icons?.userOutline} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>원온원</span>
          </button>
          <button type="button" className="manager-member-action-btn" onClick={stop(onMessageClick)}>
            <Icon src={icons?.messageText} size={20} color="var(--text-secondary)" baseUrl={baseUrl} />
            <span>메시지</span>
          </button>
        </div>
      </div>
    </div>
  );
}
