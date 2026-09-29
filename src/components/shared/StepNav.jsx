import Button from './Button.jsx';
import Icon from './Icon.jsx';

const CHEVRON = { prev: '/icons/chevron-left.svg', next: '/icons/chevron-right.svg' };

/**
 * 한 칸씩 오가는 `‹ … ›` 줄 (PW-1185).
 *
 * 팀 타임라인 머리 줄의 `‹ 오늘 ›` 를 떼어 낸 것이다 — 생김새는 그때 값 그대로다
 * (`src/step-nav.css`, 옛 `.tl-nav-btn`). OKR › 내 리소스의 `‹ 2026년 9월 ›` 가 같은 부품을 쓴다.
 * 가운데에는 버튼(「오늘」)이든 글자(「2026년 9월」)든 넣는다.
 *
 * @param {string} [className]
 */
export function StepNav({ className = '', children, ...rest }) {
  return (
    <span className={['dp-step-nav', className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </span>
  );
}

/**
 * `‹`·`›` 또는 글자 버튼 하나. 공용 `Button` 위에 얹어 두 번 누르기 잠금·`disabled` 를 그대로 받는다.
 * 누를 수 없을 때는 옅어지고 손 모양이 사라진다.
 *
 * `static` 을 주면 버튼이 아니라 같은 모양의 글자 칸(`<span>`)을 그린다 — 가운데에 누를 수 없는
 * 글자(「2026년 9월」)를 「오늘」 칸과 같은 높이·글자 모양으로 놓을 때 쓴다 (PW-1186).
 * 옅어지지 않고, 손 모양·hover 가 없고, 글자가 길어도 한 줄을 지킨다.
 *
 * @param {'prev'|'next'} [direction] 주면 화살표만 그린다(`aria-label` 은 부르는 쪽이 준다)
 * @param {string} [baseUrl] 아이콘 경로 앞머리(`Icon` 과 같다)
 * @param {boolean} [static] 누를 수 없는 글자 칸으로 그린다
 */
export default function StepNavButton({
  direction,
  baseUrl = '',
  className = '',
  static: isStatic = false,
  children,
  ...rest
}) {
  const classes = [
    'dp-step-nav-btn',
    direction ? '' : 'dp-step-nav-btn--text',
    isStatic ? 'dp-step-nav-btn--static' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  if (isStatic) {
    return (
      <span className={classes} {...rest}>
        {children}
      </span>
    );
  }
  return (
    <Button className={classes} {...rest}>
      {direction ? (
        <Icon
          src={CHEVRON[direction]}
          size={20}
          color="var(--colors-foreground-fgPrimary)"
          baseUrl={baseUrl}
        />
      ) : (
        children
      )}
    </Button>
  );
}
