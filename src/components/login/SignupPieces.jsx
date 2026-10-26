import LoginShell from './LoginShell.jsx';
import FormField from '../shared/FormField.jsx';
import Button from '../shared/Button.jsx';
import Checkbox from '../shared/Checkbox.jsx';
import assetUrl from '../shared/assetUrl.js';
import { ChevronLeftGlyph } from '../shared/lineIcons.jsx';
import { DEFAULT_SIGNUP_STEPS } from './signupLabels.js';

/**
 * 회원가입(온보딩) 단계 화면들이 함께 쓰는 작은 부품 — 로그인 시안(Figma 17767:40732)의 카드 문법으로
 * 조립한다. 단계 화면 하나가 한 파일이고, 여기는 그 안에 반복되는 덩이만 둔다.
 */

/** 진행 띠(Figma 17770:23684) — 칸 수만큼 4px 띠. 지난 칸과 지금 칸이 brand 색 */
export function SignupProgress({ steps = DEFAULT_SIGNUP_STEPS, current = 0 }) {
  return (
    <div className="login-progress" role="progressbar" aria-valuemin={1} aria-valuemax={steps.length} aria-valuenow={current + 1} aria-valuetext={steps[current]} data-testid="signup-progress">
      {steps.map((label, i) => (
        <span key={label + i} className={`login-progress-seg${i <= current ? ' is-done' : ''}`} title={label} />
      ))}
    </div>
  );
}

/** [뒤로] — 화면 바닥 가운데 흰 알약(Figma 17770:23764) */
export function SignupBack({ label, onClick, testId }) {
  return (
    <Button className="login-back" onClick={onClick} data-testid={testId}>
      <ChevronLeftGlyph size={16} />
      {label}
    </Button>
  );
}

/** 틀 — LoginShell(위부터 쌓는 배치) + 제목 아래 진행 띠. children 은 <form className="login-card">. */
export function SignupFrame({
  baseUrl = '',
  mode = 'signup',
  onModeChange,
  modeLabels,
  title,
  subtitle,
  steps = DEFAULT_SIGNUP_STEPS,
  currentStep = 0,
  foot,
  children,
}) {
  return (
    <LoginShell
      layout="top"
      baseUrl={baseUrl}
      mode={mode}
      onModeChange={onModeChange}
      modeLabels={modeLabels}
      title={title}
      subtitle={subtitle}
      above={<SignupProgress steps={steps} current={currentStep} />}
      foot={foot}
    >
      {children}
    </LoginShell>
  );
}

/** 카드(폼) — submit 이벤트를 막고 onSubmit 을 부른다. */
export function SignupCard({ onSubmit, children, testId }) {
  return (
    <form
      className="login-card"
      data-testid={testId}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      {children}
    </form>
  );
}

/** 칸 묶음 — 이름표 12/600 · 아래 12 · 칸. hint 는 칸 아래 12 text-tertiary */
export function SignupField({ label, hint, error, labelExtra, children }) {
  return (
    <FormField label={label} hint={hint} error={error} labelExtra={labelExtra} className="login-field" labelClassName="login-label" hintClassName="login-hint">
      {children}
    </FormField>
  );
}

/** 큰 브랜드 버튼(44) — [계속하기]·[신청하기]·[시작하기] */
export function SignupSubmit({ children, pending = false, testId, ...rest }) {
  return (
    <Button type="submit" className="login-submit" pending={pending} data-testid={testId} {...rest}>
      {children}
    </Button>
  );
}

/** 또는 */
export function SignupDivider({ label }) {
  return (
    <div className="login-divider" aria-hidden="true">
      <span className="login-divider-line" />
      <span className="login-divider-text">{label}</span>
      <span className="login-divider-line" />
    </div>
  );
}

/** [Google로 …] 흰 버튼 */
export function SignupGoogle({ baseUrl = '', onClick, children, testId }) {
  return (
    <Button className="login-google" onClick={onClick} data-testid={testId}>
      <img className="login-google-icon" src={assetUrl(baseUrl, '/icons-brand/google.svg')} alt="" draggable={false} />
      {children}
    </Button>
  );
}

/** 글자 링크(brand) — 뒤로·재전송·나중에 하기 */
export function SignupLink({ children, className = '', ...rest }) {
  return (
    <Button className={`login-link ${className}`.trim()} {...rest}>
      {children}
    </Button>
  );
}

/**
 * 약관 링크 줄 — 「이용약관 · 개인정보처리방침 · 운영정책」. SignupEntryCanvas 의 줄(.login-legal)을 값 그대로 꺼냈다
 * (pivit-work PW-1815 — 앱의 가입 단계 여러 곳이 같은 줄을 쓴다). href 를 주면 새 탭 링크, 아니면 onClick 글자 버튼.
 * links: [{ key, label, href?, onClick?, testId? }]
 */
export function SignupLegalLinks({ links = [], testId }) {
  return (
    <p className="login-legal" data-testid={testId}>
      {links.map((x, i) => (
        <span key={x.key}>
          {i > 0 && <span className="login-legal-dot" aria-hidden="true">·</span>}
          {x.href ? (
            <a className="login-link is-legal" href={x.href} target="_blank" rel="noopener noreferrer" data-testid={x.testId}>
              {x.label}
            </a>
          ) : (
            <SignupLink className="is-legal" onClick={x.onClick} data-testid={x.testId}>{x.label}</SignupLink>
          )}
        </span>
      ))}
    </p>
  );
}

/** 카드 아래 안내 줄 — 「이미 계정이 있으신가요? 로그인하기」 · 「← 뒤로」 */
export function SignupFootRow({ text, actionLabel, onAction, testId }) {
  return (
    <p className="login-foot-row" data-testid={testId}>
      {text && <span className="login-foot-text">{text}</span>}
      {actionLabel && <SignupLink onClick={onAction}>{actionLabel}</SignupLink>}
    </p>
  );
}

/**
 * 고르는 칸 묶음 — 규모·요금제·성향. 2열 격자, 고른 칸은 브랜드 테두리.
 * options: [{ value, label, desc? }] · multiple 이면 values(배열)·onToggle, 아니면 value·onChange
 */
export function SignupChoices({ options = [], value, values = [], onChange, onToggle, multiple = false, columns = 2, testId }) {
  const isOn = (v) => (multiple ? values.includes(v) : value === v);
  return (
    <div className={`login-choices${columns === 1 ? ' is-one' : ''}`} role={multiple ? 'group' : 'radiogroup'} data-testid={testId}>
      {options.map((o) => (
        <Button
          key={o.value}
          className={`login-choice${isOn(o.value) ? ' is-selected' : ''}`}
          role={multiple ? 'checkbox' : 'radio'}
          aria-checked={isOn(o.value)}
          onClick={() => (multiple ? onToggle?.(o.value) : onChange?.(o.value))}
        >
          <span className="login-choice-label">{o.label}</span>
          {o.desc && <span className="login-choice-desc">{o.desc}</span>}
        </Button>
      ))}
    </div>
  );
}

/** 동의 줄 — 네모 + 12 글자 */
export function SignupCheck({ checked, onChange, children, testId }) {
  return (
    <Checkbox className="login-check" inputClassName="dp-check-input" checked={checked} onChange={(e) => onChange?.(e.target.checked)} data-testid={testId}>
      {children}
    </Checkbox>
  );
}

/** 회색 안내 상자 — 접기/펼치기(onToggle 을 주면 머리줄 오른쪽에 글자 버튼) */
export function SignupNotice({ title, open = true, onToggle, showLabel, hideLabel, role, children, testId }) {
  return (
    <div className="login-notice" role={role} data-testid={testId}>
      {(title || onToggle) && (
        <div className="login-notice-head">
          <b className="login-notice-title">{title}</b>
          {onToggle && (
            <SignupLink onClick={onToggle} aria-expanded={open}>
              {open ? hideLabel : showLabel}
            </SignupLink>
          )}
        </div>
      )}
      {open && <div className="login-notice-body">{children}</div>}
    </div>
  );
}

/** 요약 표 — 신청일·회사명… rows: [{ label, value }] */
export function SignupSummary({ rows = [], testId }) {
  return (
    <dl className="login-summary" data-testid={testId}>
      {rows.map((r) => (
        <div className="login-summary-row" key={r.label}>
          <dt>{r.label}</dt>
          <dd>{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}
