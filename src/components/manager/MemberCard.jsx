import { useCallback, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import SplineHero from './SplineHero.jsx';
import StatusBadge from './StatusBadge.jsx';
import { STATUS_COLORS } from './constants.js';

/**
 * 매니저 페이지의 멤버 카드.
 * 상단 Spline 영역 + 이름/직급 + 코멘트 + 상태 배지 + 원온원/메시지 버튼.
 *
 * spline 인트로가 시작되는 시점에 본문 영역(이름/코멘트/배지/버튼)도 함께 fade-in.
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
  const [bodyVisible, setBodyVisible] = useState(false);
  const handleStart = useCallback(() => setBodyVisible(true), []);

  // 버튼 클릭 시 카드 onClick 으로 버블링되어 모달이 동시에 열리는 걸 막는다.
  const stop = (handler) => (e) => {
    e.stopPropagation();
    handler?.();
  };

  return (
    <div
      className={`manager-member-card ${bodyVisible ? 'is-body-visible' : ''}`}
      onClick={onCardClick}
    >
      <SplineHero
        scene={splineScene}
        image={splineImage}
        baseUrl={baseUrl}
        index={splineIndex}
        onClick={onCardClick}
        onStart={handleStart}
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
