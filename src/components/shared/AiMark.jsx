import Icon from './Icon.jsx';

/**
 * AI 표시 아이콘 — 1on1 담당자 고르기 창의 「AI 추천」 태그(ManagerAssignModal `.ons-ai-tag`)에 디자이너가
 * 그린 아이콘 그대로(ai-chat-01 · 보라 500). 색만으로 AI 를 알리지 않게 AI 딱지·AI 버튼에 함께 붙인다 (PW-2035).
 */
export const AI_ICON_SRC = '/icons-solid/ai-chat-01.svg';

export default function AiMark({ size = 12, baseUrl = '', color = 'var(--utility-purple-500)' }) {
  return <Icon src={AI_ICON_SRC} size={size} color={color} baseUrl={baseUrl} />;
}
