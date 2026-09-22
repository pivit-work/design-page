import StatusBadge from '../shared/StatusBadge.jsx';
/**
 * 온보딩 단계 화면을 이루는 덩어리 — 시안 `8. onboarding/onboarding-app.jsx` 의 단계 제목,
 * 안내 상자, 승인 대기 배지, RequestSummary, 워크스페이스 주소 줄, CSV 올리는 곳,
 * 연동 카드, 선호 설정 SectionDivider, 완료 화면. 스타일은 `onboarding.css`(onb-*).
 *
 * 시안에 없는 자리(초대 한 줄·Slack 구성원 목록·일괄 지정 상자)는 새 시각을 만들지 않고
 * 시안의 테두리·간격·글씨 규격을 그대로 조립했다.
 */

const cx = (...parts) => parts.filter(Boolean).join(' ');
const GAPS = [2, 4, 6, 8, 10, 12, 16, 20, 24];
const SPACES = [4, 8, 12, 16, 20, 24, 28];
const gapClass = (gap) => (GAPS.includes(gap) ? `onb-gap-${gap}` : undefined);
const mtClass = (v) => (SPACES.includes(v) ? `onb-mt-${v}` : undefined);
const mbClass = (v) => ([8, 12, 16, 20, 24].includes(v) ? `onb-mb-${v}` : undefined);

/**
 * 단계 제목 — 아이콘·배지(선택) · 제목(h1 26/800) · 설명(14 · 회색).
 *
 * Props:
 *   title · description
 *   icon       아이콘 노드(SVG). iconTone 으로 색: brand|success|warning|error|muted
 *   badge      제목 위 배지 노드(OnbBadge)
 *   align      'left' | 'center'
 *   size       'lg'(26) | 'md'(24 — 시안 승인 결과)
 *   spacing    'normal'(아래 32) | 'tight'(아래 24)
 */
export function OnbStepHeader({
  title,
  description,
  icon,
  iconTone = 'brand',
  badge,
  align = 'left',
  size = 'lg',
  spacing = 'normal',
  testId,
}) {
  return (
    <div
      className={cx('onb-head', align === 'center' && 'is-center', spacing === 'tight' && 'is-tight')}
      data-testid={testId}
    >
      {icon && <div className={cx('onb-head-icon', `onb-tone-${iconTone}`)}>{icon}</div>}
      {badge && <div className="onb-head-badge">{badge}</div>}
      <h1 className={cx('onb-title', size === 'md' && 'is-md')}>{title}</h1>
      {description && <p className="onb-desc">{description}</p>}
    </div>
  );
}

/**
 * 쌓기 — 세로(기본)/가로로 늘어놓는 틀.
 *
 * Props: direction('column'|'row') · gap(2·4·6·8·10·12·16·20·24) · align('center'|'start')
 *        justify('center'|'between') · wrap · fill(자식이 폭을 나눠 갖는다) · grow
 *        mt·mb(위·아래 여백) · as · role · testId
 */
export function OnbStack({
  direction = 'column',
  gap = 16,
  align,
  justify,
  wrap = false,
  fill = false,
  grow = false,
  mt,
  mb,
  as: Tag = 'div',
  role,
  testId,
  children,
}) {
  return (
    <Tag
      className={cx(
        'onb-stack',
        direction === 'row' && 'is-row',
        wrap && 'is-wrap',
        align === 'center' && 'is-center',
        align === 'start' && 'is-start',
        justify === 'center' && 'is-justify-center',
        justify === 'between' && 'is-between',
        fill && 'is-fill',
        grow && 'is-grow',
        gapClass(gap),
        mtClass(mt),
        mbClass(mb),
      )}
      role={role}
      data-testid={testId}
    >
      {children}
    </Tag>
  );
}

/**
 * 글씨 한 줄/한 문단.
 *
 * Props: size(10·11·12·13·14·15) · tone(strong|sub|muted|brand|success|warning|error)
 *        weight(500·600·700) · align('center') · mono · inline(아이콘과 한 줄로) · mt·mb
 *        as('p'|'span'|'div') · role · testId
 */
export function OnbText({
  size = 13,
  tone = 'sub',
  weight,
  align,
  mono = false,
  inline = false,
  mt,
  mb,
  as: Tag = 'p',
  role,
  testId,
  title,
  children,
}) {
  return (
    <Tag
      className={cx(
        'onb-text',
        `onb-size-${size}`,
        `onb-tone-${tone}`,
        weight && `onb-weight-${weight}`,
        align === 'center' && 'is-center',
        mono && 'is-mono',
        inline && 'is-flex',
        mtClass(mt),
        mbClass(mb),
      )}
      role={role}
      data-testid={testId}
      title={title}
    >
      {children}
    </Tag>
  );
}

/**
 * 안내 상자.
 *
 * Props:
 *   tone   info(파랑) | error | warning | success | neutral(흰 바탕) | subtle(회색 바탕)
 *   title  작은 굵은 머리글(시안 「거절 사유」「확인 중에는」) — 있으면 본문은 진한 글씨
 *   hero   큰 상자(시안 인증 대기 카드)
 *   align  'center'
 *   role · testId
 */
export function OnbNotice({ tone = 'info', title, hero = false, align, role, testId, children }) {
  return (
    <div
      className={cx(
        'onb-notice',
        `onb-notice-${tone}`,
        title && 'has-title',
        hero && 'onb-notice-hero',
        align === 'center' && 'is-center',
      )}
      role={role}
      data-testid={testId}
    >
      {title && <p className="onb-notice-title">{title}</p>}
      <div className="onb-notice-body">{children}</div>
    </div>
  );
}

/** 상태 배지 (시안 승인 대기 「신청됨/검토중」). tone: 'warning' | 'brand' */
export function OnbBadge({ tone = 'brand', icon, children, testId }) {
  return (
    <StatusBadge className={cx('onb-badge', `onb-badge-${tone}`)} data-testid={testId}>
      {icon}
      {children}
    </StatusBadge>
  );
}

/** 요청 요약 표 (시안 RequestSummary). rows: [{ label, value }] — 빈 값은 호출부가 거른다. */
export function OnbSummary({ rows = [], testId }) {
  return (
    <div className="onb-summary" data-testid={testId}>
      {rows.map((r) => (
        <div key={r.label} className="onb-summary-row">
          <span>{r.label}</span>
          <b>{r.value}</b>
        </div>
      ))}
    </div>
  );
}

/**
 * 주소 한 줄 + 복사 (시안 승인 완료의 워크스페이스 주소 줄).
 * Props: value · actionLabel · onAction · copied(글씨를 초록으로) · actionTestId
 */
export function OnbCopyLine({ value, actionLabel, onAction, copied = false, testId, actionTestId }) {
  return (
    <div className="onb-copy" data-testid={testId}>
      <span>{value}</span>
      <button
        type="button"
        className={cx('onb-btn', 'onb-btn-pill', copied && 'is-on')}
        onClick={onAction}
        data-testid={actionTestId}
      >
        {actionLabel}
      </button>
    </div>
  );
}

/**
 * 묶음 상자 — 일괄 지정 · 초대 한 줄 · 링크 표시 · CSV 한 줄.
 * Props: tone('surface'|'subtle'|'warning'|'error') · compact
 */
export function OnbBox({ tone = 'surface', compact = false, testId, children }) {
  return (
    <div
      className={cx('onb-box', tone !== 'surface' && `is-${tone}`, compact && 'is-compact')}
      data-testid={testId}
    >
      {children}
    </div>
  );
}

/** 두 칸 격자 — 상자 안의 직급·팀 고르기. full 인 자식은 OnbGridFull 로 감싼다. */
export function OnbTwoColumns({ tight = false, children, testId }) {
  return (
    <div className={cx('onb-box-grid', tight && 'is-tight')} data-testid={testId}>
      {children}
    </div>
  );
}

export function OnbGridFull({ children }) {
  return <div className="is-full">{children}</div>;
}

/** 탭 줄 — 탭 부품(Tabs)을 담아 아래 선을 긋는다. */
export function OnbTabsRow({ children }) {
  return <div className="onb-tabs-row">{children}</div>;
}

/**
 * 파일 올리는 곳 (시안 CSV 탭).
 *
 * Props: over(끌어다 놓는 중) · icon · title · description · fileName · fileNameTestId
 *        onClick · onDragOver · onDragLeave · onDrop · testId
 *        input  숨긴 file input 노드(호출부가 ref·onChange 를 건다)
 */
export function OnbDropzone({
  over = false,
  icon,
  title,
  description,
  fileName,
  fileNameTestId,
  input,
  testId,
  onClick,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  return (
    <div
      className={cx('onb-drop', over && 'is-over')}
      data-testid={testId}
      onClick={onClick}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {icon && <div className="onb-drop-icon">{icon}</div>}
      <div>
        <p className="onb-drop-title">{title}</p>
        {description && <p className="onb-drop-desc">{description}</p>}
      </div>
      {fileName && (
        <p className="onb-drop-file" data-testid={fileNameTestId}>
          {fileName}
        </p>
      )}
      {input}
    </div>
  );
}

/** 고르는 목록 틀 — 높이 240 에서 스크롤. */
export function OnbCheckList({ children, testId }) {
  return (
    <div className="onb-list" data-testid={testId}>
      {children}
    </div>
  );
}

/**
 * 고르는 목록 한 줄 — 체크 · 이름(+작은 곁글씨) · 아랫줄 · 오른쪽 사유.
 * Props: checked · disabled · onChange(checked) · title · titleNote · subtitle · note · testId
 */
export function OnbCheckRow({ checked = false, disabled = false, onChange, title, titleNote, subtitle, note, testId }) {
  return (
    <label className={cx('onb-check-row', disabled && 'is-disabled')} data-testid={testId}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="onb-check-main">
        <span className="onb-check-title">
          {title}
          {titleNote && <small>{titleNote}</small>}
        </span>
        {subtitle && <span className="onb-check-sub">{subtitle}</span>}
      </span>
      {note && <span className="onb-check-note">{note}</span>}
    </label>
  );
}

/** 브랜드 로고 타일 — 흰 타일 + 가는 테두리. 로고 노드는 호출부가 준다. */
export function OnbBrandTile({ children }) {
  return <span className="onb-brand-tile">{children}</span>;
}

/**
 * 연동 카드 (시안 StepIntegrations 의 카드) — 카드 전체가 누르는 자리다.
 *
 * Props:
 *   logo · name · description
 *   status       'available' | 'connected' | 'soon'
 *   statusLabel  오른쪽 글씨(「연결」「연결 요청됨」「준비 중」)
 *   onActivate   누르거나 Enter/Space
 */
export function OnbIntegrationCard({ logo, name, description, status = 'available', statusLabel, onActivate, testId }) {
  const disabled = status === 'soon';
  const activate = () => {
    if (!disabled) onActivate?.();
  };
  return (
    <div
      className={cx('onb-integ', status === 'connected' && 'is-connected', disabled && 'is-disabled')}
      role="button"
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      data-testid={testId}
      onClick={activate}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      }}
    >
      <div className="onb-integ-main">
        {logo}
        <div>
          <p className="onb-integ-name">{name}</p>
          {description && <p className="onb-integ-desc">{description}</p>}
        </div>
      </div>
      {status === 'available' ? (
        <span className="onb-integ-action">{statusLabel}</span>
      ) : (
        <span className={cx('onb-integ-state', status === 'soon' && 'is-soon')}>{statusLabel}</span>
      )}
    </div>
  );
}

/** 섹션 제목 (시안 선호 설정 SectionDivider) — 굵은 제목 + 오른쪽으로 뻗는 선 + 설명. */
export function OnbSectionTitle({ title, description }) {
  return (
    <div className="onb-section">
      <div className="onb-section-row">
        <span className="onb-section-title">{title}</span>
        <i />
      </div>
      {description && <span className="onb-section-desc">{description}</span>}
    </div>
  );
}

/* ── 완료 (시안 StepComplete) ───────────────────────────── */

/** 완료 화면 틀 — 가운데 정렬, 색종이가 넘치지 않게 잘라 둔다. */
export function OnbCompleteBody({ children, testId }) {
  return (
    <div className="onb-complete" data-testid={testId}>
      {children}
    </div>
  );
}

/** 초록 원 표시 — show 가 true 가 되면 튀어나온다. */
export function OnbCompleteMark({ show = false, children }) {
  return <div className={cx('onb-mark', show && 'is-shown')}>{children}</div>;
}

/** 아래에서 올라오며 나타나기. delay 는 초 단위. */
export function OnbReveal({ show = false, delay = 0, children }) {
  return (
    <div className={cx('onb-reveal', show && 'is-shown')} style={{ transitionDelay: `${delay}s` }}>
      {children}
    </div>
  );
}

/** 요약 목록 상자 — 초대·연동 개수. */
export function OnbSummaryList({ children }) {
  return <div className="onb-summary-list">{children}</div>;
}

const CONFETTI_COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
// 렌더를 순수하게 두려고 모듈에서 한 번만 계산한다.
const CONFETTI_PIECES = Array.from({ length: 30 }, (_, i) => ({
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  left: 10 + (((i * 7 + 13) * 17) % 100) * 0.8,
  delay: ((i * 3 + 7) % 10) * 0.05,
  duration: 1 + ((i * 11 + 5) % 10) * 0.1,
  size: 4 + ((i * 13 + 3) % 10) * 0.6,
  rotation: (i * 37 + 11) % 360,
}));

/** 색종이 — 완료 직후 잠깐. active 가 false 면 그리지 않는다. */
export function OnbConfetti({ active = true }) {
  if (!active) return null;
  return (
    <div className="onb-confetti" aria-hidden>
      {CONFETTI_PIECES.map((p, i) => (
        <i
          key={i}
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size * 1.5,
            background: p.color,
            animationDuration: `${p.duration}s`,
            animationDelay: `${p.delay}s`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}
