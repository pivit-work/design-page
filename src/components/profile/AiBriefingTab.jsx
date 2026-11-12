import Icon from '../shared/Icon.jsx';
import Button from '../shared/Button.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import AiFailBox from '../shared/AiFailBox.jsx';
import MemberAiButton from '../oneonone/MemberAiButton.jsx';
import MetricTile from './MetricTile.jsx';
import ProfileFailure from './ProfileFailure.jsx';

/**
 * 「AI 브리핑」 탭 (Figma 17873:33532) — 종합 브리핑 카드 · 1on1 추천 아젠다 · 지표 네 칸.
 *
 * `profile.aiBriefing` 이 없으면 예전처럼 `profile.aiBrief` 문장을 그대로 그린다(옛 호출 그대로).
 * 있으면 AI 브리핑을 버튼으로만 만드는 화면이 된다 (pivit-work PW-1531 · 기획 policy §6-3). 문구는
 * 호스트가 전부 만들어 넘긴다 — 캔버스는 i18n 도, 보관 기간도 모른다.
 *  - `{ status: 'loading', loadingLabel }` — 보관본을 불러오는 중
 *  - `{ status: 'loadError', loadError: { message, retryLabel } }` — 불러오지 못했다. 다시 시도는 `onReload`
 *  - `{ status: 'empty', emptyText, generateLabel }` — 보관본이 없다. 버튼이 `onGenerate`
 *  - `{ status: 'ready', content, updatedLabel?, sources?, refreshLabel, agendaEmptyText }` — 오른쪽 위
 *    새로고침이 `onGenerate`. `updatedLabel` 은 「마지막 업데이트: N시간 전」처럼 이전 브리핑을 보일 때만
 *  - 공통 `generating` — 생성 중(버튼 잠금 + 도는 표시), `error: { title, message, retryLabel }` — AI 실패.
 *    재생성도 `onGenerate`
 * `notice` 는 카드 바로 아래에 그대로 놓는다(체험 AI 소진 안내).
 */
export default function AiBriefingTab({ profile, agendas = [], icons, baseUrl = '', onGenerate, onReload, notice, labels: L }) {
  const ai = profile.aiBriefing;
  const ready = !ai || ai.status === 'ready';
  return (
    <div className="profile-tab-body">
      <div className="profile-brief-card" data-testid="manager-ai-briefing">
        <div className="profile-brief-label-row">
          <Icon src={icons?.summarySparkle || '/icons-solid/ai-chat-01.svg'} size={12} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span className="profile-brief-label">{L.briefingTitle}</span>
          {ai?.status === 'ready' && ai.updatedLabel && (
            <span className="profile-brief-updated">{ai.updatedLabel}</span>
          )}
          {ai?.status === 'ready' && (
            // 디자이너가 그린 AI 띠의 새로고침 — 바탕 없는 16px 보라 refresh-cw 하나
            // (okr OkrDetailModal·OkrAiInsights, stesslee). 공용 버튼은 잠금만 얹는다.
            <Button
              className="profile-brief-refresh"
              aria-label={ai.refreshLabel}
              title={ai.refreshLabel}
              pending={!!ai.generating}
              onClick={() => onGenerate?.()}
            >
              <Icon src="/icons-solid/refresh-cw-01.svg" size={16} color="var(--utility-purple-500)" baseUrl={baseUrl} />
            </Button>
          )}
        </div>

        {ai?.status === 'loading' && <p className="profile-brief-text">{ai.loadingLabel}</p>}
        {ai?.status === 'loadError' && <ProfileFailure notice={ai.loadError} onRetry={onReload} />}
        {ai?.status === 'empty' && (
          <>
            <p className="profile-brief-text">{ai.emptyText}</p>
            {/* 디자이너가 그린 AI 실행 버튼 「✦ AI ○○」 (oneonone MemberAiButton, stesslee). 호스트는 동작 낱말만 넘긴다. */}
            <MemberAiButton
              className="profile-brief-generate"
              label={ai.generateLabel}
              ariaLabel={`AI ${ai.generateLabel}`}
              pending={!!ai.generating}
              onClick={() => onGenerate?.()}
              baseUrl={baseUrl}
            />
          </>
        )}
        {ready && <p className="profile-brief-text">{ai ? ai.content : profile.aiBrief}</p>}
        {ready && ai?.sources?.length > 0 && (
          <div className="profile-snippet-tags profile-brief-sources">
            {ai.sources.map((label) => (
              <StatusBadge key={label} className="manager-modal-snippet-tag">{label}</StatusBadge>
            ))}
          </div>
        )}
        {ai?.error && (
          <AiFailBox
            title={ai.error.title}
            message={ai.error.message}
            retryLabel={ai.error.retryLabel}
            retryDisabled={!!ai.generating}
            onRetry={() => onGenerate?.()}
            testId="manager-ai-briefing-failed"
          />
        )}
      </div>

      {notice}

      {ready && agendas.map((a, i) => (
        <div key={i} className="profile-agenda-item">
          {i === 0 && <p className="profile-section-title">{L.agendaTitle}</p>}
          <div className="profile-agenda-content">
            <p className="profile-agenda-heading">{i + 1}. {a.title}</p>
            <p className="profile-agenda-question">{a.question}</p>
          </div>
        </div>
      ))}
      {ai?.status === 'ready' && agendas.length === 0 && ai.agendaEmptyText && (
        <p className="profile-empty">{ai.agendaEmptyText}</p>
      )}

      {profile.metrics && (
        <div className="profile-metrics-section">
          <div className="profile-metrics-grid">
            <MetricTile label={L.metricHealthAvg} value={profile.metrics.healthAvg} />
            <MetricTile label={L.metricSnippetStreak} value={profile.metrics.snippetStreak} />
            <MetricTile label={L.metricLastOneOnOne} value={profile.metrics.lastOneOnOne} />
            <MetricTile label={L.metricKrProgress} value={profile.metrics.krProgress} />
          </div>
        </div>
      )}
    </div>
  );
}
