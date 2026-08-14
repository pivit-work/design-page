import { useState } from 'react';
import TeamSnippetSidebar from './TeamSnippetSidebar.jsx';
import TeamSnippetFeed from './TeamSnippetFeed.jsx';

/**
 * TeamSnippets — 매니저 팀 스니핏 탭 본문.
 * Figma 17026:25297 / 17421:18420 / 17421:19479 / 17421:20057.
 *
 * data: { periods: [string], redFlagCount, submitted: { done, total },
 *   members, weekHealth, aiSummary, byDate, byKr }
 * 기간 칩·레드 플래그 토글·팀원 필터는 UI 상태로 여기서 관리한다.
 */
export default function TeamSnippets({ data, onOneOnOne, icons, baseUrl = '' }) {
  const [period, setPeriod] = useState('전체');
  const [redFlagOnly, setRedFlagOnly] = useState(false);
  const [memberFilter, setMemberFilter] = useState(null);

  return (
    <div className="mgr-ts">
      <div className="mgr-ts-chips">
        <div className="mgr-ts-seg">
          {data.periods.map((p) => (
            <button
              key={p}
              type="button"
              className={`mgr-ts-seg-btn${period === p ? ' is-active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          type="button"
          className={`mgr-ts-chip is-redflag${redFlagOnly ? ' is-active' : ''}`}
          onClick={() => setRedFlagOnly((v) => !v)}
        >
          레드 플래그 <b>{data.redFlagCount}</b>
        </button>
      </div>

      <div className="mgr-ts-submit">
        <p className="mgr-ts-submit-label">오늘 제출 현황</p>
        <p className="mgr-ts-submit-count">{data.submitted.done} / {data.submitted.total}명</p>
      </div>

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
        />
      </div>
    </div>
  );
}
