import Icon from '../shared/Icon.jsx';
import rowKey from './rowKey.js';

/**
 * OkrAiInsights — 위험 신호 배너 + 신호 칩 목록.
 *
 * banner: { label, autoChip(bool), autoChipLabel, showRefresh(bool), refreshLabel }
 *   - 라벨은 소비 측이 정한다. 기획서 `okr-spec.md` §7.8 은 2026-07-16 정정으로
 *     이 카드에서 **'AI' 표기를 뺐다** — 고정 임계값 규칙이고 LLM 을 쓰지 않는다.
 *     전사는 '위험 신호 큐레이션'(칩 없음), 팀·개인은 '위험 신호' + '자동 분석' 칩.
 *   - showRefresh=false 로 우측 새로고침 아이콘을 숨길 수 있다(기본 true, non-breaking).
 *   - autoChipLabel·refreshLabel 은 소비 측 로케일을 받기 위한 것이다(기본 한국어).
 *
 * insights: [{ title, detail, action? }] — action 이 있으면 칩 우측에
 * 흰 배경 액션 버튼(예: '원온원 잡기')을 표시한다.
 *
 * onRefresh() — 주면 새로고침 아이콘이 눌리는 버튼이 된다. 안 주면 예전처럼
 * 아이콘만 그린다(시각 동일). onAction(insight, index) — 액션 버튼 클릭.
 */
export default function OkrAiInsights({
  banner = {},
  insights,
  icons,
  baseUrl = '',
  onRefresh,
  onAction,
}) {
  const {
    label = 'AI 인사이트',
    autoChip = true,
    autoChipLabel = '자동 분석',
    showRefresh = true,
    refreshLabel = '새로고침',
  } = banner;
  const refreshIcon = (
    <Icon src={icons.refreshCw} size={16} color="var(--utility-purple-500)" baseUrl={baseUrl} />
  );
  return (
    <div className="okr-p-ai">
      <div className="okr-p-ai-banner">
        <div className="okr-p-ai-label">
          <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span>{label}</span>
          {autoChip && <span className="okr-p-ai-chip-auto">{autoChipLabel}</span>}
        </div>
        {showRefresh && (
          onRefresh ? (
            <button
              type="button"
              className="okr-p-ai-refresh"
              onClick={onRefresh}
              aria-label={refreshLabel}
              title={refreshLabel}
            >
              {refreshIcon}
            </button>
          ) : (
            refreshIcon
          )
        )}
      </div>
      <div className="okr-p-ai-chips">
        {insights.map((insight, i) => (
          <div className="okr-p-ai-chip" key={rowKey(insight, i, 'title')}>
            <div className="okr-p-ai-chip-main">
              <p className="okr-p-ai-chip-title">{insight.title}</p>
              <p className="okr-p-ai-chip-detail">{insight.detail}</p>
            </div>
            {insight.action && (
              <button
                type="button"
                className="okr-p-ai-action"
                onClick={onAction ? () => onAction(insight, i) : undefined}
              >
                {insight.action}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
