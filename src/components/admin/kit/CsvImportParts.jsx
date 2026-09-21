/**
 * CSV 가져오기 창(어드민 › 조직 설정 · 구성원 CSV) 부품 — PW-760.
 *
 * 어드민에서만 뜨는 화면이라 디자이너 대기 없이 개발이 만든다(.claude/CLAUDE.md 디자이너 영역
 * 경계 · 어드민 예외). 모양의 출처:
 *   · 창 틀·단계 표시  — 기획서 어드민 시안 `admin-app.jsx` 의 CsvUploadModal
 *                        (헤더 안에 「1. 파일 선택 →」 줄, 카드 720 · 모서리 · 그림자)
 *   · 파일 끌어놓기    — 구성원 초대 창 CSV 탭(`AdminInviteModal` 의 `.admin-inv-drop`)
 *   · 선택 상자        — 초대 창의 `.admin-inv-select`
 *   · 요약 숫자 칸     — `AdminStatTile`
 *   · 나머지 조각      — 어드민 기존 모양(초대 창 안내 띠 `.admin-inv-banner`, 버튼 `.admin-emp-btn`)
 *
 * 문구는 전부 호출부가 넘긴다(i18n). 스타일: `@pivit-work/design-page/styles/admin-kit.css`
 * (버튼·선택 상자·숫자 칸은 `styles/admin.css` 의 규칙을 함께 쓴다).
 */
import { IconDownload, IconUpload, IconX } from '../employeesIcons.jsx';
import RosterTable from '../../shared/RosterTable.jsx';

const cx = (...xs) => xs.filter(Boolean).join(' ');

/* ── 창 틀 ─────────────────────────────────────────────────────────── */

/**
 * 단계 표시 — 시안의 「1. 파일 선택 → 2. 매핑 미리보기 → 3. 확인」 한 줄.
 * `current` 는 steps 안의 위치. 목록 밖(-1 또는 길이 이상)이면 전부 지난 단계로 본다.
 */
export function CsvImportSteps({ steps = [], current = -1 }) {
  const cur = current < 0 ? steps.length : current;
  return (
    <ol className="admin-kit-csv-steps">
      {steps.map((label, i) => (
        <li
          key={`${i}-${label}`}
          className={cx(
            'admin-kit-csv-step',
            i === cur && 'is-current',
            i < cur && 'is-done',
          )}
          aria-current={i === cur ? 'step' : undefined}
        >
          {/* 이름은 따로 감싼다 — 번호와 한 덩어리면 단계 이름으로 찾을 수 없다 */}
          <span className="admin-kit-csv-step-num">{i + 1}. </span>
          <span>{label}</span>
          {i < steps.length - 1 && <span className="admin-kit-csv-step-arrow" aria-hidden="true"> →</span>}
        </li>
      ))}
    </ol>
  );
}

/**
 * CSV 가져오기 창 틀.
 *   variant='modal'  — 카드(헤더 제목·닫기 + 단계, 본문 스크롤, 아래 버튼 줄). 막은 호출부가 그린다
 *                      (앱은 막을 화면 맨 바깥으로 꺼내야 한다 — 카드 안 클릭이 막까지 올라가지 않게 막는다)
 *   variant='inline' — 어드민 탭 안에 그대로 끼운다. 제목·닫기 없이 단계·본문·버튼 줄만
 */
export function CsvImportPanel({
  variant = 'modal',
  title,
  closeLabel,
  onClose,
  steps = [],
  current = -1,
  footer,
  children,
  testId,
}) {
  const isModal = variant === 'modal';
  return (
    <div
      className={cx('admin-kit-csv', isModal ? 'is-modal' : 'is-inline')}
      role={isModal ? 'dialog' : undefined}
      aria-modal={isModal ? 'true' : undefined}
      aria-label={isModal ? title : undefined}
      data-testid={testId}
      onClick={isModal ? (e) => e.stopPropagation() : undefined}
    >
      <div className="admin-kit-csv-head">
        {isModal && (
          <div className="admin-kit-csv-titlebar">
            <h2 className="admin-kit-csv-title">{title}</h2>
            {onClose && (
              <button type="button" className="admin-modal-close" aria-label={closeLabel} onClick={onClose}>
                <IconX size={18} />
              </button>
            )}
          </div>
        )}
        <CsvImportSteps steps={steps} current={current} />
      </div>
      <div className="admin-kit-csv-body">{children}</div>
      {footer && <div className="admin-kit-csv-footer">{footer}</div>}
    </div>
  );
}

/** 아래 버튼 줄의 왼쪽/오른쪽 묶음. `start` 가 없으면 오른쪽만 붙는다. */
export function CsvImportFooter({ start, end }) {
  return (
    <>
      <div className="admin-kit-csv-footer-start">{start}</div>
      <div className="admin-kit-csv-footer-end">{end}</div>
    </>
  );
}

/**
 * 어드민 버튼 — `.admin-emp-btn` 톤.
 * tone: primary · secondary · ghost · danger(빨간 채움 — 되돌리기 어려운 확정)
 */
export function AdminButton({ tone = 'ghost', size, icon, children, className, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      className={cx(
        'admin-emp-btn',
        tone === 'danger' ? 'admin-kit-btn-danger' : `is-${tone}`,
        size === 'sm' && 'is-sm',
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

/* ── 본문 배치 ────────────────────────────────────────────────────── */

/** 세로로 쌓기. gap: 'sm'(8) · 'md'(12) · 'lg'(16) */
export function CsvStack({ gap = 'lg', children, testId }) {
  return (
    <div className={cx('admin-kit-stack', `is-gap-${gap}`)} data-testid={testId}>
      {children}
    </div>
  );
}

/** 가로로 늘어놓고 넘치면 줄바꿈. */
export function CsvInlineRow({ children, center = false }) {
  return <div className={cx('admin-kit-inline', center && 'is-center')}>{children}</div>;
}

/** 흐린 안내 글. size: 'sm'(11) · 'md'(12) · 'lg'(13), center 면 가운데 + 위아래 여백(빈 상태) */
export function CsvHint({ children, size = 'md', center = false }) {
  return <p className={cx('admin-kit-hint', `is-${size}`, center && 'is-center')}>{children}</p>;
}

/** 절 제목(+ 아이콘 · 설명). tone 이 있으면 제목 색을 띤다(warn · violet). */
export function CsvSectionHead({ icon, title, desc, tone }) {
  return (
    <div className={cx('admin-kit-section', tone && `is-${tone}`)}>
      {icon && <span className="admin-kit-section-icon">{icon}</span>}
      <div className="admin-kit-section-text">
        <p className="admin-kit-section-title">{title}</p>
        {desc && <p className="admin-kit-section-desc">{desc}</p>}
      </div>
    </div>
  );
}

/**
 * 안내·경고 띠 — 초대 창 `.admin-inv-banner` 모양.
 * tone: neutral · brand · success · warn · error
 * title 이 있으면 굵은 첫 줄 + children 이 둘째 줄, 없으면 children 한 줄.
 */
export function AdminNotice({ tone = 'neutral', icon, title, children, testId, role }) {
  return (
    <div className={cx('admin-kit-notice', `is-${tone}`, title && 'has-title')} data-testid={testId} role={role}>
      {icon && <span className="admin-kit-notice-icon">{icon}</span>}
      <div className="admin-kit-notice-text">
        {title && <p className="admin-kit-notice-title">{title}</p>}
        {title ? children != null && <p className="admin-kit-notice-desc">{children}</p> : <span>{children}</span>}
      </div>
    </div>
  );
}

/* ── 올리기 단계 ──────────────────────────────────────────────────── */

/** 파일 끌어놓기 영역 — 초대 창 CSV 탭 모양. label 로 감싸 클릭·끌어놓기가 같은 input 을 쓴다. */
export function CsvDropZone({
  dragging = false,
  title,
  hint,
  accept = '.csv',
  inputRef,
  onFileChange,
  onDragOver,
  onDragLeave,
  onDrop,
}) {
  return (
    <label
      className={cx('admin-inv-drop', 'admin-kit-drop', dragging && 'is-over')}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="admin-inv-drop-input"
        aria-label={title}
        onChange={onFileChange}
      />
      <IconUpload size={22} />
      <span className="admin-inv-drop-title">{title}</span>
      {hint && <span className="admin-inv-hint">{hint}</span>}
    </label>
  );
}

/** 끌어놓기 영역 아래 「파일이 없으신가요? [템플릿 받기]」 한 줄. */
export function CsvTemplateLine({ text, actionLabel, onAction }) {
  return (
    <div className="admin-kit-template-line">
      <span>{text}</span>
      <AdminButton tone="ghost" size="sm" icon={<IconDownload size={14} />} onClick={onAction}>
        {actionLabel}
      </AdminButton>
    </div>
  );
}

/* ── 필드 매핑 단계 ───────────────────────────────────────────────── */

/** CSV 앞 몇 줄 미리보기 표(읽기 전용). */
export function CsvDataPreview({ caption, headers = [], rows = [] }) {
  return (
    <RosterTable
      framed
      nowrap
      caption={caption || undefined}
      columns={headers.map((h, i) => ({ key: `${i}-${h}`, header: h, render: (row) => row[i] }))}
      rows={rows}
      rowKey={(row, i) => i}
    />
  );
}

/** 필드 칸들을 넓이에 맞춰 여러 열로 늘어놓는다. */
export function CsvFieldGrid({ children }) {
  return <div className="admin-kit-field-grid">{children}</div>;
}

/**
 * 라벨 + 선택 상자 한 칸.
 *   required  빨간 * (requiredTitle 은 마우스를 올리면 뜨는 설명)
 *   badge     { tone: 'success'|'warn', icon, label } — AI 가 고른 칸의 작은 표
 *   marker    라벨 뒤에 붙는 작은 아이콘(추천 표시 등)
 */
export function CsvField({ label, required = false, requiredTitle, badge, marker, children }) {
  return (
    <label className="admin-inv-field admin-kit-field">
      <span className="admin-kit-field-label">
        {label}
        {required && <span className="admin-kit-required" title={requiredTitle}>*</span>}
        {badge ? (
          <span className={cx('admin-kit-badge', `is-${badge.tone}`)}>
            {badge.icon}
            {badge.label}
          </span>
        ) : marker ? (
          <span className="admin-kit-marker">{marker}</span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

/**
 * 선택 상자 — 초대 창 `.admin-inv-select` 모양.
 *   options  [{ value, label }]
 *   placeholder  값이 '' 인 첫 선택지 문구 (없으면 안 넣는다)
 *   state    'invalid'(빨간 테두리) · 'suggested'(브랜드 테두리)
 *   accent   계층 색 — 테두리에 그 색을 옅게 쓴다
 */
export function CsvSelect({
  value,
  onChange,
  options = [],
  placeholder,
  state,
  accent,
  ariaLabel,
  minWidth = false,
}) {
  return (
    <select
      className={cx(
        'admin-inv-select',
        'admin-kit-select',
        state && `is-${state}`,
        accent && 'has-accent',
        minWidth && 'is-min',
      )}
      style={accent ? { '--kit-accent': accent } : undefined}
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value)}
    >
      {placeholder != null && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

/* ── 재직상태 매핑 단계 ───────────────────────────────────────────── */

/** CSV 값 → 우리 값 한 줄. marker 는 원래 값 옆 작은 아이콘, children 은 선택 상자. */
export function CsvMapRow({ source, marker, arrow, children }) {
  return (
    <div className="admin-kit-map-row">
      <span className="admin-kit-map-source">
        {source}
        {marker && <span className="admin-kit-marker">{marker}</span>}
      </span>
      {arrow && <span className="admin-kit-map-arrow" aria-hidden="true">{arrow}</span>}
      {children}
    </div>
  );
}

/* ── 조직 계층 단계 ───────────────────────────────────────────────── */

/** 왼쪽 계층 고르기 + 오른쪽 트리 미리보기 두 칸. */
export function CsvHierarchyLayout({ builder, preview }) {
  return (
    <div className="admin-kit-hier">
      <div className="admin-kit-hier-builder">{builder}</div>
      {preview}
    </div>
  );
}

/** 번호 동그라미. accent 가 있으면 그 색으로 채운다, emphasized 면 브랜드, 아니면 회색. */
export function CsvLevelNumber({ n, accent, emphasized = false }) {
  return (
    <span
      className={cx('admin-kit-num', accent && 'has-accent', emphasized && 'is-brand')}
      style={accent ? { '--kit-accent': accent } : undefined}
    >
      {n}
    </span>
  );
}

/** 고른 계층 한 장 — 번호 · 제목 · (추천 표) · 지우기 + 아래 내용. */
export function CsvLevelCard({ index, accent, title, badge, removeLabel, removeIcon, onRemove, children }) {
  return (
    <div className="admin-kit-level" style={accent ? { '--kit-accent': accent } : undefined}>
      <div className="admin-kit-level-head">
        <div className="admin-kit-level-title">
          <CsvLevelNumber n={index + 1} accent={accent} />
          <span>{title}</span>
          {badge && (
            <span className="admin-kit-badge is-brand">
              {badge.icon}
              {badge.label}
            </span>
          )}
        </div>
        {onRemove && (
          <button type="button" className="admin-kit-icon-btn is-danger" title={removeLabel} aria-label={removeLabel} onClick={onRemove}>
            {removeIcon}
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

/** 계층 카드 사이 아래 화살표 자리. */
export function CsvLevelGap({ icon }) {
  return <div className="admin-kit-level-gap" aria-hidden="true">{icon}</div>;
}

/** 다음 계층 고르기 카드(점선). emphasized 면 첫 계층이라 브랜드로 강조한다. */
export function CsvAddLevelCard({ number, emphasized = false, spaced = false, title, desc, children }) {
  return (
    <div className={cx('admin-kit-level-add', emphasized && 'is-brand', spaced && 'is-spaced')}>
      <div className="admin-kit-level-add-head">
        <CsvLevelNumber n={number} emphasized={emphasized} />
        <div>
          <p className="admin-kit-level-add-title">{title}</p>
          {desc && <p className="admin-kit-section-desc">{desc}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

/** 추천 열 버튼 — 브랜드 테두리 작은 버튼. */
export function CsvSuggestButton({ icon, children, onClick }) {
  return (
    <button type="button" className="admin-kit-suggest" onClick={onClick}>
      {icon}
      {children}
    </button>
  );
}

/** 브랜드색 작은 안내 줄(아이콘 + 글). */
export function CsvBrandLine({ icon, children }) {
  return (
    <p className="admin-kit-brand-line">
      {icon}
      {children}
    </p>
  );
}

/** 값 칩 묶음. */
export function CsvChipList({ children }) {
  return <div className="admin-kit-chips">{children}</div>;
}

/**
 * 값 칩. accent(계층 색) 또는 tone(warn · violet)으로 색을 정한다.
 * more 면 테두리 없는 「외 n개」.
 */
export function CsvChip({ accent, tone, size = 'sm', more = false, children }) {
  return (
    <span
      className={cx('admin-kit-chip', `is-${size}`, more ? 'is-more' : accent ? 'has-accent' : tone && `is-${tone}`)}
      style={accent && !more ? { '--kit-accent': accent } : undefined}
    >
      {children}
    </span>
  );
}

/** 트리 한 갈래를 재귀로 그린다. depth 색은 levelAccents 순서. */
function TreeRows({ nodes, depth, levelAccents, nodeIcon, branchIcon }) {
  return nodes.map((node, i) => (
    <div key={`${depth}-${i}-${node.name}`}>
      <div
        className={cx('admin-kit-tree-row', depth === 0 && 'is-root')}
        style={{ '--kit-depth': depth, '--kit-accent': levelAccents[Math.min(depth, levelAccents.length - 1)] }}
      >
        <span className="admin-kit-tree-branch">{node.children?.length > 0 ? branchIcon : null}</span>
        <span className="admin-kit-tree-icon">{nodeIcon}</span>
        <span className="admin-kit-tree-name">{node.name}</span>
      </div>
      {node.children?.length > 0 && (
        <TreeRows nodes={node.children} depth={depth + 1} levelAccents={levelAccents} nodeIcon={nodeIcon} branchIcon={branchIcon} />
      )}
    </div>
  ));
}

/**
 * 조직 트리 미리보기 칸.
 *   nodes        [{ name, children: [...] }]
 *   levelAccents 깊이별 색 (앞에서부터)
 *   emptyLines   트리가 비었을 때 안내 줄들
 *   legend       { title, items: [{ key, label, accent }] } — 계층 범례
 */
export function CsvTreePreview({
  title,
  icon,
  nodeIcon,
  branchIcon,
  emptyIcon,
  nodes = [],
  levelAccents = [],
  emptyLines = [],
  legend,
}) {
  return (
    <div className="admin-kit-tree">
      <p className="admin-kit-tree-title">
        {icon}
        {title}
      </p>
      {nodes.length > 0 ? (
        <div>
          <TreeRows nodes={nodes} depth={0} levelAccents={levelAccents} nodeIcon={nodeIcon} branchIcon={branchIcon} />
        </div>
      ) : (
        <div className="admin-kit-tree-empty">
          <span className="admin-kit-tree-empty-icon">{emptyIcon}</span>
          <p className="admin-kit-hint is-sm">
            {emptyLines.map((line, i) => (
              <span key={i}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </p>
        </div>
      )}
      {legend && legend.items?.length > 0 && (
        <div className="admin-kit-tree-legend">
          <p className="admin-kit-tree-legend-title">{legend.title}</p>
          {legend.items.map((it) => (
            <div key={it.key} className="admin-kit-tree-legend-row" style={{ '--kit-accent': it.accent }}>
              <span className="admin-kit-tree-legend-dot" />
              <span>{it.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 검토 단계 ────────────────────────────────────────────────────── */

/**
 * 그 자리에서 값을 고치는 표.
 *   columns   [{ key, label }]
 *   rows      보여 줄 행 수만큼의 배열(각 행은 columns 순서의 값 배열)
 *   onEdit    (rowIndex, columnIndex, value)
 *   cellLabel (columnLabel, rowNumber) => 접근성 이름
 */
export function CsvEditTable({ columns = [], rows = [], onEdit, cellLabel, numberHeader = '#' }) {
  return (
    <RosterTable
      framed
      dense
      scroll="both"
      maxHeight={360}
      columns={[
        {
          key: '#',
          header: numberHeader,
          width: 44,
          cellProps: { className: 'admin-kit-table-num' },
          render: (row, r) => r + 1,
        },
        ...columns.map((c, ci) => ({
          key: c.key,
          header: c.label,
          render: (row, r) => (
            <input
              className="admin-kit-cell-input"
              value={row[ci] ?? ''}
              aria-label={cellLabel ? cellLabel(c.label, r + 1) : undefined}
              onChange={(e) => onEdit?.(r, ci, e.target.value)}
            />
          ),
        })),
      ]}
      rows={rows}
      rowKey={(row, r) => r}
    />
  );
}

/* ── 미리보기·결과 단계 ───────────────────────────────────────────── */

/** 숫자 칸(AdminStatTile) 묶음 — 창 폭에 맞춰 열 수가 준다. */
export function CsvStatGrid({ columns, children }) {
  return (
    <div
      className="admin-kit-stat-grid"
      style={columns ? { '--kit-cols': columns } : undefined}
    >
      {children}
    </div>
  );
}

/** 비율 막대 — 라벨 · 백분율 · 막대. tone: success · warn · error */
export function CsvRatioBar({ label, percent = 0, tone = 'success' }) {
  const pct = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div className={cx('admin-kit-ratio', `is-${tone}`)}>
      <div className="admin-kit-ratio-head">
        <p className="admin-kit-hint is-sm">{label}</p>
        <p className="admin-kit-ratio-value">{pct}%</p>
      </div>
      <div className="admin-kit-bar">
        <div className="admin-kit-bar-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/** 오류 목록 — 빨간 제목 + 행마다 아이콘 줄. items: [{ key, text }] */
export function CsvErrorList({ title, icon, items = [] }) {
  return (
    <div className="admin-kit-stack is-gap-sm">
      <p className="admin-kit-error-title">{title}</p>
      <div className="admin-kit-error-list">
        {items.map((it) => (
          <div key={it.key} className="admin-kit-error-row">
            {icon && <span className="admin-kit-notice-icon">{icon}</span>}
            <span>{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
