import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * MeetingSyncToast — 회의 목록 상단 중앙의 캘린더 동기화 경고 토스트.
 * Figma 17420:29469.
 *
 * 빨간 경고 아이콘 + 제목/부가 설명 + 재시도 링크 + 닫기(X).
 * body 포탈로 렌더해 리스트 위에 뜬다.
 *
 * 다른 화면의 같은 경고로도 쓴다 (PW-762 타임라인 불러오기 실패). 그래서:
 *   - onClose 를 안 주면 닫기(X)를 그리지 않는다 — 닫을 수 없는 경고도 있다
 *   - closeLabel 로 닫기 버튼의 읽는 이름을 바꿀 수 있다 (기본 '닫기')
 *   - 나머지 속성(data-* 등)은 겉 상자에 그대로 붙는다
 */
export default function MeetingSyncToast({
  title,
  detail,
  retryLabel = '재시도',
  onRetry,
  onClose,
  closeLabel = '닫기',
  baseUrl = '',
  ...rest
}) {
  return createPortal(
    <div className="meeting-sync-toast" role="alert" {...rest}>
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
      {onClose && (
        <button type="button" className="meeting-sync-toast-close" aria-label={closeLabel} onClick={onClose}>
          <Icon src="/icons-solid/x-close.svg" size={20} color="var(--text-tertiary)" baseUrl={baseUrl} />
        </button>
      )}
    </div>,
    document.body
  );
}
