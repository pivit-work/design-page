import Button from './Button.jsx';

/**
 * 할 일의 마감 표시 하나 — «오늘 마감»·«D-2»·«D+3 지연»·«10월 29일»·«기한 없음» (PW-2471).
 *
 * 회의록 › 액션 아이템 화면의 마감 칩과 1on1 끝난 화면·지난 회의록의 액션아이템이 같은 할 일을
 * 다르게 보여 주던 것을 이 부품 하나로 모았다. 기획은 «같은 배지 부품»이라 정했고(oneonone-spec §7 ·
 * screen-action-items.policy §4), 커트가 액션 아이템 화면의 칩 모양을 쓰기로 했다(2026-11-01).
 *
 * 글자와 뜻(`tone`)은 호스트가 정한다 — 무엇이 «오늘»인지는 보는 사람 시간대라 앱이 안다.
 *
 * @param {string} label 보일 글자
 * @param {'overdue'|'warning'|'muted'} [tone] 빨강(지연) · 주황(오늘~D-2) · 연한 회색(완료). 없으면 회색
 * @param {() => void} [onClick] 있으면 눌러서 마감일을 고치는 버튼으로 그린다
 */
export default function DueBadge({ label, tone, onClick, className = '', ...rest }) {
  const classes = ['ai-deadline', tone ? `is-${tone}` : '', className].filter(Boolean).join(' ');
  if (onClick) {
    return (
      // 공용 Button 에 variant 없이 칩 모양 클래스만 넘긴다 — 생김새는 `.ai-deadline` 그대로다.
      <Button className={classes} onClick={onClick} {...rest}>
        {label}
      </Button>
    );
  }
  return (
    <span className={`${classes} is-static`} {...rest}>
      {label}
    </span>
  );
}
