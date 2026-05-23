/**
 * 작은 "→" 액션 버튼 (직원 관리, 평가 관리, 연동 설정).
 * design-system Button size-sm + tertiary 톤 — 보더리스, 연회색 배경.
 * 라벨에는 화살표를 포함하지 말 것 — i18n 안전을 위해 컴포넌트가 부착.
 */
export default function LinkButton({ children, onClick }) {
  return (
    <button type="button" className="admin-link-button" onClick={onClick}>
      <span>{children}</span>
      <span className="admin-link-button-arrow" aria-hidden="true">→</span>
    </button>
  );
}
