import { STACK_GAPS } from './stackGaps.js';

/**
 * 쌓기 — 줄을 위에서 아래로 놓고 줄 사이를 이 틀이 띄운다.
 *
 * 줄마다 위·아래 여백을 따로 적으면 새 줄을 넣는 사람이 그 값을 빼먹는다. 리마인더 편집 창의
 * 「일수를 바꿔 채널이 바뀌었습니다」 줄이 바깥 여백 0 인 공용 안내 상자를 그대로 써서 위 입력줄에
 * 붙었고(2026-10-23), 「회사 전체 리마인더 꺼짐」 경고도 같은 까닭으로 붙었었다(PW-1706).
 * 이 틀 안에서는 줄이 자기 위·아래 여백을 가져도 무시되고 간격은 `gap` 하나로만 정해진다
 * (`src/stack.css`). 그래서 줄을 더하거나 빼도, 조건부로 숨어도 간격이 늘 같다.
 *
 * 어드민 CSV 가져오기의 `CsvStack`, 온보딩의 `OnbStack` 이 영역마다 따로 같은 일을 하던 것을
 * 앱 전체가 쓰게 꺼낸 것이다. 옮긴 칸 목록은 `scripts/check-stacks.mjs` 의 MIGRATED.
 *
 *   <Stack gap="sm">
 *     <div className="evc-rm-dsec-title">언제 · 어느 채널로</div>
 *     <div className="evc-rm-when-fields">…</div>
 *     {changed && <p className="evx-notice is-warn">…</p>}
 *   </Stack>
 *
 * @param {'xxs'|'xs'|'sm'|'md'|'lg'|'xl'|'2xl'|'3xl'|'4xl'|'5xl'} [gap] 줄 사이 — 디자인 간격 값 이름
 *   (`--spacing-*`, sm 6px · md 8px · lg 12px · xl 16px). 기본 md
 * @param {string} [as]         그릴 태그 (기본 div)
 * @param {string} [className]  칸 모양(바탕·테두리·안쪽 여백)용 클래스를 덧붙인다
 * @param {string} [testId]
 */
export default function Stack({ gap = 'md', as: Tag = 'div', className, testId, children, ...rest }) {
  const size = STACK_GAPS.includes(gap) ? gap : 'md';
  return (
    <Tag
      className={['dp-stack', `dp-stack--gap-${size}`, className].filter(Boolean).join(' ')}
      data-testid={testId}
      {...rest}
    >
      {children}
    </Tag>
  );
}
