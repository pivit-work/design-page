import Icon from '../shared/Icon.jsx';
import LoadMoreButton from '../shared/LoadMoreButton.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import MetricTile from './MetricTile.jsx';
import ProfileFailure from './ProfileFailure.jsx';
import withLockedHint from './lockedHint.jsx';

/**
 * 「액션 아이템」 탭 (PW-182).
 *
 * **읽기 전용이다.** 체크 표시는 상태를 보여줄 뿐이고 클릭에 반응하지 않는다 —
 * 상태는 담당자 본인만 바꾼다. 매니저가 팀원 할 일을 대신 관리하는 도구가 되면
 * 위임이 깨진다는 것이 이 화면의 전제다.
 *
 * 시안: `pivit-specs/기획서-UX-UI-UserFlow/I. 매니저-뷰/manager-view.jsx`
 * `DetailActionTab` — 3-그리드 요약 + 항목 행(체크·제목·우선순위·마감).
 *
 * 목록 끝 「더 보기」(pivit-work PW-1941) — 같은 창 스니핏 탭의 「더 보기」와 같은 모양·같은 약속이다.
 * `data.more` 가 `{ label, loadingLabel, loading }` 이면 버튼, `{ error: { message, retryLabel } }` 이면
 * 실패 문구와 [다시 시도]. 둘 다 `onMore` 로 간다. 더 남은 것이 없으면 호스트가 `more` 를 뺀다.
 */
export default function ActionItemsTab({ data, onMore, labels: L, baseUrl = '' }) {
  const items = data.items ?? [];
  const summary = data.summary ?? {};

  return (
    <div className="profile-tab-body">
      <div className="profile-trend-grid">
        <MetricTile label={L.actionTotal} value={summary.total ?? 0} />
        <MetricTile label={L.actionOpen} value={summary.open ?? 0} />
        <MetricTile label={L.actionDone} value={summary.done ?? 0} />
      </div>

      {items.length === 0 ? (
        <p className="profile-empty">{data.emptyLabel}</p>
      ) : (
        <div className="profile-action-list">
          {/* 진행자가 아닌 1on1 출처 행 (pivit-work PW-2486) — 눌리지 않고 마우스를 올리면 이유를 보인다. */}
          {items.map((item) => withLockedHint(item, (
            <div
              key={item.id}
              className={`profile-action-row ${item.done ? 'is-done' : ''}`.trim()}
              // 출처(회의·1on1)로 갈 수 있는 항목만 소비자가 `onOpen` 을 준다 — 행을 누르면 그리로 간다(기획 §6-7).
              {...(item.onOpen
                ? {
                    role: 'link',
                    tabIndex: 0,
                    style: { cursor: 'pointer' },
                    onClick: item.onOpen,
                    onKeyDown: (e) => { if (isEnterKey(e)) item.onOpen(); },
                  }
                : item.lockedHint
                  ? { tabIndex: 0, style: { cursor: 'default' } }
                  : {})}
            >
              {/* 체크박스가 아니라 상태 표시다 — button 이 아니므로 눌러도 반응하지 않는다. */}
              <span
                className="profile-action-check"
                role="img"
                aria-label={item.done ? L.actionDone : L.actionOpen}
              >
                {/* 디자이너가 그린 1on1 상세 창 액션 아이템 체크(.ood-action-check)와 같은 흰 체크 14px */}
                {item.done && (
                  <Icon src="/icons-solid/check.svg" size={14} color="var(--text-white)" baseUrl={baseUrl} />
                )}
              </span>
              <span className="profile-action-title">{item.title}</span>
              {item.sourceLabel && (
                <span className="profile-action-source">{item.sourceLabel}</span>
              )}
              {item.deadlineLabel && (
                <span
                  className={`profile-action-deadline ${
                    item.overdue ? 'is-overdue' : ''
                  }`.trim()}
                >
                  {item.deadlineLabel}
                </span>
              )}
            </div>
          )))}
        </div>
      )}

      {items.length > 0 && data.more && (
        data.more.error ? (
          <ProfileFailure notice={data.more.error} onRetry={onMore} />
        ) : (
          <LoadMoreButton
            label={data.more.label}
            loadingLabel={data.more.loadingLabel}
            loading={!!data.more.loading}
            onClick={onMore}
          />
        )
      )}
    </div>
  );
}
