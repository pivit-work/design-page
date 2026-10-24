import { SparkleGlyph } from '../shared/lineIcons.jsx';

/**
 * 매니저 페이지의 Summary KPI 카드 (col-span 3).
 * 보라 배경 + AI sparkle 아이콘 + 그라데이션 'Summary' 라벨 + 본문.
 *
 * sparkle 아이콘은 그라데이션 그림이라 design-page `shared/lineIcons.jsx` 의
 * `SparkleGlyph` 한 벌을 부른다(PW-1011).
 *
 * 누를 수 없는 카드다 — PW-912 의 누르기는 디자이너 요청으로 걷어 냈다(PW-2177).
 */

export default function SummaryCard({ text }) {
  return (
    <div className="manager-kpi-card manager-summary-card">
      <div className="manager-summary-label-row">
        <SparkleGlyph size={12} />
        <span className="manager-summary-label">Summary</span>
      </div>
      <p className="manager-summary-text">{text}</p>
    </div>
  );
}
