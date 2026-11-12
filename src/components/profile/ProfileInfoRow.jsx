import Button from '../shared/Button.jsx';

/**
 * 인사정보 탭의 한 줄 (Figma 17873:33240) — 왼쪽 80 이름표(12/700) · 오른쪽 값(16/400) · 아래 선.
 * 값이 여러 줄이면 이름표는 첫 줄 높이에 맞춰 선다(CSS). 줄 끝의 작은 버튼(`action`)은 호스트가 넣은 줄에만 —
 * 직함 줄의 [고치기](PW-1094)가 그렇다. 누르면 `onAction()`. 이 창을 닫지 않는다.
 */
export default function ProfileInfoRow({ label, children, action, onAction, testId, className = '' }) {
  return (
    <div className={`profile-row ${className}`.trim()} data-testid={testId}>
      <div className="profile-row-label">{label}</div>
      <div className="profile-row-value">
        <div className="profile-row-content">{children}</div>
        {action?.label && (
          <Button className="profile-row-action" aria-label={action.ariaLabel} onClick={() => onAction?.()}>
            {action.label}
          </Button>
        )}
      </div>
    </div>
  );
}
