import { useState } from 'react';
import TeamSnippetSidebar from './TeamSnippetSidebar.jsx';
import TeamSnippetFeed from './TeamSnippetFeed.jsx';

/**
 * TeamSnippets — 매니저 팀 스니핏 탭 본문.
 * Figma 17026:25297 / 17421:18420 / 17421:19479 / 17421:20057.
 *
 * data: { periods: [string | { id, label }], redFlagCount, submitted: { done, total },
 *   members, weekHealth, aiSummary, byDate, byKr }
 *
 * 기간 칩·레드 플래그 토글·팀원 필터는 **안 넘기면** 여기서 UI 상태로 관리한다(데모).
 * 실데이터를 붙이는 소비자는 그 셋이 실제로 데이터를 걸러야 하므로 값과 바꾸는 함수를
 * 함께 넘겨 밖에서 소유한다(pivit-work PW-766):
 *   period + onPeriodChange · redFlagOnly + onRedFlagChange · memberFilter + onMemberFilterChange
 *
 * 조회 상태도 데이터를 가진 쪽만 안다:
 *   loading      true 면 사이드바·피드 대신 `labels.loading` 한 줄
 *   feedNotice   피드 위에 얹는 안내(불러오기 실패 등). 없으면 null
 *   emptyLabel   걸러진 스니핏이 0건일 때 피드 안에 띄우는 문구. 실패 중에는 안 넘긴다
 *
 * labels: { redFlag, todayStatus, submittedTotal, loading } — 안 넘기면 한국어 기본값.
 * testIds: { redFlag, submitted, empty } — 소비자 테스트가 잡는 자리.
 */
const DEFAULT_LABELS = {
  redFlag: '레드 플래그',
  todayStatus: '오늘 제출 현황',
};

const periodId = (p) => (typeof p === 'string' ? p : p.id);
const periodLabel = (p) => (typeof p === 'string' ? p : p.label);

export default function TeamSnippets({
  data,
  onOneOnOne,
  icons,
  baseUrl = '',
  period: periodProp,
  onPeriodChange,
  redFlagOnly: redFlagProp,
  onRedFlagChange,
  memberFilter: memberProp,
  onMemberFilterChange,
  loading = false,
  feedNotice = null,
  emptyLabel,
  labels: labelsProp,
  testIds = {},
}) {
  const labels = { ...DEFAULT_LABELS, ...labelsProp };
  const [periodState, setPeriodState] = useState('전체');
  const [redFlagState, setRedFlagState] = useState(false);
  const [memberState, setMemberState] = useState(null);

  const period = periodProp !== undefined ? periodProp : periodState;
  const setPeriod = onPeriodChange ?? setPeriodState;
  const redFlagOnly = redFlagProp !== undefined ? redFlagProp : redFlagState;
  const setRedFlagOnly = onRedFlagChange ?? setRedFlagState;
  const memberFilter = memberProp !== undefined ? memberProp : memberState;
  const setMemberFilter = onMemberFilterChange ?? setMemberState;

  return (
    <div className="mgr-ts">
      <div className="mgr-ts-chips">
        <div className="mgr-ts-seg">
          {data.periods.map((p) => (
            <button
              key={periodId(p)}
              type="button"
              className={`mgr-ts-seg-btn${period === periodId(p) ? ' is-active' : ''}`}
              onClick={() => setPeriod(periodId(p))}
            >
              {periodLabel(p)}
            </button>
          ))}
        </div>
        <button
          type="button"
          data-testid={testIds.redFlag}
          className={`mgr-ts-chip is-redflag${redFlagOnly ? ' is-active' : ''}`}
          onClick={() => setRedFlagOnly(!redFlagOnly)}
        >
          {labels.redFlag} <b>{data.redFlagCount}</b>
        </button>
      </div>

      <div className="mgr-ts-submit" data-testid={testIds.submitted}>
        <p className="mgr-ts-submit-label">{labels.todayStatus}</p>
        <p className="mgr-ts-submit-count">
          {data.submitted.done} / {labels.submittedTotal ?? `${data.submitted.total}명`}
        </p>
      </div>

      {loading ? (
        <p className="mgr-ts-loading" role="status">
          {labels.loading}
        </p>
      ) : (
        <div className="mgr-ts-body">
          <TeamSnippetSidebar
            members={data.members}
            weekHealth={data.weekHealth}
            aiSummary={data.aiSummary}
            selectedMember={memberFilter}
            onSelectMember={setMemberFilter}
            icons={icons}
            baseUrl={baseUrl}
          />
          <div className="mgr-ts-feedcol">
            {feedNotice}
            <TeamSnippetFeed
              icons={icons}
              baseUrl={baseUrl}
              byDate={data.byDate}
              byKr={data.byKr}
              memberFilter={memberFilter}
              redFlagOnly={redFlagOnly}
              onClearMember={() => setMemberFilter(null)}
              onClearRedFlag={() => setRedFlagOnly(false)}
              onOneOnOne={onOneOnOne}
              emptyLabel={emptyLabel}
              emptyTestId={testIds.empty}
            />
          </div>
        </div>
      )}
    </div>
  );
}
