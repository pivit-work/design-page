import Icon from '../shared/Icon.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
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
 *
 * onClose() — 주면 새로고침 오른쪽에 × 버튼을 단다(기획서 okr-spec §7.8 「닫기」 · pivit-work PW-1510).
 * 숨길지는 소비 측이 정한다 — 「세션 동안 숨김」이라 탭을 옮겨 다녀와도 숨은 채여야 해서
 * 이 부품 안 상태로 두지 않는다. banner.closeLabel 이 읽어 주는 이름(기본 「닫기」).
 */
export default function OkrAiInsights({
  banner = {},
  insights,
  icons,
  baseUrl = '',
  onRefresh,
  onAction,
  onClose,
}) {
  const {
    label = 'AI 인사이트',
    autoChip = true,
    autoChipLabel = '자동 분석',
    showRefresh = true,
    refreshLabel = '새로고침',
    closeLabel = '닫기',
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
          {autoChip && <StatusBadge className="okr-p-ai-chip-auto">{autoChipLabel}</StatusBadge>}
        </div>
        <div className="okr-p-ai-tools">
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
          {onClose && (
            // 새로고침 버튼과 같은 모양(16px · 보라 500 · 바탕 없음)을 쓴다.
            <button
              type="button"
              className="okr-p-ai-refresh"
              onClick={onClose}
              aria-label={closeLabel}
              title={closeLabel}
              data-testid="okr-ai-insights-close"
            >
              <Icon src={icons.xClose} size={16} color="var(--utility-purple-500)" baseUrl={baseUrl} />
            </button>
          )}
        </div>
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
