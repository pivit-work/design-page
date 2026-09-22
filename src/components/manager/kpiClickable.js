/** 누를 수 있는 KPI 카드의 역할·키보드 처리. `SummaryCard` 도 같이 쓴다. */
export function clickableProps(clickable, onClick, active) {
  if (!clickable) return {};
  return {
    onClick,
    role: 'button',
    tabIndex: 0,
    'aria-pressed': active,
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    },
  };
}
