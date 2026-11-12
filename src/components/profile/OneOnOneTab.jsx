import Button from '../shared/Button.jsx';
import MetricTile from './MetricTile.jsx';
import ProfileFailure from './ProfileFailure.jsx';
import OneOnOneRow from './OneOnOneRow.jsx';

/**
 * 「원온원」 탭 (Figma 17873:34244 · pivit-work PW-2486). 문구·날짜는 호스트가 만들어 넘긴다.
 *  - `data.loading` + `loadingLabel` · `data.error: { message, retryLabel }` — 인사정보 탭과 같은 모양
 *  - `items: [{ id, date, hostLabel, statusLabel, statusTone, title?, onOpen?, lockedHint? }]`
 *    `onOpen` 이 있는 행만 눌린다. `lockedHint` 가 있으면 눌리지 않고 마우스를 올리면 그 글을 보인다.
 *  - 항목이 없으면 `emptyLabel`, 그 아래 [일정 잡기]는 `onSchedule` 이 있을 때만.
 */
export default function OneOnOneTab({ data, onSchedule, onRetry, labels: L }) {
  if (data.loading) {
    return (
      <div className="profile-tab-body">
        <p className="profile-empty">{data.loadingLabel}</p>
      </div>
    );
  }
  if (data.error) {
    return (
      <div className="profile-tab-body">
        <ProfileFailure notice={data.error} onRetry={onRetry} />
      </div>
    );
  }
  const items = data.items ?? [];
  return (
    <div className="profile-tab-body">
      <div className="profile-trend-grid profile-oneonone-grid">
        <MetricTile label={L.lastOneOnOne} value={data.lastDate} />
      </div>

      {items.map((item, i) => (
        <OneOnOneRow key={item.id ?? i} item={item} />
      ))}

      {items.length === 0 && data.emptyLabel && (
        <div className="profile-oneonone-empty">
          <p className="profile-empty">{data.emptyLabel}</p>
          {onSchedule && (
            <Button variant="ghost" size="sm" onClick={onSchedule}>
              {L.oneOnOneSchedule}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
