import EmptyState from '../shared/EmptyState.jsx';
import OkrHistoryQuarter from './OkrHistoryQuarter.jsx';
import rowKey from './rowKey.js';

/**
 * OkrHistoryList — 지난 분기 OKR 목록. 개인·팀·전사 세 캔버스가 이 하나를 쓴다 (PW-1505).
 *
 * history 의 세 값을 가른다:
 *   null/undefined — 아직 못 받았거나 전부 실패. 아무것도 그리지 않는다(«없습니다»로 읽히면 안 된다).
 *   []             — 받았는데 0건. 「OKR 히스토리가 없습니다」(okr-spec 히스토리 표 「빈 상태」 — 공용 EmptyState 점선 칸).
 *   [...]          — 분기 카드 목록.
 * emptyLabel: 빈 상태 문구. 앱이 ko/en 을 넘긴다.
 */
export default function OkrHistoryList({ history, icons, baseUrl = '', emptyLabel = 'OKR 히스토리가 없습니다' }) {
  if (!history) return null;
  if (history.length === 0) {
    return <EmptyState description={emptyLabel} data-testid="okr-history-empty" />;
  }
  return (
    <div className="okr-h-list">
      {history.map((quarter, i) => (
        <OkrHistoryQuarter key={rowKey(quarter, i, 'label')} quarter={quarter} icons={icons} baseUrl={baseUrl} />
      ))}
    </div>
  );
}
