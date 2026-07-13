import Icon from '../shared/Icon.jsx';

/**
 * OkrAiInsights — AI 인사이트 배너 + 인사이트 칩 목록.
 * banner: { label('AI 인사이트'), autoChip(bool) } — 전사 OKR 은
 * 'AI 위험 신호 큐레이션' 라벨에 자동 분석 칩 없음.
 * insights: [{ title, detail, action? }] — action 이 있으면 칩 우측에
 * 흰 배경 액션 버튼(예: '원온원 잡기')을 표시한다.
 */
export default function OkrAiInsights({ banner = {}, insights, icons, baseUrl = '' }) {
  const { label = 'AI 인사이트', autoChip = true } = banner;
  return (
    <div className="okr-p-ai">
      <div className="okr-p-ai-banner">
        <div className="okr-p-ai-label">
          <Icon src={icons.aiChat} size={14} color="var(--utility-purple-500)" baseUrl={baseUrl} />
          <span>{label}</span>
          {autoChip && <span className="okr-p-ai-chip-auto">자동 분석</span>}
        </div>
        <Icon src={icons.refreshCw} size={16} color="var(--utility-purple-500)" baseUrl={baseUrl} />
      </div>
      <div className="okr-p-ai-chips">
        {insights.map((insight) => (
          <div className="okr-p-ai-chip" key={insight.title}>
            <div className="okr-p-ai-chip-main">
              <p className="okr-p-ai-chip-title">{insight.title}</p>
              <p className="okr-p-ai-chip-detail">{insight.detail}</p>
            </div>
            {insight.action && <button className="okr-p-ai-action">{insight.action}</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
