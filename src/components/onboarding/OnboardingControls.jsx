import { forwardRef } from 'react';
import { OnbCloseIcon, OnbGoogleLogo, OnbSpinner } from './onboardingIcons.jsx';

/**
 * 온보딩 입력 부품 — 시안 `8. onboarding/onboarding-app.jsx` 의 Input · Button · Divider · Tag
 * 와 단계 화면 안에서 되풀이되는 선택 버튼·칩. 스타일은 `onboarding.css`(onb-*).
 *
 * 문구는 전부 호출부가 준다. 네이티브 속성(id·name·autoComplete·aria-*·data-testid·onKeyDown…)은
 * 그대로 아래 요소로 흘려보낸다 — 비밀번호 관리자·접근성·테스트가 기대는 속성이라서다.
 */

const cx = (...parts) => parts.filter(Boolean).join(' ');

/**
 * 입력 칸 한 벌 — 이름표 · 칸 · 오류/안내 글씨 (시안 Input 의 바깥).
 *
 * Props:
 *   label · htmlFor · required(빨간 *) · optionalLabel(「(선택)」 같은 옅은 글씨)
 *   error      있으면 빨간 글씨. hint 보다 앞선다
 *   hint       옅은 안내 글씨
 *   hintTone   'sub' | 'muted' | 'warning' | 'success'
 *   hintTestId · errorRole(기본 없음)
 *   children   칸(OnbInput 등). 칸 아래에 더 붙일 글씨는 extra 로 준다
 */
export function OnbField({
  label,
  htmlFor,
  required = false,
  optionalLabel,
  error,
  hint,
  hintTone = 'sub',
  hintTestId,
  errorTestId,
  extra,
  children,
  testId,
}) {
  return (
    <div className="onb-field" data-testid={testId}>
      {label && (
        <label className="onb-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="onb-label-req">*</span>}
          {optionalLabel && <span className="onb-label-opt">{optionalLabel}</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="onb-field-msg is-error" data-testid={errorTestId}>
          {error}
        </p>
      ) : hint ? (
        <p className={cx('onb-field-msg', hintTone !== 'sub' && `is-${hintTone}`)} data-testid={hintTestId}>
          {hint}
        </p>
      ) : null}
      {extra}
    </div>
  );
}

/**
 * 입력 칸 (시안 Input 의 칸).
 *
 * Props: invalid · warning · size('md'|'sm') · width('full'|'auto'|'name') · prefix · suffix
 *        + 네이티브 input 속성 전부
 */
export const OnbInput = forwardRef(function OnbInput(
  { invalid = false, warning = false, size = 'md', width = 'full', prefix, suffix, ...rest },
  ref,
) {
  const input = (
    <input
      ref={ref}
      className={cx(
        'onb-input',
        invalid && 'is-invalid',
        warning && !invalid && 'is-warning',
        size === 'sm' && 'is-sm',
        width === 'auto' && 'is-auto',
        width === 'name' && 'is-name',
        prefix && 'has-prefix',
        suffix && 'has-suffix',
      )}
      aria-invalid={invalid || undefined}
      {...rest}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div className="onb-input-wrap">
      {prefix && <span className="onb-input-affix is-prefix" aria-hidden>{prefix}</span>}
      {input}
      {suffix && <span className="onb-input-affix is-suffix" aria-hidden>{suffix}</span>}
    </div>
  );
});

/** 작은 고르기 칸 — 초대의 직급·팀. Props: options [{ value, label }] + 네이티브 select 속성. */
export function OnbSelect({ options = [], ...rest }) {
  return (
    <select className="onb-select" {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/**
 * 버튼 (시안 Button).
 *
 * Props:
 *   variant  'primary' | 'outlined' | 'surface'(흰 바탕 테두리) | 'ghost' | 'danger' | 'pill'
 *   size     'sm' | 'md' | 'lg'
 *   fullWidth · grow(줄 안에서 남는 폭을 나눠 갖는다)
 *   loading  스피너를 보이고 누를 수 없게 한다. loadingLabel 은 화면 읽기용 글씨
 *   busy     누를 수 없게 하되 글씨는 그대로(커서만 기다림)
 *   active   pill 에서 「복사됨」처럼 켜진 상태
 *   href     주면 <a> 로 그린다(메일 앱 열기)
 */
export function OnbButton({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  grow = false,
  loading = false,
  loadingLabel,
  busy = false,
  active = false,
  href,
  disabled,
  children,
  type = 'button',
  ...rest
}) {
  const className = cx(
    'onb-btn',
    `onb-btn-${variant}`,
    size === 'lg' && 'is-lg',
    size === 'sm' && 'is-sm',
    fullWidth && 'is-full',
    grow && 'is-grow',
    (loading || busy) && 'is-busy',
    active && 'is-on',
  );
  if (href) {
    return (
      <a className={className} href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button
      type={type}
      className={className}
      disabled={disabled || loading || busy}
      aria-busy={loading || busy || undefined}
      {...rest}
    >
      {loading ? (
        <>
          <OnbSpinner size={16} />
          {loadingLabel && <span className="onb-sr-only">{loadingLabel}</span>}
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Google 로 계속하기 — 시안 이메일 단계의 흰 버튼 + 로고. */
export function OnbGoogleButton({ children, ...rest }) {
  return (
    <OnbButton variant="surface" fullWidth {...rest}>
      <OnbGoogleLogo size={18} />
      {children}
    </OnbButton>
  );
}

/**
 * 글자 버튼 — 다시 보내기 · 이메일 변경 · 템플릿 받기 · 모두 고르기.
 * Props: tone('brand'|'muted') · size('md'|'sm') · href(주면 <a>)
 */
export function OnbTextButton({ tone = 'brand', size = 'md', href, children, type = 'button', ...rest }) {
  const className = cx('onb-link', tone === 'muted' && 'is-muted', size === 'sm' && 'is-sm');
  if (href) {
    return (
      <a className={className} href={href} {...rest}>
        {children}
      </a>
    );
  }
  return (
    <button type={type} className={className} {...rest}>
      {children}
    </button>
  );
}

/** 지우기(×) 같은 아이콘만 있는 버튼. aria-label 은 호출부가 준다. */
export function OnbRemoveButton({ size = 14, type = 'button', ...rest }) {
  return (
    <button type={type} className="onb-icon-btn" {...rest}>
      <OnbCloseIcon size={size} />
    </button>
  );
}

/** 구분선 (시안 Divider) — 가운데 글씨. */
export function OnbDivider({ label }) {
  return (
    <div className="onb-divider" role="separator">
      <i />
      {label && <span>{label}</span>}
      <i />
    </div>
  );
}

/** 선택 버튼 격자 (시안 팀 규모·요청 플랜) — 두 칸씩. */
export function OnbChoiceGrid({ children, testId }) {
  return (
    <div className="onb-choices" role="group" data-testid={testId}>
      {children}
    </div>
  );
}

export function OnbChoice({ selected = false, children, type = 'button', ...rest }) {
  return (
    <button type={type} className={cx('onb-choice', selected && 'is-selected')} aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}

/** 칩 (시안 선호 설정 ChipGroup) — 여러 개를 늘어놓을 때는 OnbStack wrap 에 담는다. */
export function OnbChip({ selected = false, children, type = 'button', ...rest }) {
  return (
    <button type={type} className={cx('onb-chip', selected && 'is-selected')} aria-pressed={selected} {...rest}>
      {children}
    </button>
  );
}

/**
 * 태그 (시안 Tag) — 초대 이메일.
 * Props: grow(남는 폭을 채운다) · onRemove · removeLabel
 */
export function OnbTag({ children, grow = false, onRemove, removeLabel, testId }) {
  return (
    <span className={cx('onb-tag', grow && 'is-grow')} data-testid={testId}>
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={removeLabel}>
          <OnbCloseIcon size={12} />
        </button>
      )}
    </span>
  );
}

/**
 * 비밀번호 강도 막대 — 시안 계정 단계의 네 칸 막대(글씨 라벨은 앱에 없어 뺀다).
 * Props: level 0~4
 */
export function OnbPasswordStrength({ level = 0, testId }) {
  const clamped = Math.max(0, Math.min(4, level));
  return (
    <div className={cx('onb-strength', clamped > 0 && `is-${clamped}`)} data-testid={testId} aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </div>
  );
}
