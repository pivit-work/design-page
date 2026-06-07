/**
 * 어드민 카드 컨테이너 — 흰 배경 + soft shadow + radius-2xl.
 * design-page 의 effects.shadow-sm 정의를 따른다.
 */
export default function Card({ children, className = '' }) {
  return (
    <section className={`admin-card${className ? ` ${className}` : ''}`}>
      {children}
    </section>
  );
}
