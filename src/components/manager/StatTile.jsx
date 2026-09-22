import { clickableProps } from './kpiClickable.js';

/**
 * 매니저 페이지 KPI 단일 통계 타일.
 * label + value 2단.
 *
 * onClick 이 있으면 누를 수 있는 필터 타일이 된다(active 면 눌린 모양). 눌린 모양과
 * 키보드 동작은 어드민 개요 요약 카드(`AdminStatTile`)와 같다 — 같은 모양의 카드가
 * 화면마다 다르게 눌리면 안 된다(PW-912).
 */
export default function StatTile({ label, value, onClick, active = false }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      className={`manager-kpi-card manager-stat-tile${clickable ? ' is-clickable' : ''}${active ? ' is-active' : ''}`}
      {...clickableProps(clickable, onClick, active)}
    >
      <p className="manager-stat-label">{label}</p>
      <p className="manager-stat-value">{value}</p>
    </div>
  );
}
