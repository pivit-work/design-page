import StatusBadge from '../../shared/StatusBadge.jsx';
import Stack from '../../shared/Stack.jsx';
import Skeleton from '../../shared/Skeleton.jsx';
import { NoticeLines, PageHead, Panel } from '../../frames/index.js';
import { BILLING_PAGE_WIDTH } from './billingPageWidth.js';

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

/**
 * @param {import('react').ReactNode} [help] 단계 줄 끝의 «?» 튜토리얼 도움말 버튼 (pivit-work PW-2567). 단계 목록(ol) 밖에
 *   둬 화면 읽기 프로그램이 단계로 세지 않는다. 안 주면 지금과 같다.
 */
export function BillingCheckoutSteps({ steps = [], current = 0, help }) {
  const list = (
    <ol
      data-testid="billing-checkout-steps"
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)', listStyle: 'none', margin: 0, padding: 0 }}
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
  if (!help) return list;
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {list}
      {help}
    </div>
  );
}

/*
 * ── 다시 칠하기 (pivit-work PW-3132) ─────────────────────────────────────────────
 * 결제 일곱 화면은 디자이너 원본이 없다. 커트가 11-19 에 통과시킨 시안(worklog/admin-billing-designer-2026-11-19)대로
 * 공용 틀(Panel · PageHead · NoticeLines …)과 디자이너 부품 값으로 다시 칠한다. 글 · 순서 · 누르면 가는 곳은 그대로다.
 */


/**
 * 결제 화면 한 장의 뼈대 — 왼쪽에서 시작하는 세로 줄. 줄 사이 16(`Stack gap xl` — 판 ↔ 판 · 띠 ↔ 판).
 * @param {object} props
 * @param {number} props.width 본문 최대 폭(BILLING_PAGE_WIDTH)
 * @param {string} [props.testId]
 */
export function BillingPage({ width, testId, children }) {
  return (
    <Stack gap="xl" testId={testId} style={{ width: '100%', maxWidth: width, minWidth: 0 }}>
      {children}
    </Stack>
  );
}

/** 페이지 머리 — 공용 틀 그대로(제목 24/32 · 설명 · 오른쪽 버튼). 결제 화면이 같은 이름으로 부르게 다시 내보낸다. */
export const BillingPageHead = PageHead;

/**
 * 상태 띠 (체험 · 결제 실패 · 해지 예약 · 이용 정지 · 미납 …) — 원온원 «끝난 1on1» 띠(`.ono-done-banner`, one_on_one.css)
 * 여백 12/16 · 모서리 md · 1px 선. 바탕은 흰 판과 같은 흰색이고 뜻은 앞 아이콘 색만 낸다
 * (info 브랜드 · warn 경고 · bad 는 디자이너 실패 띠 `.is-bad` 바탕 그대로). 글은 세 줄로 나눈다 —
 * 머리(14/20 굵게) / 설명(NoticeLines 기본) / 고치는 법(NoticeLines 흐림). 한 문단에 잇지 않는다.
 *
 * @param {object} props
 * @param {'info'|'warn'|'bad'} [props.tone]
 * @param {import('react').ReactNode} props.icon 앞 아이콘(인라인 SVG — 색은 이 띠가 칠한다)
 * @param {import('react').ReactNode} props.title
 * @param {import('react').ReactNode[]} [props.lines] 설명 문장 — 한 줄에 한 문장
 * @param {import('react').ReactNode[]} [props.fix] 고치는 법 · 덧붙임 문장(흐림)
 * @param {import('react').ReactNode} [props.actions] 오른쪽 버튼 자리
 * @param {string} [props.testId]
 * @param {string} [props.role]
 */
export function BillingNotice({ tone = 'info', icon, title, lines = [], fix = [], actions, testId, role }) {
  const bad = tone === 'bad';
  return (
    <div
      className={bad ? 'ono-done-banner is-bad' : 'ono-done-banner'}
      style={bad ? NOTICE_BAD_STYLE : NOTICE_STYLE}
      data-testid={testId}
      data-tone={tone}
      role={role}
    >
      {icon && (
        <span aria-hidden="true" style={{ ...NOTICE_ICON_STYLE, color: NOTICE_ICON_COLOR[tone] }}>
          {icon}
        </span>
      )}
      <div style={NOTICE_TEXT_STYLE}>
        <strong style={bad ? NOTICE_TITLE_BAD_STYLE : NOTICE_TITLE_STYLE}>{title}</strong>
        <NoticeLines lines={lines} />
        <NoticeLines lines={fix} tone="muted" />
      </div>
      {actions && <div style={NOTICE_ACTIONS_STYLE}>{actions}</div>}
    </div>
  );
}

const NOTICE_STYLE = { alignItems: 'flex-start', flexWrap: 'nowrap', background: 'var(--bg-quaternary)', color: 'var(--text-secondary)' };
const NOTICE_BAD_STYLE = { alignItems: 'flex-start', flexWrap: 'nowrap' };
/** 아이콘 20 줄 높이에 맞춰 머리 글과 같은 줄에 선다. */
const NOTICE_ICON_STYLE = { display: 'flex', flex: 'none', height: 'var(--line-height-text-sm)', alignItems: 'center' };
const NOTICE_ICON_COLOR = {
  info: 'var(--text-brand-tertiary)',
  warn: 'var(--text-warning-primary)',
  bad: 'var(--colors-text-textErrorPrimary)',
};
const NOTICE_TEXT_STYLE = { flex: '1 1 auto', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xxs)' };
const NOTICE_TITLE_STYLE = {
  fontSize: 'var(--font-size-text-sm)',
  lineHeight: 'var(--line-height-text-sm)',
  fontWeight: 700,
  color: 'var(--text-primary)',
};
const NOTICE_TITLE_BAD_STYLE = { ...NOTICE_TITLE_STYLE, color: 'var(--colors-text-textErrorPrimary)' };
/** 버튼 사이 8 — 판 머리 버튼 자리와 같게. 버튼은 줄어들지 않고 띠 가운데 높이에 선다. */
const NOTICE_ACTIONS_STYLE = { flex: 'none', display: 'flex', alignItems: 'center', alignSelf: 'center', gap: 'var(--spacing-md)' };

/**
 * 바탕 없는 안내 한 줄 («결제 준비 중» 등) — 원온원 «보는 범위» 안내(`.ono-filter-notice`)처럼 바탕 · 선 없이
 * 아이콘 14 + 12/18 흐린 글. 시안 `.bl-ready`.
 */
export function BillingInlineNote({ icon, children, testId }) {
  return (
    <p style={INLINE_NOTE_STYLE} data-testid={testId}>
      {icon && <span aria-hidden="true" style={INLINE_NOTE_ICON_STYLE}>{icon}</span>}
      <span style={{ minWidth: 0 }}>{children}</span>
    </p>
  );
}

const INLINE_NOTE_STYLE = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-sm)',
  margin: 0,
  fontSize: 'var(--font-size-text-xs)',
  lineHeight: 'var(--line-height-text-xs)',
  color: 'var(--text-tertiary)',
};
const INLINE_NOTE_ICON_STYLE = { display: 'flex', flex: 'none', color: 'var(--text-tertiary)' };

/**
 * 불러오는 중 — 페이지 머리(제목) + 판 자리에 옅은 회색 막대(공용 Skeleton). «로딩 중...» 한 줄 대신.
 * @param {object} props
 * @param {string} props.title
 * @param {number} [props.width]
 * @param {string} [props.ariaLabel] 화면 읽기용 «불러오는 중»
 */
export function BillingLoading({ title, width = BILLING_PAGE_WIDTH.overview, ariaLabel, testId }) {
  return (
    <BillingPage width={width} testId={testId}>
      <PageHead title={title} />
      <div aria-busy="true" aria-label={ariaLabel} role="status">
        <Panel>
          <Skeleton width="40%" height={20} radius={6} />
          <Skeleton width="100%" height={14} radius={6} />
          <Skeleton width="85%" height={14} radius={6} />
          <Skeleton width="60%" height={14} radius={6} />
        </Panel>
      </div>
    </BillingPage>
  );
}
