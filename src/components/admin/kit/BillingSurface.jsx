import StatusBadge from '../../shared/StatusBadge.jsx';

/**
 * 결제 화면들이 함께 쓰는 흰 카드와 작은 딱지 (PW-1010).
 *
 * 어드민 › 결제·구독의 일곱 화면(개요·요금제·결제 수단·청구 내역·청구 설정·결제하기·영업 문의)이
 * 같은 `Card` 를 글자까지 똑같이 일곱 벌, 같은 `Badge` 를 다섯 벌 복사해 두고 있었다. 한 곳을
 * 고쳐도 나머지는 그대로 남아 화면마다 갈라지므로 여기 한 벌로 모았다.
 *
 * 생김새는 옮기기 전 값 그대로다 — 모으기만 하고 모양은 바꾸지 않는다(카드 본문).
 * 딱지는 공용 상태 딱지(`StatusBadge`)로 그리되, 결제 화면의 색은 뜻→색 표의 색과 달라
 * (결제 화면만의 초록·주황·보라) 화면이 넘긴 색을 그대로 칠한다. 색을 표에 맞추는 것은
 * 모양이 바뀌는 일이라 디자이너 결정이 있을 때 한다.
 */

const CARD_STYLE = {
  background: '#fff',
  border: '1px solid #E2E8F0',
  borderRadius: 16,
  padding: 24,
};

const BADGE_STYLE = {
  fontSize: 12,
  fontWeight: 700,
  padding: '3px 10px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
};

/** 흰 바탕 · 옅은 테두리 · 둥근 모서리 16 · 안쪽 여백 24. `style` 로 자리마다 덧입힌다. */
export function BillingCard({ children, style }) {
  return <div style={{ ...CARD_STYLE, ...style }}>{children}</div>;
}

/** 알약 모양 딱지. `color` 는 글자색, `bg` 는 바탕색. */
export function BillingBadge({ children, color, bg }) {
  return (
    <StatusBadge style={{ ...BADGE_STYLE, color, background: bg }}>
      {children}
    </StatusBadge>
  );
}
