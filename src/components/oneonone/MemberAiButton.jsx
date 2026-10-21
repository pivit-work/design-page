import AiMark from '../shared/AiMark.jsx';

/**
 * 「✦ AI 생성」·「✦ AI 제안」 — 멤버 준비 화면의 AI 실행 버튼 (Figma 17416:28505 · 17556:25079).
 *
 * 보라 50 바탕에 AI 마크 + 그라디언트 「AI」 + 동작 낱말. 눌러야만 AI 가 돈다(policy §7.3 수동 트리거).
 * 딱지가 아니라 **누르는 것**이라 status-badge.css 가 아니라 one_on_one.css 에 산다.
 *
 * @param {string} label  동작 낱말 — 「생성」·「제안」. 로케일은 소비처에 있다.
 */
export default function MemberAiButton({ label, onClick, disabled = false, baseUrl = '', ariaLabel }) {
  return (
    <button
      type="button"
      className="ono-my-ai-btn"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
    >
      <AiMark size={14} baseUrl={baseUrl} />
      <span className="ono-my-ai-word" aria-hidden="true">AI</span>
      <span>{label}</span>
    </button>
  );
}
