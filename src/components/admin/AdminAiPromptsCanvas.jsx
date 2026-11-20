import { useEffect, useRef, useState } from 'react';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import SearchInput from '../shared/SearchInput.jsx';
import Switch from '../shared/Switch.jsx';
import Toast from '../shared/Toast.jsx';
import Tooltip from '../shared/Tooltip.jsx';
import Button from '../shared/Button.jsx';
import StatusBadge from '../shared/StatusBadge.jsx';
import AiMark from '../shared/AiMark.jsx';
import MemberAiButton from '../oneonone/MemberAiButton.jsx';
import { isEnterKey } from '../shared/enterKey.js';
import { FrameTable, NoticeLines, PageHead, Panel } from '../frames/index.js';

/**
 * AdminAiPromptsCanvas — 어드민 "AI 프롬프트 설정" 화면 Pure 컴포넌트.
 *
 * 정본화 원칙 (AdminNotificationsCanvas 와 동일):
 *  - 데이터 fetch·저장·테스트·확인 창·이력 불러오기·토스트 타이머·i18n 은 호스트가 갖는다.
 *  - Canvas 는 모든 데이터를 props 로 받고 모든 사용자 동작을 콜백으로 내보낸다.
 *  - 사용자 노출 문자열은 DEFAULT_LABELS(한국어) 위에 labels 를 deep-merge 해서 쓴다.
 *
 * 모양 (pivit-work PW-3127 · 커트 11-19 통과 시안) — 판 · 판 안 구역 · 안내 줄 · 이력 표 · 페이지 머리는 공용 틀(PW-3139)이다.
 * 기획서: pivit-specs «Z. Backlog/AI-Prompt-Settings» spec §2~§7 · policy §5-2-A.
 *
 * 내부 상태(화면만의 것): 검색어 · 접은 갈래 · 변수 칸 접힘 · 기본 프롬프트 펼침 · 입력칸 커서.
 * 편집 값(customPrompt/mode/isActive)·이력 펼침은 호스트가 정한다(기능을 고르거나 복구하면 호스트가 되돌린다).
 *
 * 데이터 형태:
 *  features: {
 *    key, label, category,          // 해소된 글
 *    description,                    // 편집 머리 설명 한 줄(이 AI 가 언제 불리는지)
 *    comingSoon, hasCustom, customIsActive,
 *    variables: { name, desc }[], defaultPrompt,
 *  }[]
 *  versions: { id, changedAt, changedByName, changeType, mode, customPrompt }[]
 *    changedAt 은 호스트가 사용자 시간대로 만든 글 · changeType 은 policy §5-2-A 다섯 값 또는 null(옛 줄)
 *  testResult: { success, response?, appliedGuidelines?, error? } | null
 */

const DEFAULT_LABELS = {
  title: 'AI 프롬프트 설정',
  subtitle: 'AI가 생성하는 결과물을 회사의 언어와 기준으로 맞춤 설정',
  searchPlaceholder: '기능 검색...',
  searchEmpty: '검색 결과가 없습니다',
  comingSoon: '준비중',
  badgeDefault: '기본값',
  badgeCustom: '커스텀',
  dirty: '● 변경',
  selectFeature: '← 왼쪽에서 기능을 선택하세요',
  loading: '불러오는 중...',
  loadFailed: '불러오지 못했습니다',
  retry: '다시 시도',
  version: 'v{{version}}',
  activeToggle: '사용',
  comingSoonNotice:
    '이 칸을 쓰는 AI 기능이 아직 Pivit 에 없습니다. 저장해 둘 수는 있지만 지금은 어디에도 쓰이지 않습니다.',
  noCustom: '커스텀 프롬프트가 없습니다. 기본 프롬프트가 사용됩니다.',
  usingDefault: '기본 프롬프트 사용 중',
  contextVariables: '사용 가능한 컨텍스트 변수',
  defaultPrompt: 'Pivit 기본 프롬프트',
  readOnly: '읽기 전용',
  defaultPromptHelp: '기본 프롬프트란?',
  defaultPromptHelpText:
    'Pivit 이 모든 회사에 똑같이 쓰는 AI 지시문입니다. 커스텀 프롬프트는 이 지시문 뒤에 덧붙거나(추가) 이 지시문을 대신합니다(전체 대체).',
  expand: '펼치기',
  collapse: '접기',
  customPrompt: '커스텀 프롬프트',
  modeAppend: '추가',
  modeOverride: '전체 대체',
  overrideWarning:
    '전체 대체 시 AI 결과 품질이 저하될 수 있습니다. 프롬프트 엔지니어링 경험이 있을 때만 사용하세요.',
  placeholderAppend:
    '예: 우리 회사는 성장 마인드셋을 중요시합니다. 평가 시 도전 과정을 결과와 동등하게 반영해주세요.',
  placeholderOverride:
    '전체 시스템 프롬프트를 작성하세요. {{변수명}} 형식으로 컨텍스트를 삽입할 수 있습니다.',
  charCount: '{{count}} / 4,000자',
  overLimit: '4,000자를 초과할 수 없습니다',
  overrideEmpty: '전체 대체 모드에서는 프롬프트를 비울 수 없습니다',
  unknownVariable: '지원하지 않는 변수입니다: {{names}}',
  save: '저장',
  test: '테스트 실행',
  testRunning: '테스트 중...',
  testResult: '테스트 결과',
  testApplied: '적용된 가이드라인',
  aiTag: 'AI',
  delete: '기본값으로 초기화',
  versionHistory: '변경 이력',
  versionsEmpty: '변경 이력이 없습니다.',
  restore: '이 버전으로 복구',
  historyColumns: { at: '날짜 · 수정자', type: '변경 유형 · 적용 방식', content: '내용' },
  changeTypes: {
    edit: '수정',
    activate: '활성화',
    deactivate: '비활성화',
    reset: '초기화',
    before_restore: '복구 직전',
  },
};

/** 기획서 §4 [D] · policy §7 — 내용 최대 글자 수. */
export const AI_PROMPT_MAX_LENGTH = 4000;

function merge(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (provided[k] && typeof provided[k] === 'object' && !Array.isArray(provided[k])) {
      out[k] = merge(base[k] || {}, provided[k]);
    } else if (provided[k] !== undefined) {
      out[k] = provided[k];
    }
  }
  return out;
}

function fill(template, values) {
  return Object.entries(values).reduce((s, [k, v]) => s.replace(`{{${k}}}`, String(v)), String(template));
}

const VAR_RE = /\{\{\s*([^{}\s]+)\s*\}\}/g;

/** 입력칸 글을 «글 / 아는 변수 / 모르는 변수» 조각으로 — 강조 층과 «지원하지 않는 변수» 줄이 함께 쓴다. */
export function splitPromptVariables(text, known) {
  const parts = [];
  let last = 0;
  for (const m of String(text).matchAll(VAR_RE)) {
    if (m.index > last) parts.push({ kind: 'text', text: text.slice(last, m.index) });
    parts.push({ kind: known.has(m[1]) ? 'var' : 'unknown', text: m[0], name: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  return parts;
}

/** 저장을 막는 까닭 — 기획서 §7. 없으면 null. */
export function aiPromptSaveBlock(customPrompt, mode) {
  if (customPrompt.length > AI_PROMPT_MAX_LENGTH) return 'overLimit';
  if (mode === 'override' && !customPrompt.trim()) return 'overrideEmpty';
  return null;
}

const ChevronGlyph = ({ open }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={open ? 'aip-chev is-open' : 'aip-chev'}>
    <path d="M9 6l6 6-6 6" />
  </svg>
);
const InfoGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </svg>
);
const WarnGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M12 3.5l9.5 16.5h-19z" />
    <path d="M12 10v4M12 17h.01" />
  </svg>
);
const ResetGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12a8 8 0 1 0 2.3-5.7" />
    <path d="M4 4v4h4" />
  </svg>
);

/** 바탕 없는 한 줄 — 공용 안내 줄 틀(NoticeLines)에 «주의»·«실패» 색이 없어 그 줄 모양(14/20)에 색만 얹는다. */
function ToneLine({ tone, icon, children, testId }) {
  return (
    <p className={`aip-line is-${tone}`} data-testid={testId}>
      {icon}
      <span>{children}</span>
    </p>
  );
}

/** 접고 펴는 단추 — 판 안 구역 머리 오른쪽 자리. */
function FoldButton({ open, labels, onClick, testId }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} aria-expanded={open} data-testid={testId}>
      <ChevronGlyph open={open} />
      {open ? labels.collapse : labels.expand}
    </Button>
  );
}

/** 판 안 구역 — 공용 틀(Panel.Section: 구역 사이 가는 선 · 제목 · 오른쪽 자리). */
function Section({ title, aside, children, testId }) {
  return (
    <Panel.Section title={title} actions={aside} testId={testId}>
      {children}
    </Panel.Section>
  );
}

function PromptEditor({ value, onChange, textareaRef, selectionRef, known, placeholder, disabled, override, invalid }) {
  const backRef = useRef(null);
  const parts = splitPromptVariables(value, known);
  return (
    <div className={['aip-editor', override ? 'is-override' : '', disabled ? 'is-disabled' : '', invalid ? 'is-invalid' : ''].filter(Boolean).join(' ')}>
      <div className="aip-editor-back" ref={backRef} aria-hidden>
        {parts.map((p, i) =>
          p.kind === 'text' ? (
            <span key={i}>{p.text}</span>
          ) : (
            <mark key={i} className={p.kind === 'var' ? 'aip-var' : 'aip-var is-unknown'}>
              {p.text}
            </mark>
          ),
        )}
        {'\n'}
      </div>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        // 칩을 누르면 초점이 칩으로 옮겨 가므로, 마지막 커서 자리를 들고 있다가 그 자리에 넣는다(spec §5-3).
        onSelect={(e) => {
          selectionRef.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
        }}
        onScroll={(e) => {
          if (backRef.current) backRef.current.scrollTop = e.currentTarget.scrollTop;
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        aria-invalid={invalid || undefined}
        disabled={disabled}
        data-testid="prompt-textarea"
        rows={7}
        className="aip-editor-input"
      />
    </div>
  );
}

export default function AdminAiPromptsCanvas({
  features = [],
  selectedKey = null,
  customPrompt = '',
  mode = 'append',
  isActive = true,
  selectedVersion = null,
  dirty = false,
  saving = false,
  // 목록 불러오기 — 'loading' · 'error' · 'ready' (policy §6-1 불러오는 중 표시 · 「불러오지 못했습니다」 + [다시 시도])
  listState = 'ready',
  onRetryList,
  versions = [],
  showVersions = false,
  // 변경 이력 못 불러옴 — 구역 안에 「불러오지 못했습니다」 + [다시 시도] (policy §6-2)
  versionsError = false,
  onRetryVersions,
  testResult = null,
  testLoading = false,
  toast = null,
  toastTone = 'success',
  labels: providedLabels,
  onSelectFeature,
  onCustomPromptChange,
  onModeChange,
  onToggleActive,
  onSave,
  onTest,
  onDelete,
  onToggleVersions,
  onRestoreVersion,
  baseUrl = '/',
  // 제목 줄 오른쪽에 둘 짧은 안내(예: 저장 방식 안내).
  headerAside = null,
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);
  const textareaRef = useRef(null);
  // 입력칸의 마지막 커서 자리 — 한 번도 안 눌렀으면 null(끝에 붙인다). 기능을 바꾸면 비운다.
  const selectionRef = useRef(null);
  useEffect(() => {
    selectionRef.current = null;
  }, [selectedKey]);

  const [search, setSearch] = useState('');
  const [closedCats, setClosedCats] = useState(() => new Set());
  const [showVariables, setShowVariables] = useState(true);
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);

  const selected = features.find((f) => f.key === selectedKey) || null;

  const q = search.trim().toLowerCase();
  const filtered = features.filter(
    (f) => !q || (f.label || '').toLowerCase().includes(q) || (f.key || '').toLowerCase().includes(q),
  );
  const groups = [];
  for (const f of filtered) {
    const g = groups[groups.length - 1];
    if (g && g.category === f.category) g.items.push(f);
    else groups.push({ category: f.category, items: [f] });
  }

  // 변수 칩을 누르면 커서 자리에 넣는다. 입력칸에 커서가 없으면 끝에 붙인다(spec §5-3).
  const insertVariable = (varName) => {
    const insertText = `{{${varName}}}`;
    const textarea = textareaRef.current;
    const sel = selectionRef.current;
    const start = sel ? Math.min(sel.start, customPrompt.length) : customPrompt.length;
    const end = sel ? Math.min(sel.end, customPrompt.length) : customPrompt.length;
    selectionRef.current = { start: start + insertText.length, end: start + insertText.length };
    onCustomPromptChange?.(customPrompt.slice(0, start) + insertText + customPrompt.slice(end));
    requestAnimationFrame(() => {
      if (!textarea) return;
      textarea.focus();
      const pos = start + insertText.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  const toggleCat = (cat) =>
    setClosedCats((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });

  const onRowKey = (fn) => (e) => {
    if (!isEnterKey(e) && e.key !== ' ') return;
    e.preventDefault();
    fn();
  };

  const featureRow = (f) => {
    const on = selectedKey === f.key;
    const badge = on && dirty ? (
      <span className="aip-dirty" data-testid={`dirty-${f.key}`}>{labels.dirty}</span>
    ) : f.comingSoon ? (
      <>
        <StatusBadge tone="neutral" className="aip-badge" data-testid={`coming-soon-${f.key}`}>{labels.comingSoon}</StatusBadge>
        {f.hasCustom && f.customIsActive && <StatusBadge tone="info" className="aip-badge">{labels.badgeCustom}</StatusBadge>}
      </>
    ) : f.hasCustom && f.customIsActive ? (
      <StatusBadge tone="info" className="aip-badge" data-testid={`badge-custom-${f.key}`}>{labels.badgeCustom}</StatusBadge>
    ) : (
      // 기획서 §3-1 딱지는 «기본값» · «커스텀» 둘 — 꺼 둔 회사 프롬프트도 기본 프롬프트를 쓰므로 «기본값».
      <StatusBadge tone="neutral" className="aip-badge" data-testid={`badge-default-${f.key}`}>{labels.badgeDefault}</StatusBadge>
    );
    return (
      <div
        key={f.key}
        role="button"
        tabIndex={0}
        aria-pressed={on}
        className={['aip-row', on ? 'is-on' : '', f.comingSoon ? 'is-soon' : ''].filter(Boolean).join(' ')}
        onClick={() => onSelectFeature?.(f.key)}
        onKeyDown={onRowKey(() => onSelectFeature?.(f.key))}
        data-testid={`feature-key-${f.key}`}
      >
        <Tooltip content={f.label} wrap className="aip-row-name-wrap">
          <span className="aip-row-name">{f.label}</span>
        </Tooltip>
        {badge}
      </div>
    );
  };

  const list = (
    <div className="aip-list">
      <Panel testId="aip-feature-list">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={labels.searchPlaceholder}
          aria-label={labels.searchPlaceholder}
          data-testid="aip-search"
        />
        <div className="aip-rows">
          {listState === 'loading' ? (
            <div className="aip-list-empty" data-testid="aip-list-loading" aria-busy="true">
              <NoticeLines lines={[labels.loading]} tone="muted" />
            </div>
          ) : listState === 'error' ? (
            <div className="aip-list-empty aip-retry" data-testid="aip-list-error">
              <NoticeLines lines={[labels.loadFailed]} tone="muted" />
              <Button variant="secondary" size="sm" onClick={() => onRetryList?.()} data-testid="aip-list-retry">
                {labels.retry}
              </Button>
            </div>
          ) : groups.length === 0 ? (
            <div className="aip-list-empty" data-testid="aip-search-empty">
              <NoticeLines lines={[labels.searchEmpty]} tone="muted" />
            </div>
          ) : (
            groups.map((g) => {
              const open = !closedCats.has(g.category) || !!q;
              return (
                <div key={g.category} className="aip-group">
                  <div
                    role="button"
                    tabIndex={0}
                    aria-expanded={open}
                    className="aip-cat"
                    onClick={() => toggleCat(g.category)}
                    onKeyDown={onRowKey(() => toggleCat(g.category))}
                    data-testid={`aip-cat-${g.category}`}
                  >
                    <ChevronGlyph open={open} />
                    <span>{g.category}</span>
                  </div>
                  {open && g.items.map(featureRow)}
                </div>
              );
            })
          )}
        </div>
      </Panel>
    </div>
  );

  if (!selected) {
    return (
      <Shell labels={labels} headerAside={headerAside} toast={toast} toastTone={toastTone}>
        {list}
        <Panel testId="aip-editor-empty">
          <div className="aip-pick-empty" data-testid="empty-state">
            <NoticeLines lines={[labels.selectFeature]} tone="muted" />
          </div>
        </Panel>
      </Shell>
    );
  }

  const known = new Set((selected.variables || []).map((v) => v.name));
  const unknownNames = [
    ...new Set(splitPromptVariables(customPrompt, known).filter((p) => p.kind === 'unknown').map((p) => `{{${p.name}}}`)),
  ];
  const block = aiPromptSaveBlock(customPrompt, mode);
  const off = !isActive;
  const locked = off || saving;
  const testError = testResult && !testResult.success;

  const head = (
    <div className="aip-head-aside">
      {selected.hasCustom && selectedVersion != null && (
        <span className="aip-ver">{fill(labels.version, { version: selectedVersion })}</span>
      )}
      <label className="aip-toggle" data-testid="active-toggle-label">
        <span>{labels.activeToggle}</span>
        <Switch checked={isActive} onChange={() => onToggleActive?.()} disabled={saving} data-testid="active-toggle" />
      </label>
    </div>
  );

  return (
    <Shell labels={labels} headerAside={headerAside} toast={toast} toastTone={toastTone}>
      {list}
      <Panel title={`${selected.category} / ${selected.label}`} actions={head} testId="aip-editor">
        {selected.description && <NoticeLines lines={[selected.description]} tone="muted" testId="aip-description" />}
        {(selected.comingSoon || off || !selected.hasCustom) && (
          <div className="aip-notes" data-testid="aip-notes">
            {selected.comingSoon && (
              <ToneLine tone="warning" icon={<WarnGlyph />} testId="coming-soon-notice">{labels.comingSoonNotice}</ToneLine>
            )}
            {off ? (
              <ToneLine tone="muted" icon={<InfoGlyph />} testId="using-default-notice">{labels.usingDefault}</ToneLine>
            ) : (
              !selected.hasCustom && (
                <ToneLine tone="muted" icon={<InfoGlyph />} testId="no-custom-info">{labels.noCustom}</ToneLine>
              )
            )}
          </div>
        )}

        <Section
          title={labels.contextVariables}
          aside={<FoldButton open={showVariables} labels={labels} onClick={() => setShowVariables((v) => !v)} testId="toggle-variables" />}
          testId="context-variables-section"
        >
          {showVariables && (
            <div className="aip-chips">
              {(selected.variables || []).map((v) => (
                <Tooltip key={v.name} content={v.desc}>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={locked}
                    onClick={() => insertVariable(v.name)}
                    data-testid={`var-chip-${v.name}`}
                  >
                    <span className="aip-chip-text">
                      <i>{'{{'}</i>
                      {v.name}
                      <i>{'}}'}</i>
                    </span>
                  </Button>
                </Tooltip>
              ))}
            </div>
          )}
        </Section>

        <Section
          title={labels.defaultPrompt}
          aside={
            <>
              <StatusBadge tone="neutral" className="aip-badge">{labels.readOnly}</StatusBadge>
              <Tooltip content={labels.defaultPromptHelpText} maxWidth={320}>
                <span className="aip-help" tabIndex={0} data-testid="default-prompt-help">
                  <InfoGlyph />
                  {labels.defaultPromptHelp}
                </span>
              </Tooltip>
              <FoldButton open={showDefaultPrompt} labels={labels} onClick={() => setShowDefaultPrompt((v) => !v)} testId="toggle-default-prompt" />
            </>
          }
          testId="default-prompt-section"
        >
          {showDefaultPrompt && (
            <p className="ono-my-readbox aip-readbox" data-testid="default-prompt-text">
              {selected.defaultPrompt || ''}
            </p>
          )}
        </Section>

        <Section title={labels.customPrompt} testId="custom-prompt-section">
          <div className="aip-custom">
          <div className="aip-seg">
            <SegmentedControl
              block
              ariaLabel={labels.customPrompt}
              items={['append', 'override'].map((m) => ({
                value: m,
                label: m === 'append' ? labels.modeAppend : labels.modeOverride,
                testId: `mode-${m}`,
                disabled: locked,
              }))}
              value={mode}
              onChange={(m) => onModeChange?.(m)}
            />
          </div>
          {mode === 'override' && (
            <ToneLine tone="warning" icon={<WarnGlyph />} testId="override-warning">{labels.overrideWarning}</ToneLine>
          )}
          <PromptEditor
            value={customPrompt}
            onChange={(v) => onCustomPromptChange?.(v)}
            textareaRef={textareaRef}
            selectionRef={selectionRef}
            known={known}
            placeholder={mode === 'override' ? labels.placeholderOverride : labels.placeholderAppend}
            disabled={locked}
            override={mode === 'override'}
            invalid={block === 'overLimit'}
          />
          <div className="aip-under">
            <div className="aip-under-msgs">
              {block && !off && (
                <ToneLine tone="error" testId="save-block-reason">{labels[block]}</ToneLine>
              )}
              {unknownNames.length > 0 && (
                <ToneLine tone="warning" testId="unknown-variable">{fill(labels.unknownVariable, { names: unknownNames.join(' ') })}</ToneLine>
              )}
            </div>
            <span className={block === 'overLimit' ? 'aip-count is-over' : 'aip-count'} data-testid="char-count">
              {fill(labels.charCount, { count: customPrompt.length.toLocaleString('ko-KR') })}
            </span>
          </div>

          <div className="aip-actions">
            <Button
              variant="primary"
              onClick={() => onSave?.()}
              pending={saving}
              disabled={off || !dirty || !!block}
              data-testid="save-btn"
            >
              {labels.save}
            </Button>
            <MemberAiButton
              label={testLoading ? labels.testRunning : labels.test}
              aiWord={false}
              pending={testLoading}
              disabled={locked}
              onClick={() => onTest?.()}
              baseUrl={baseUrl}
              className="aip-ai-btn"
              testId="test-btn"
            />
            <span className="aip-gap" />
            {selected.hasCustom && (
              <Button variant="danger-ghost" onClick={() => onDelete?.()} disabled={locked} data-testid="delete-btn">
                <ResetGlyph />
                {labels.delete}
              </Button>
            )}
          </div>

          {testResult && !testError && (
            <div className="aip-result" data-testid="test-result">
              <div className="aip-result-head">
                <span className="ons-ai-tag aip-ai-tag">
                  <AiMark size={12} baseUrl={baseUrl} />
                  {labels.aiTag}
                </span>
                <span>{labels.testResult}</span>
              </div>
              <div className="ono-my-readbox is-ai aip-readbox">
                {testResult.response}
                {testResult.appliedGuidelines && (
                  <span className="aip-applied">
                    <b>{labels.testApplied}</b>
                    {testResult.appliedGuidelines}
                  </span>
                )}
              </div>
            </div>
          )}
          {testError && (
            <ToneLine tone="error" testId="test-result">{testResult.error}</ToneLine>
          )}
          </div>
        </Section>

        <Section
          title={labels.versionHistory}
          aside={<FoldButton open={showVersions} labels={labels} onClick={() => onToggleVersions?.()} testId="toggle-versions" />}
          testId="version-section"
        >
          {showVersions && versionsError && (
            <div className="aip-retry is-left" data-testid="versions-error">
              <NoticeLines lines={[labels.loadFailed]} tone="muted" />
              <Button variant="secondary" size="sm" onClick={() => onRetryVersions?.()} data-testid="versions-retry">
                {labels.retry}
              </Button>
            </div>
          )}
          {showVersions && !versionsError && (
            <FrameTable
              testId="version-list"
              ariaLabel={labels.versionHistory}
              maxRows={6}
              rowKey={(v) => v.id}
              rows={versions}
              empty={labels.versionsEmpty}
              columns={[
                // spec §4 [E] «날짜 + 수정자 이름» 한 칸 — 두 줄(날짜 · 이름). 칸을 줄여 1440 에서 [이 버전으로 복구]가 판 안에 든다.
                {
                  key: 'at',
                  header: labels.historyColumns.at,
                  width: 160,
                  render: (v) => (
                    <span className="aip-type-cell">
                      <span>{v.changedAt}</span>
                      {v.changedByName && <span className="aip-by">{v.changedByName}</span>}
                    </span>
                  ),
                },
                // 변경 유형 딱지 + 적용 방식(딱지가 아닌 따로 보이는 글 · policy §5-2-A) — 한 칸 두 줄. 1280 에서도 [이 버전으로 복구]가 판 안에 들게.
                {
                  key: 'type',
                  header: labels.historyColumns.type,
                  width: 100,
                  render: (v) => (
                    <span className="aip-type-cell">
                      {v.changeType && labels.changeTypes[v.changeType] && (
                        <StatusBadge tone="neutral" className="aip-badge" data-testid={`change-type-${v.id}`}>
                          {labels.changeTypes[v.changeType]}
                        </StatusBadge>
                      )}
                      <span className="aip-by" data-testid={`change-mode-${v.id}`}>
                        {v.mode === 'override' ? labels.modeOverride : labels.modeAppend}
                      </span>
                    </span>
                  ),
                },
                { key: 'content', header: labels.historyColumns.content, lines: 2, width: 190, render: (v) => v.customPrompt },
                {
                  key: 'restore',
                  header: '',
                  align: 'right',
                  render: (v) => (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={saving}
                      onClick={() => onRestoreVersion?.(v.id)}
                      data-testid={`restore-${v.id}`}
                    >
                      {labels.restore}
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </Section>
      </Panel>
    </Shell>
  );
}

/** 화면 틀 — 왼쪽 메뉴 자리를 비우고, 안쪽이 스크롤된다(다른 어드민 화면과 같은 콘텐츠 영역). */
function Shell({ labels, headerAside, toast, toastTone, children }) {
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', fontFamily: FONT, paddingLeft: 240 /* design-page 고정 사이드바(240px) 영역 회피 */ }}>
      <div className="admin-canvas aip-page">
        <PageHead title={labels.title} description={[labels.subtitle]} actions={headerAside} testId="aip-header" />
        <div className="aip-split">{children}</div>
      </div>
      {/* 알림 문구는 공용 Toast 한 벌 (PW-1010). 실패 문구는 toastTone="error" 로 빨강 */}
      <Toast message={toast} tone={toastTone} data-testid="toast" />
    </div>
  );
}

// design-page 정본 폰트 스택.
const FONT = 'var(--font-family-body)';
