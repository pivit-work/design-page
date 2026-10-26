import AiMark from '../shared/AiMark.jsx';
import Spinner from '../shared/Spinner.jsx';

/**
 * 「✦ AI 생성」·「✦ AI 제안」 — 멤버 준비 화면의 AI 실행 버튼 (Figma 17416:28505 · 17556:25079).
 *
 * 보라 50 바탕에 AI 마크 + 그라디언트 「AI」 + 동작 낱말. 눌러야만 AI 가 돈다(policy §7.3 수동 트리거).
 * 딱지가 아니라 **누르는 것**이라 status-badge.css 가 아니라 one_on_one.css 에 산다.
 *
 * @param {string} label  동작 낱말 — 「생성」·「제안」. 로케일은 소비처에 있다.
 * @param {boolean} [pending]  요청 중 — 잠그되 흐리게 하지 않고 글자 옆에 공용 도는 표시(`Spinner`)를 붙인다.
 *   디자이너 원본에 «만드는 중» 모양이 없어 개발이 더한 칸이다 (design-review).
 * @param {string} [className]  자리 잡기용 클래스를 덧붙인다 (매니저 팀원 상세 창 「AI 브리핑」 탭 등)
 */
export default function MemberAiButton({ label, onClick, disabled = false, pending = false, baseUrl = '', ariaLabel, className = '' }) {
  return (
    <button
      type="button"
      className={['ono-my-ai-btn', pending ? 'is-pending' : '', className].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      aria-label={ariaLabel}
    >
      <AiMark size={14} baseUrl={baseUrl} />
      <span className="ono-my-ai-word" aria-hidden="true">AI</span>
      <span>{label}</span>
      {pending && <Spinner size={14} />}
    </button>
  );
}
