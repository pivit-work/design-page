/**
 * 도는 표시 — 「기다리는 중」을 알리는 옅은 원 + 1/4 호 (PW-1010).
 *
 * 공용 버튼(요청 중)·온보딩·1on1 실시간 가이드·1on1 끝난 뒤 요약이 도는 표시를 각자 그려
 * 네 벌이었다(원호 · 테두리 원 둘 · 원 + 호). 한 벌로 모았고 모양은 온보딩 시안의 것이다.
 * 색은 부모의 글자색(`color`)을 따르고, 움직임 줄이기를 켠 사용자에게는 천천히 돈다
 * (`src/loading.css`).
 *
 * 늘 화면 읽기 프로그램에서 숨긴다 — 기다리는 중이라는 말은 옆 글이나 `aria-busy` 가 한다.
 *
 * @param {number} [size]     한 변 px (기본 16). 부모 글씨에 맞추려면 CSS 로 덮는다
 * @param {string} [className] 자리 잡기용 클래스를 덧붙인다
 */
export default function Spinner({ size = 16, className = '' }) {
  return (
    <svg
      className={['dp-spinner', className].filter(Boolean).join(' ')}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
