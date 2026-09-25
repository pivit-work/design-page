import Avatar from './Avatar.jsx';
import StatusBadge from './StatusBadge.jsx';
import { CloseGlyph } from './lineIcons.jsx';

/**
 * 칩 — 필터 · 사람 · 상태를 적는 작은 알약 하나 (PW-1014).
 *
 * 칩·태그를 30개 파일이 따로 그렸고(X 달린 것만 9개 파일 13곳), 같은 이름의 `Chip` 이 두 벌
 * 있었다. X 를 `<span onClick>` 으로 그린 곳은 키보드로 지울 수 없었다. 용도는 셋이다.
 *
 *   필터  <Chip onRemove={clear} removeLabel="부서 필터 지우기">부서: 개발</Chip>
 *   사람  <Chip person={{ name, photo }} onRemove={clear} removeLabel="리드 지우기">{name}</Chip>
 *   상태  <Chip tone="warning">내 차례</Chip>
 *
 * - 모양은 하나 — 높이 24px 알약, 글씨 12px. 필터·사람 칩은 흰 바탕에 테두리, 상태 칩은
 *   상태 딱지와 같은 «뜻 → 색» 표(`statusBadgeTones.js`)로 칠한다. 화면이 색을 직접 고르지 않는다.
 * - `selected` 는 켜진 필터(브랜드 색). `onClick` 을 주면 칩 자체가 버튼이 된다.
 * - `onRemove` 를 주면 끝에 X 버튼이 붙는다. 진짜 `<button>` 이라 Tab·Enter 로 지운다.
 *   `removeLabel` 은 화면 읽기 프로그램이 읽을 이름이라 꼭 준다.
 * - `onClick` 과 `onRemove` 를 함께 주지 않는다 — 버튼 안에 버튼이 들어가게 된다.
 *
 * 생김새 값은 `src/status-badge.css` 의 「칩」 절(딱지와 한 파일 — 색 표를 나눠 쓴다).
 *
 * @param {keyof import('./statusBadgeTones.js').TONES} [tone] 상태 칩의 뜻
 * @param {boolean} [selected] 켜진 필터
 * @param {{ name?: string, photo?: string|null, color?: string }} [person] 사람 칩 — 앞에 작은 사람 원
 * @param {() => void} [onClick] 칩을 누르면
 * @param {() => void} [onRemove] X 를 누르면
 * @param {string} [removeLabel] X 버튼 이름
 * @param {object} [removeProps] X 버튼에 덧붙일 속성(`data-testid` 등)
 * @param {import('react').ReactNode} [icon] 글자 앞 작은 아이콘
 */
export default function Chip({
  tone,
  selected = false,
  person,
  onClick,
  onRemove,
  removeLabel,
  removeProps,
  icon,
  className = '',
  children,
  ...rest
}) {
  const classes = [
    'dp-chip',
    tone ? 'is-tone' : '',
    selected ? 'is-selected' : '',
    person ? 'has-person' : '',
    onRemove ? 'has-remove' : '',
    className,
  ].filter(Boolean).join(' ');
  const clickable = typeof onClick === 'function' && !onRemove;
  const buttonProps = clickable
    ? { as: 'button', type: 'button', onClick, 'aria-pressed': selected }
    : {};
  return (
    <StatusBadge tone={tone} className={classes} {...buttonProps} {...rest}>
      {person && <Avatar name={person.name} photo={person.photo} color={person.color} size={18} />}
      {icon}
      <span className="dp-chip__label">{children}</span>
      {onRemove && (
        <button
          type="button"
          className="dp-chip__remove"
          aria-label={removeLabel}
          onClick={onRemove}
          {...removeProps}
        >
          <CloseGlyph size={12} />
        </button>
      )}
    </StatusBadge>
  );
}
