/**
 * 어드민 요약 카드 한 칸 — manager StatTile 톤 (라벨 + display 폰트 큰 다크 숫자 + sub).
 * onClick 이 있으면 클릭 가능한 필터 타일(active 시 강조).
 * tone 을 주면 숫자에 뜻 색을 입힌다 — success · info · warn · error · violet · muted (PW-760
 * CSV 가져오기 요약: 신규·갱신·빠진 사람·오류가 한눈에 갈려야 한다). 없으면 기존 다크 숫자.
 */
export default function AdminStatTile({ label, value, sub, onClick, active = false, tone }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      className={`admin-stat-tile${clickable ? ' is-clickable' : ''}${active ? ' is-active' : ''}${tone ? ` is-tone-${tone}` : ''}`}
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
