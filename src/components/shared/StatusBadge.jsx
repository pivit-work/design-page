import { TONES, toneForStatus } from './statusBadgeTones.js';

/**
 * 상태 딱지 — 「충족」·「시급」·「진행 중」처럼 색 배경에 둥근 모서리로 붙는 작은 딱지 하나 (PW-840).
 *
 * 화면마다 `<span className="...">` 로 따로 그리던 것을 이 부품 하나로 모았다. 화면이 넘기는
 * 것은 **뜻**(`tone`)이나 **상태값**(`status`)이고, 어떤 색이 되는지는 `statusBadgeTones.js`
 * 한 곳이 정한다.
 *
 *   <StatusBadge tone="success" className="evc-status-badge">완료</StatusBadge>
 *   <StatusBadge status={row.status} className="okr-pill">{label}</StatusBadge>
 *
 * ## 생김새는 왜 아직 `className` 으로 오는가
 *
 * 지금 딱지는 모서리·글씨 크기·안쪽 여백이 화면마다 다르다(알약 · 둥근 네모 · 글씨 10~14px).
 * **그 모양을 하나로 맞추는 것은 이 카드가 하지 않기로 했다**(2026-09-22 커트 결정 «가» —
 * 모양은 지금 그대로 두고 코드와 뜻·색 표만 모은다). 그래서 생김새 값은 딱지마다 자기 클래스로
 * 남되, 흩어져 있던 규칙을 `src/status-badge.css` 한 파일로 모았다. 나중에 디자이너가 기준
 * 모양을 그리면 그 파일 한 곳과 이 부품만 고치면 된다.
 *
 * @param {keyof TONES} [tone] 뜻을 바로 고른다
 * @param {string} [status] 상태값으로 고른다 — 뜻은 `STATUS_TONE` 표가 정한다
 * @param {string} [className] 그 딱지의 생김새 클래스(+ 화면이 덧붙이는 것)
 * @param {'span'|'div'|string} [as] 감싸는 태그. 줄을 차지해야 하는 자리만 `div`
 */
export default function StatusBadge({
  tone,
  status,
  className = '',
  as: Tag = 'span',
  children,
  ...rest
}) {
  const resolved = tone ?? (status == null ? null : toneForStatus(status));
  const toneClass = resolved && Object.prototype.hasOwnProperty.call(TONES, resolved)
    ? `dp-badge--tone-${resolved}`
    : '';
  const classes = ['dp-badge', toneClass, className].filter(Boolean).join(' ');
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  );
}
