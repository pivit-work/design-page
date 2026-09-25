import { clickableProps } from './kpiClickable.js';
import { SparkleGlyph } from '../shared/lineIcons.jsx';

/**
 * 매니저 페이지의 Summary KPI 카드 (col-span 3).
 * 보라 배경 + AI sparkle 아이콘 + 그라데이션 'Summary' 라벨 + 본문.
 *
 * sparkle 아이콘은 그라데이션 그림이라 design-page `shared/lineIcons.jsx` 의
 * `SparkleGlyph` 한 벌을 부른다(PW-1011).
 *
 * onClick 이 있으면 누를 수 있는 필터 카드가 된다 — `StatTile` 과 같은 규칙(PW-912).
 */

export default function SummaryCard({ text, onClick, active = false }) {
  const clickable = typeof onClick === 'function';
  return (
    <div
      className={`manager-kpi-card manager-summary-card${clickable ? ' is-clickable' : ''}${active ? ' is-active' : ''}`}
      {...clickableProps(clickable, onClick, active)}
    >
      <div className="manager-summary-label-row">
        <SparkleGlyph size={12} />
        <span className="manager-summary-label">Summary</span>
      </div>
      <p className="manager-summary-text">{text}</p>
    </div>
  );
}
