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

/*
 * 결제 진행 단계 표시 (PW-2110) — 「플랜 선택 · 청구 정보 · 카드 등록·결제」 한 줄.
 * 청구 정보 화면의 결제 진행 모드와 결제하기 화면이 함께 쓴다.
 *
 * 생김새는 평가 사이클 만들기 창의 단계 표시(`EvalCycleWizard` StepBar · eval-cycle.css
 * `.evc-wiz-step*`) 값 그대로다 — 원형 22 · 지금 = 브랜드 채움 + 이름 굵게 · 지난 단계 = 초록 ✓ ·
 * 예정 = 회색. 그쪽은 눌러서 단계를 옮기는 버튼이라 그대로 못 쓰고, 여기는 보여 주기만 한다.
 * `current` 는 steps 안의 위치, steps.length 이상이면 모두 완료(결제 성공 화면).
 */
const STEP_NUM_STYLE = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 22,
  height: 22,
  borderRadius: '50%',
  fontSize: 'var(--font-size-text-xs)',
  fontWeight: 700,
  flexShrink: 0,
};

export function BillingCheckoutSteps({ steps = [], current = 0 }) {
  return (
    <ol
      data-testid="billing-checkout-steps"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', listStyle: 'none', margin: '0 0 16px', padding: 0 }}
    >
      {steps.map((label, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'future';
        const num =
          state === 'current'
            ? { background: 'var(--bg-brand-solid)', color: 'var(--text-white)' }
            : state === 'done'
              ? { background: 'var(--utility-green-50)', color: 'var(--utility-green-600)' }
              : { background: 'var(--utility-gray-50)', color: 'var(--text-secondary)' };
        return (
          <li
            key={label}
            data-state={state}
            aria-current={state === 'current' ? 'step' : undefined}
            style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}
          >
            <span style={{ ...STEP_NUM_STYLE, ...num }}>{state === 'done' ? '✓' : i + 1}</span>
            <span
              style={{
                fontSize: 'var(--font-size-text-sm)',
                whiteSpace: 'nowrap',
                color: state === 'current' ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: state === 'current' ? 700 : 400,
              }}
            >
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
