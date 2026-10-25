import Button from '../shared/Button.jsx';

/**
 * 작은 "→" 액션 버튼 (직원 관리, 평가 관리, 연동 설정).
 * 모양은 공용 Button(secondary·sm) — 화살표 움직임만 admin.css 에 남았다.
 * 라벨에는 화살표를 포함하지 말 것 — i18n 안전을 위해 컴포넌트가 부착.
 */
export default function LinkButton({ children, onClick }) {
  return (
    <Button variant="secondary" size="sm" className="admin-link-button" onClick={onClick}>
      <span>{children}</span>
      <span className="admin-link-button-arrow" aria-hidden="true">→</span>
    </Button>
  );
}
