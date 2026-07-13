import Icon from '../shared/Icon.jsx';

/**
 * OkrAiInsights — AI 인사이트 배너 + 인사이트 칩 목록 (개인 OKR 탭).
 * insights: [{ title, detail }]
 */
export default function OkrAiInsights({ insights, icons, baseUrl = '' }) {
  return (
    <div className="okr-p-ai">
      <div className="okr-p-ai-banner">
        <div className="okr-p-ai-label">
          <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span>AI 인사이트</span>
          <span className="okr-p-ai-chip-auto">자동 분석</span>
        </div>
        <Icon src={icons.refreshCw} size={16} color="var(--utility-purple-500)" baseUrl={baseUrl} />
      </div>
      <div className="okr-p-ai-chips">
        {insights.map((insight) => (
          <div className="okr-p-ai-chip" key={insight.title}>
            <p className="okr-p-ai-chip-title">{insight.title}</p>
            <p className="okr-p-ai-chip-detail">{insight.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
