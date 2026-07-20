import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * MeetingSyncToast — 회의 목록 상단 중앙의 캘린더 동기화 경고 토스트.
 * Figma 17420:29469.
 *
 * 빨간 경고 아이콘 + 제목/부가 설명 + 재시도 링크 + 닫기(X).
 * body 포탈로 렌더해 리스트 위에 뜬다.
 */
export default function MeetingSyncToast({
  title,
  detail,
  retryLabel = '재시도',
  onRetry,
  onClose,
  baseUrl = '',
}) {
  return createPortal(
    <div className="meeting-sync-toast" role="alert">
      <Icon
        src="/icons-solid/alert-circle.svg"
        size={20}
        color="var(--utility-error-500)"
        baseUrl={baseUrl}
        className="meeting-sync-toast-icon"
      />
      <div className="meeting-sync-toast-body">
        <p className="meeting-sync-toast-title">{title}</p>
        {detail && <p className="meeting-sync-toast-detail">{detail}</p>}
        {onRetry && (
          <button type="button" className="meeting-sync-toast-retry" onClick={onRetry}>
            {retryLabel}
          </button>
        )}
      </div>
      <button type="button" className="meeting-sync-toast-close" aria-label="닫기" onClick={onClose}>
        <Icon src="/icons-solid/x-close.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
      </button>
    </div>,
    document.body
  );
}
