import Icon from '../shared/Icon.jsx';
import EmptyState from '../shared/EmptyState.jsx';
import assetUrl from '../shared/assetUrl.js';
import { isEnterKey } from '../shared/enterKey.js';

/**
 * 「내 원온원」 지난 회차 목록 — Figma 17556:23218 (1on1 멤버 뷰).
 *
 * 머리(「{매니저} 매니저와의 지난 원온원」 · 「총 N회 · 회차를 선택해 기록을 확인하세요」)와
 * 행 목록. 회차가 하나도 없으면(Figma 17733:20292) 머리 아래 한가운데에 종이 일러스트 +
 * 「아직 완료된 1on1이 없습니다」 안내를 세운다 — 스니핏 빈 화면과 같은 시각 언어(paper-empty.svg). 행은 날짜 120 · 길이+액션 100 · 요약 + [기록보기] 로 나뉜다. AI 분석이 아직
 * 끝나지 않은 회차는 버튼 대신 「AI 분석 중」 글자만 둔다 — 눌러도 열 기록이 없어서다.
 *
 * 순수 컴포넌트다. 날짜·길이는 호스트가 **완성된 글자**로 넘긴다(시간대·로케일은 호스트에
 * 있다). 매니저 팀원 히스토리(`OneOnOneMemberCanvas` 의 HistoryScreen)와 design-page 데모가
 * 같은 부품을 쓴다.
 *
 * @param {object} props
 * @param {string} props.title            머리 제목
 * @param {string} [props.subtitle]       머리 부제
 * @param {Array<{ id, dateLabel, durationLabel, actionDone, actionTotal, summary, analyzing }>} props.sessions
 * @param {(session) => void} [props.onOpen]  [기록보기]
 * @param {{ id, dateLabel, durationLabel?, actionDone?, actionTotal?, summary, onOpen }} [props.current]
 *        **지금 진행 중인 회차** — 목록 맨 위에 파란 바탕(blue-50)으로 세우고, 버튼 자리에 「현재 진행 중」
 *        글자를 둔다(Figma 17556:23596). **행 전체**가 하나의 버튼이다 — 어디를 눌러도(글자·날짜·요약)
 *        `current.onOpen()` 으로 호스트가 진행 화면으로 보낸다(2026-10-24, 글자만 눌리던 걸 넓혔다).
 *        대상자가 진행 중에 목록으로 돌아와도 진행 중인 회차를 잃지 않게 한다(2026-10-23).
 * @param {{ open, analyzing, action, current }} [props.labels]
 * @param {string} [props.emptyTitle]     회차가 없을 때의 굵은 한 줄(「아직 완료된 1on1이 없습니다」)
 * @param {string} [props.emptyText]      회차가 없을 때의 설명. 제목이 없으면 이것이 제목 자리에 선다.
 *                                        둘 다 없으면 빈 목록을 그리지 않는다.
 * @param {string} [props.baseUrl]
 */
const DEFAULT_LABELS = { open: '기록보기', analyzing: 'AI 분석 중', action: '액션', current: '현재 진행 중' };

export default function OneOnOnePastSessionList({
  title,
  subtitle,
  sessions = [],
  current = null,
  onOpen,
  labels,
  emptyTitle,
  emptyText,
  baseUrl = '',
}) {
  const L = { ...DEFAULT_LABELS, ...(labels || {}) };
  const empty = sessions.length === 0 && !current;
  const stat = (s) => (
    <div className="ono-past-stat">
      {s.durationLabel && <span className="ono-past-duration">{s.durationLabel}</span>}
      {s.actionTotal > 0 && (
        <span className="ono-past-actions">
          <Icon src="/icons-solid/check.svg" size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
          <span>{L.action}</span>
          <span>{s.actionDone ?? 0}/{s.actionTotal}</span>
        </span>
      )}
    </div>
  );
  return (
    <section className={`ono-past${empty ? ' is-empty' : ''}`} data-testid="ono-past-list">
      <header className="ono-past-head">
        <h2 className="ono-past-title">{title}</h2>
        {subtitle && <p className="ono-past-subtitle">{subtitle}</p>}
      </header>
      {empty ? (
        emptyTitle || emptyText ? (
          <EmptyState
            className="ono-past-empty"
            data-testid="ono-past-empty"
            icon={<img className="ono-past-empty-paper" src={assetUrl(baseUrl, 'paper-empty.svg')} alt="" />}
            title={emptyTitle ?? emptyText}
            description={emptyTitle ? emptyText : undefined}
          />
        ) : null
      ) : (
        <div className="ono-past-list">
          {current && (
            <div
              className="ono-past-row is-current"
              role="button"
              tabIndex={0}
              aria-label={`${current.dateLabel} · ${L.current}`}
              onClick={() => current.onOpen?.(current)}
              onKeyDown={(e) => {
                if (isEnterKey(e) || e.key === ' ') { e.preventDefault(); current.onOpen?.(current); }
              }}
              data-testid="ono-history-current"
            >
              <div className="ono-past-date">{current.dateLabel}</div>
              {stat(current)}
              <div className="ono-past-main">
                <p className="ono-past-summary">{current.summary}</p>
                <span className="ono-past-current">{L.current}</span>
              </div>
            </div>
          )}
          {sessions.map((s) => (
            <div className="ono-past-row" key={s.id} data-testid="ono-history-row">
              <div className="ono-past-date">{s.dateLabel}</div>
              {stat(s)}
              <div className="ono-past-main">
                <p className="ono-past-summary">{s.summary}</p>
                {s.analyzing ? (
                  <span className="ono-past-analyzing" data-testid="ono-past-analyzing">{L.analyzing}</span>
                ) : (
                  <button type="button" className="ono-past-open" onClick={() => onOpen?.(s)}>
                    {L.open}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
