/**
 * 어드민 요약 카드 한 칸 — manager StatTile 톤 (라벨 + display 폰트 큰 다크 숫자 + sub).
 * onClick 이 있으면 클릭 가능한 필터 타일(active 시 강조).
 */
export default function AdminStatTile({ label, value, sub, onClick, active = false }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      className={`admin-stat-tile${clickable ? ' is-clickable' : ''}${active ? ' is-active' : ''}`}
      onClick={clickable ? onClick : undefined}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={clickable ? { cursor: 'pointer' } : undefined}
    >
      <p className="admin-stat-label">{label}</p>
      <p className="admin-stat-value">{value}</p>
      {sub && <p className="admin-stat-sub">{sub}</p>}
    </div>
  );
}
