import { useRef, useState } from 'react';

/**
 * AdminAiPromptsCanvas — 어드민 "AI 프롬프트 설정" 화면 Pure 컴포넌트.
 * pivit-work 의 AdminAiPromptsPage 를 design-page 정본 캔버스로 포팅.
 *
 * 정본화 원칙 (AdminNotificationsCanvas 와 동일):
 *  - 데이터 fetch·저장·테스트(api.post)·삭제/복원 confirm·버전 lazy-load·토스트
 *    타이머·orgId·i18n 해소는 전부 호스트(page wrapper)가 소유한다.
 *  - Canvas 는 모든 데이터를 props 로 받고 모든 사용자 액션을 콜백 props 로 방출한다.
 *  - 사용자 노출 문자열은 DEFAULT_LABELS(한국어) 위에 labels 를 deep-merge 해서 쓴다.
 *    Canvas 는 렌더 로직에 한국어를 하드코딩하지 않는다.
 *  - 카테고리/기능 라벨·변수 설명·기본 프롬프트 텍스트는 호스트가 미리 해소해
 *    features 데이터 prop 으로 넘긴다. 버전 문자열(v{n})만 labels.version 템플릿에
 *    번호를 끼워넣는다(i18next {{version}} 보간과 동일한 경량 포매팅).
 *
 * 내부 상태(순수 UI ephemeral)만 관리한다:
 *  - search(좌측 리스트 검색어), showDefaultPrompt(기본 프롬프트 펼침),
 *    VarChip hover, textareaRef(커서 보존 변수 삽입).
 * 편집 필드(customPrompt/mode/isActive)와 showVersions 는 controlled prop 이다
 * (호스트가 기능 선택·복원·삭제 시 리셋하고, 버전은 토글 시 lazy-load 하므로).
 *
 * 스타일은 design-page 토큰 기반 src/admin.css 클래스를 재사용한다.
 * 호스트 앱은 `@pivit-work/design-page/styles/admin.css` 를 import 해야 한다.
 *
 * 데이터 형태:
 *  features: FeatureDescriptor[]
 *    FeatureDescriptor: {
 *      key, label, category,            // category/label 은 이미 해소된 라벨 문자열
 *      comingSoon,                      // AI 연동 전 기능이면 true
 *      hasCustom,                       // 저장된 커스텀 프롬프트 존재 여부
 *      customIsActive,                  // 커스텀이 활성(is_active) 상태인지 (점 색)
 *      variables: { name, desc }[],     // 컨텍스트 변수(공용+기능별, 이미 병합·해소됨)
 *      defaultPrompt,                   // 읽기전용 기본 프롬프트 텍스트
 *    }
 *  versions: { id, version, customPrompt }[]
 *  testResult: { success, response?, appliedGuidelines?, error? } | null
 */

// design-page 정본 폰트 스택. mono 는 기술 식별자용 var(--font-family-mono) 토큰.
const FONT = "'Pretendard','Noto Sans KR',sans-serif";
const MONO = "var(--font-family-mono, 'DM Mono', monospace)";
const FIELD_BG = 'var(--componentColors-alpha-alphaBlack3, rgba(0,0,0,0.03))';
const DIVIDER = '1px solid var(--border-secondary, #e6e8ea)';

const DEFAULT_LABELS = {
  title: 'AI 프롬프트 설정',
  subtitle:
    '기능별 AI 프롬프트를 조직에 맞게 다듬습니다. 기본 프롬프트에 가이드라인을 더하거나 전체를 대체할 수 있어요.',
  searchPlaceholder: '기능 검색...',
  comingSoon: '준비중',
  selectFeature: '왼쪽에서 기능을 선택하세요',
  version: 'v{{version}}',
  activeToggle: '사용',
  comingSoonNotice:
    '이 기능은 아직 AI 연동 전입니다. 지금 저장한 프롬프트는 해당 기능이 출시되면 자동으로 적용됩니다.',
  noCustom: '커스텀 프롬프트가 없습니다. 기본 프롬프트가 사용됩니다.',
  contextVariables: '사용 가능한 컨텍스트 변수',
  defaultPrompt: 'Pivit 기본 프롬프트',
  readOnly: '(읽기 전용)',
  customPrompt: '커스텀 프롬프트',
  modeAppend: '추가',
  modeOverride: '전체 대체',
  save: '저장',
  test: '테스트 실행',
  testRunning: '테스트 중...',
  testResult: '테스트 결과',
  testApplied: '적용된 가이드라인',
  delete: '기본값 복원',
  versionHistory: '버전 이력',
  restore: '복원',
};

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

// 버전 라벨 경량 보간 — labels.version('v{{version}}') 에 번호를 끼워넣는다.
function fmtVersion(template, version) {
  return String(template).replace('{{version}}', String(version));
}

// 컨텍스트 변수 칩 — design-page .admin-snap-chip(둥근 pill) 패턴을 확장.
// 중괄호는 brand 색으로 살짝 강조(에메랄드 절제), 호버 시 설명 툴팁 노출.
function VarChip({ name, desc, onInsert }) {
  const [hover, setHover] = useState(false);
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={onInsert}
        data-testid={`var-chip-${name}`}
        style={{
          padding: '5px 12px', borderRadius: 99,
          border: `1px solid ${hover ? 'var(--text-tertiary)' : 'var(--border-primary)'}`,
          background: hover ? 'var(--bg-secondary)' : 'var(--bg-primary)',
          fontFamily: FONT, fontSize: 12, fontWeight: 500,
          color: hover ? 'var(--text-primary)' : 'var(--text-secondary)',
          cursor: 'pointer', whiteSpace: 'nowrap',
          transition: 'background .15s ease, color .15s ease, border-color .15s ease',
        }}
      >
        <span style={{ color: 'var(--text-brand-tertiary)' }}>{'{{'}</span>
        {name}
        <span style={{ color: 'var(--text-brand-tertiary)' }}>{'}}'}</span>
      </button>
      {hover && desc && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)',
            background: 'var(--text-primary)', color: 'var(--bg-quaternary)',
            fontSize: 12, lineHeight: 1.5, fontWeight: 500, padding: '7px 10px', borderRadius: 8,
            width: 'max-content', maxWidth: 220, textAlign: 'center',
            boxShadow: '0 4px 16px rgba(10, 13, 18, .18)', zIndex: 60, pointerEvents: 'none',
          }}
        >
          {desc}
        </span>
      )}
    </span>
  );
}

export default function AdminAiPromptsCanvas({
  features = [],
  selectedKey = null,
  customPrompt = '',
  mode = 'append',
  isActive = true,
  selectedVersion = null,
  versions = [],
  showVersions = false,
  testResult = null,
  testLoading = false,
  toast = null,
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
}) {
  const labels = merge(DEFAULT_LABELS, providedLabels);
  const textareaRef = useRef(null);

  const [search, setSearch] = useState('');
  const [showDefaultPrompt, setShowDefaultPrompt] = useState(false);

  const selected = features.find((f) => f.key === selectedKey) || null;

  const filtered = features.filter((f) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (f.label || '').toLowerCase().includes(q) || (f.key || '').toLowerCase().includes(q);
  });

  // 커서 위치를 보존하며 변수 토큰을 커스텀 프롬프트에 삽입. 실제 값 변경은 controlled
  // 콜백(onCustomPromptChange)으로 방출한다 (textareaRef 만 내부 ephemeral).
  const insertVariable = (varName) => {
    const insertText = `{{${varName}}}`;
    const textarea = textareaRef.current;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newValue = customPrompt.slice(0, start) + insertText + customPrompt.slice(end);
      onCustomPromptChange && onCustomPromptChange(newValue);
      requestAnimationFrame(() => {
        textarea.focus();
        const newPos = start + insertText.length;
        textarea.setSelectionRange(newPos, newPos);
      });
    } else {
      onCustomPromptChange && onCustomPromptChange(customPrompt + insertText);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-primary)', fontFamily: FONT, paddingLeft: 240 /* design-page 고정 사이드바(240px) 영역 회피 */ }}>
      {/* 어드민 캔버스 — 다른 어드민 화면과 동일한 콘텐츠 영역(전체 폭) */}
      <div className="admin-canvas" style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', gap: 0 }}>
        {/* 페이지 헤더 */}
        <div style={{ marginBottom: 24 }}>
          <h1 className="admin-page-title">{labels.title}</h1>
          <p className="admin-page-subtitle" style={{ marginTop: 4 }}>{labels.subtitle}</p>
        </div>

        {/* Master-detail */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* Left — feature key list */}
          <div style={{ width: 320, flexShrink: 0, background: 'var(--bg-quaternary)', borderRadius: 16, boxShadow: 'var(--admin-card-shadow)', overflow: 'hidden', alignSelf: 'flex-start' }}>
            <div style={{ padding: '14px 16px', borderBottom: DIVIDER }}>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', display: 'inline-flex', color: 'var(--text-tertiary)', pointerEvents: 'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                </span>
                <input
                  className="admin-emp-search"
                  type="text"
                  placeholder={labels.searchPlaceholder}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label={labels.searchPlaceholder}
                />
              </div>
            </div>
            <div style={{ maxHeight: 'calc(100vh - 260px)', overflowY: 'auto' }}>
              {filtered.map((f) => {
                const active = selectedKey === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => onSelectFeature && onSelectFeature(f.key)}
                    data-testid={`feature-key-${f.key}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 16px',
                      border: 'none', borderBottom: '1px solid var(--border-secondary, #e6e8ea)', cursor: 'pointer',
                      background: active ? 'var(--bg-active)' : 'transparent', textAlign: 'left',
                      fontFamily: FONT, fontSize: 14, lineHeight: '20px',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: active ? 700 : 600,
                      boxShadow: active ? 'inset 3px 0 0 var(--text-brand-tertiary)' : 'none',
                      transition: 'background .15s ease',
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', minWidth: 44 }}>
                      {f.category}
                    </span>
                    <span style={{ flex: 1, opacity: f.comingSoon ? 0.55 : 1 }}>{f.label}</span>
                    {f.comingSoon && (
                      <span
                        data-testid={`coming-soon-${f.key}`}
                        style={{ flexShrink: 0, fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', background: 'var(--bg-secondary)', borderRadius: 6, padding: '1px 7px', letterSpacing: '-0.01em' }}
                      >
                        {labels.comingSoon}
                      </span>
                    )}
                    {f.hasCustom && (
                      <span
                        style={{ width: 6, height: 6, borderRadius: '50%', background: f.customIsActive ? 'var(--utility-green-600)' : 'var(--text-quaternary)', flexShrink: 0 }}
                        data-testid={`custom-indicator-${f.key}`}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right — editor */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {!selected ? (
              <div className="admin-card" style={{ padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: 'var(--text-tertiary)' }} data-testid="empty-state">{labels.selectFeature}</div>
              </div>
            ) : (
              <div className="admin-card" style={{ padding: 0, overflow: 'visible', opacity: isActive ? 1 : 0.6, transition: 'opacity .2s' }}>
                {/* Editor header */}
                <div style={{ padding: '18px 22px', borderBottom: DIVIDER, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>{selected.label}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
                    {selected.hasCustom && selectedVersion != null && (
                      <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontFamily: MONO }}>
                        {fmtVersion(labels.version, selectedVersion)}
                      </span>
                    )}
                    {/* is_active toggle — design-page admin-notif-toggle 정본 */}
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }} data-testid="active-toggle-label">
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600 }}>{labels.activeToggle}</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isActive}
                        onClick={() => onToggleActive && onToggleActive()}
                        data-testid="active-toggle"
                        className={`admin-notif-toggle${isActive ? ' is-on' : ''}`}
                      >
                        <span className="admin-notif-toggle-knob" />
                      </button>
                    </label>
                  </div>
                </div>

                {/* 섹션 간격 32px */}
                <div style={{ padding: '24px 22px', display: 'flex', flexDirection: 'column', gap: 32 }}>
                  {/* 아직 AI 연동 전인 기능 — 저장은 되지만 적용은 출시 후 */}
                  {selected.comingSoon && (
                    <div data-testid="coming-soon-notice" style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '12px 14px', borderRadius: 10, background: 'var(--utility-amber-50, #fffaeb)', border: '1px solid var(--utility-amber-100, #fef0c7)' }}>
                      <span style={{ color: 'var(--utility-amber-600, #dc6803)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{labels.comingSoonNotice}</span>
                    </div>
                  )}
                  {/* 현재 기본 프롬프트가 적용 중임을 알리는 중립 안내 */}
                  {!selected.hasCustom && (
                    <div data-testid="no-custom-info" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderRadius: 10, background: FIELD_BG }}>
                      <span style={{ color: 'var(--text-tertiary)', display: 'inline-flex', flexShrink: 0 }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>
                      </span>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{labels.noCustom}</span>
                    </div>
                  )}

                  {/* Context variables section */}
                  <div data-testid="context-variables-section">
                    <div className="admin-section-label" style={{ marginBottom: 10 }}>{labels.contextVariables}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {(selected.variables || []).map((v) => (
                        <VarChip
                          key={v.name}
                          name={v.name}
                          desc={v.desc}
                          onInsert={() => insertVariable(v.name)}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Default prompt (read-only collapsible) */}
                  <details
                    open={showDefaultPrompt}
                    onToggle={(e) => setShowDefaultPrompt(e.target.open)}
                    data-testid="default-prompt-section"
                  >
                    <summary className="admin-section-label" style={{ cursor: 'pointer', userSelect: 'none' }}>
                      {labels.defaultPrompt} <span style={{ fontSize: 12, color: 'var(--text-quaternary)', fontWeight: 500 }}>{labels.readOnly}</span>
                    </summary>
                    <div
                      style={{
                        marginTop: 10, padding: '14px 16px', borderRadius: 10,
                        background: FIELD_BG, fontSize: 13, fontFamily: MONO,
                        color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.7,
                      }}
                      data-testid="default-prompt-text"
                    >
                      {selected.defaultPrompt || ''}
                    </div>
                  </details>

                  {/* Custom prompt */}
                  <div>
                    <div className="admin-section-label" style={{ marginBottom: 10 }}>{labels.customPrompt}</div>
                    {/* Mode segmented — design-page admin-notif-seg 정본 */}
                    <div className="admin-notif-seg" style={{ marginBottom: 12, maxWidth: 280 }}>
                      {['append', 'override'].map((m) => {
                        const active = mode === m;
                        return (
                          <button
                            key={m}
                            onClick={() => onModeChange && onModeChange(m)}
                            data-testid={`mode-${m}`}
                            className={`admin-notif-seg-btn${active ? ' is-active' : ''}`}
                            style={{
                              fontWeight: active ? 700 : 500,
                              color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                              border: `0.5px solid ${active ? 'var(--colors-foreground-fgQuaternary)' : 'transparent'}`,
                              boxShadow: active ? '0 4px 6px -1px rgba(10, 13, 18, .10)' : 'none',
                            }}
                          >
                            {m === 'append' ? labels.modeAppend : labels.modeOverride}
                          </button>
                        );
                      })}
                    </div>

                    {/* Textarea — design-page admin-emp-input 정본(포커스 시 brand inset) */}
                    <textarea
                      ref={textareaRef}
                      value={customPrompt}
                      onChange={(e) => onCustomPromptChange && onCustomPromptChange(e.target.value)}
                      placeholder={labels.customPrompt}
                      aria-label={labels.customPrompt}
                      data-testid="prompt-textarea"
                      rows={7}
                      className="admin-emp-input"
                      style={{ width: '100%', minHeight: 150, resize: 'vertical', lineHeight: 1.7, padding: '14px 16px', borderRadius: 10, boxSizing: 'border-box' }}
                    />
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button onClick={() => onSave && onSave()} data-testid="save-btn" className="admin-invite-button">
                      {labels.save}
                    </button>
                    <button
                      onClick={() => onTest && onTest()}
                      disabled={testLoading}
                      data-testid="test-btn"
                      className="admin-link-button"
                      style={{ cursor: testLoading ? 'wait' : 'pointer' }}
                    >
                      {testLoading ? labels.testRunning : labels.test}
                    </button>
                    {/* 기본값 복원(커스텀 삭제)은 커스텀 프롬프트가 있을 때만 의미가 있다 */}
                    {selected.hasCustom && (
                      <button
                        onClick={() => onDelete && onDelete()}
                        data-testid="delete-btn"
                        className="admin-link-button"
                        style={{ marginLeft: 'auto', color: 'var(--text-error-primary)' }}
                      >
                        {labels.delete}
                      </button>
                    )}
                  </div>

                  {testResult && (
                    <div style={{ padding: '14px 16px', borderRadius: 10, background: testResult.success ? 'var(--utility-green-50)' : 'var(--utility-error-50)', border: `1px solid ${testResult.success ? 'var(--utility-green-100)' : 'var(--utility-error-100)'}` }} data-testid="test-result">
                      <div style={{ fontSize: 12, fontWeight: 700, color: testResult.success ? 'var(--utility-green-600)' : 'var(--text-error-primary)', marginBottom: 8 }}>
                        {labels.testResult}
                      </div>
                      {testResult.response && (
                        <div style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, marginBottom: 8 }}>
                          {testResult.response}
                        </div>
                      )}
                      {testResult.appliedGuidelines && (
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                          <strong>{labels.testApplied}:</strong> {testResult.appliedGuidelines}
                        </div>
                      )}
                      {testResult.error && (
                        <div style={{ fontSize: 13, color: 'var(--text-error-primary)' }}>{testResult.error}</div>
                      )}
                    </div>
                  )}

                  {/* Version history — 저장된 커스텀 프롬프트가 있을 때만 버전이 존재한다 */}
                  {selected.hasCustom && (
                  <div style={{ borderTop: DIVIDER, paddingTop: 16 }}>
                    <button
                      onClick={() => onToggleVersions && onToggleVersions()}
                      data-testid="toggle-versions"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none',
                        cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
                        fontFamily: FONT, padding: 0,
                      }}
                    >
                      <span style={{ transform: showVersions ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .15s', display: 'inline-block', fontSize: 10 }}>&#9654;</span>
                      {labels.versionHistory}
                    </button>
                    {showVersions && (
                      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }} data-testid="version-list">
                        {versions.length === 0 ? (
                          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', padding: '8px 0' }}>{labels.noCustom}</div>
                        ) : (
                          versions.map((v) => (
                            <div
                              key={v.id}
                              aria-current={selectedVersion != null && v.version === selectedVersion ? 'true' : undefined}
                              style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: FIELD_BG }}
                            >
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 3 }}>
                                  {fmtVersion(labels.version, v.version)}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, whiteSpace: 'pre-wrap', maxHeight: 60, overflow: 'hidden' }}>
                                  {v.customPrompt}
                                </div>
                              </div>
                              <button
                                onClick={() => onRestoreVersion && onRestoreVersion(v.id)}
                                data-testid={`restore-${v.id}`}
                                className="admin-link-button"
                                style={{ flexShrink: 0 }}
                              >
                                {labels.restore}
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--text-primary)', color: 'var(--bg-quaternary)', padding: '10px 22px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, boxShadow: '0 4px 20px rgba(10,13,18,.18)', zIndex: 100,
        }} data-testid="toast">
          {toast}
        </div>
      )}
    </div>
  );
}
