import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import StatusBadge from '../shared/StatusBadge.jsx';
import Icon from '../shared/Icon.jsx';

/**
 * MeetingShareContent — 회의록 공유 화면 (회의록 → 공유하기 클릭 시).
 * Figma 16711:37469 / 16745:46438.
 *
 * 3가지 공유 방식 중 하나 선택:
 *   - participants: 캘린더 기반 참석자 일괄 공유
 *   - manual: 참석자 수동 선택 (체크박스) + 그 외 인원 태그
 *   - external: 외부 링크 복사
 *
 * 모든 데이터/라벨은 caller 가 주입한다. 패키지 내부에는 fallback 이 없다.
 *
 * 부모(MeetingInProgressModal) 의 sticky bottom "공유 완료" 버튼이 내부 상태
 * (선택된 mode + 체크된 멤버 + 외부 추가 인원) 를 알아야 하므로 ref 로 submit
 * 시그니처 노출. 부모는 ref.current.submit() 호출 → 콜백 prop onShareSubmit
 * 으로 payload 가 흘러나간다. payload 형태:
 *   { method: 'all' | 'manual' | 'link',
 *     recipients: { name, role?, userId: string|null, email: string|null }[] }
 *
 * 받는 사람은 이름이 아니라 식별자(userId 또는 메일)로 확정한다 — pivit-specs
 * screen-minutes-share.policy.md §5.3-A·§5.3-B (PW-1418). 이름으로만 넘기면 같은
 * 이름이 둘이거나 구성원이 아닌 글을 적었을 때 메일을 못 찾아 조용히 빠졌다.
 *   - 참석자 행은 key(없으면 name)로 가른다. reachable === false 면 메일 주소가
 *     없는 사람이라 체크를 막고 기본 체크에서도 뺀다.
 *   - 「그 외 인원」은 참석자 행으로 붙이지 않고 태그로 둔다. 태그마다 × 버튼으로 뺀다.
 *   - directory({ id, name, email, department }[]) 가 드롭다운 후보다. 후보를 못 불러왔으면
 *     directoryFailed — 「검색 결과 없음」 대신 labels.directoryLoadFailed 를 보인다.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DROPDOWN_MAX = 6;

function Checkbox({ checked, onChange, disabled = false }) {
  return (
    <button
      type="button"
      className={`mtg-share-checkbox ${checked ? 'is-checked' : ''}`}
      role="checkbox"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
    >
      {checked && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M10 3.5L4.5 9L2 6.5"
            stroke="#ffffff"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </button>
  );
}

// 참석자는 예전처럼 이름 문자열로 와도 된다 — 그때는 식별자도 메일도 모른다.
function toParticipant(p) {
  if (typeof p === 'string') return { key: p, name: p, userId: null, email: null, reachable: true };
  return {
    key: p.key ?? p.userId ?? p.email ?? p.name,
    name: p.name,
    userId: p.userId ?? null,
    email: p.email ?? null,
    reachable: p.reachable !== false,
  };
}

function toMemberRow(m) {
  const reachable = m.reachable !== false;
  return {
    ...m,
    key: m.key ?? m.userId ?? m.email ?? m.name,
    userId: m.userId ?? null,
    email: m.email ?? null,
    reachable,
    checked: reachable && !!m.checked,
  };
}

const memberTag = (e) => ({ key: `u:${e.id}`, label: e.name, userId: e.id, email: e.email ?? null });

function initials(name) {
  return String(name ?? '').replace(/\s/g, '').slice(0, 2).toUpperCase();
}

const MeetingShareContent = forwardRef(function MeetingShareContent(
  {
    meeting,
    baseUrl = '',
    calendarParticipants,
    manualMembers,
    directory = [],
    directoryFailed = false,
    shareUrl,
    subtitle,
    labels,
    onShareSubmit,
  },
  ref,
) {
  const [mode, setMode] = useState('participants');
  const [members, setMembers] = useState(() => manualMembers.map(toMemberRow));
  const [tags, setTags] = useState([]); // { key, label, userId, email }
  const [query, setQuery] = useState('');
  const [ddOpen, setDdOpen] = useState(false);
  const [hint, setHint] = useState('');
  const [narrow, setNarrow] = useState(null); // 동명이인 — 드롭다운을 이 이름으로 좁힌다
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  const participants = calendarParticipants.map(toParticipant);
  const reachableParticipants = participants.filter((p) => p.reachable);
  const unreachableCount = participants.length - reachableParticipants.length;

  const toggleMember = (key) => {
    setMembers((prev) =>
      prev.map((m) => (m.key === key && m.reachable ? { ...m, checked: !m.checked } : m))
    );
  };

  const tagKeys = tags.map((t) => t.key);
  const q = query.trim().toLowerCase();
  const candidates = directory
    .filter((e) => !tagKeys.includes(`u:${e.id}`))
    .filter((e) =>
      narrow
        ? e.name === narrow
        : q === '' ||
          String(e.name ?? '').toLowerCase().includes(q) ||
          String(e.department ?? '').toLowerCase().includes(q)
    )
    .slice(0, DROPDOWN_MAX);

  const pushTag = (tag) => {
    setTags((prev) => (prev.some((t) => t.key === tag.key) ? prev : [...prev, tag]));
    setQuery('');
    setHint('');
    setNarrow(null);
    setDdOpen(false);
    inputRef.current?.focus();
  };

  const removeTag = (key) => setTags((prev) => prev.filter((t) => t.key !== key));

  // Enter 로 넣은 글을 받는 사람 하나로 확정한다 (§5.3-A 1~4). 확정 못 하면 태그를 만들지 않는다.
  const resolveEnter = (text) => {
    if (EMAIL_RE.test(text)) {
      const mail = text.toLowerCase();
      const member = directory.find((e) => String(e.email ?? '').toLowerCase() === mail);
      pushTag(member ? memberTag(member) : { key: `m:${mail}`, label: text, userId: null, email: text });
      return;
    }
    const hits = directory.filter((e) => e.name === text || (e.displayName && e.displayName === text));
    if (hits.length === 1) {
      pushTag(memberTag(hits[0]));
      return;
    }
    if (hits.length > 1) {
      setNarrow(hits[0].name);
      setDdOpen(true);
      setHint(labels.duplicateName?.(hits.length) ?? '');
      return;
    }
    setHint(labels.notFound ?? '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) resolveEnter(query.trim());
      return;
    }
    if (e.key === 'Backspace' && !query && tags.length) {
      setTags((prev) => prev.slice(0, -1));
      return;
    }
    if (e.key === 'Escape') setDdOpen(false);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op in preview */
    }
  };

  /**
   * 부모 modal 의 share-done 버튼이 호출. 현재 mode/members 에서 payload 조립해
   * onShareSubmit 으로 흘림. await 하면 비동기 share API 끝까지 대기 가능.
   */
  useImperativeHandle(
    ref,
    () => ({
      submit() {
        if (!onShareSubmit) return undefined;
        if (mode === 'participants') {
          return onShareSubmit({
            method: 'all',
            recipients: reachableParticipants.map((p) => ({
              name: p.name,
              userId: p.userId,
              email: p.email,
            })),
          });
        }
        if (mode === 'manual') {
          return onShareSubmit({
            method: 'manual',
            recipients: [
              ...members
                .filter((m) => m.checked)
                .map((m) => ({ name: m.name, role: m.role, userId: m.userId, email: m.email })),
              ...tags.map((t) => ({ name: t.label, userId: t.userId, email: t.email })),
            ],
          });
        }
        // external link mode
        return onShareSubmit({ method: 'link', recipients: [] });
      },
    }),
    [mode, members, tags, reachableParticipants, onShareSubmit],
  );

  return (
    <>
      <div className="mtg-share-header-block">
        <h2 id="mtg-progress-title" className="mtg-progress-title">{labels.title}</h2>
        <p className="mtg-progress-subtitle">{subtitle}</p>
      </div>

      <div className="mtg-share-options">
        {/* 1. 참석자 일괄 공유 */}
        <div
          className={`mtg-share-card ${mode === 'participants' ? 'is-selected' : ''}`}
          onClick={() => setMode('participants')}
          role="button"
          tabIndex={0}
        >
          <div className="mtg-share-card-head">
            <Icon
              src="/icons-solid/arrow-circle-right.svg"
              size={20}
              color="var(--colors-foreground-fgBrandPrimary, #2dbd82)"
              baseUrl={baseUrl}
            />
            <span className="mtg-share-card-title">{labels.byParticipants}</span>
          </div>
          {mode === 'participants' && (
            <div className="mtg-share-card-body">
              <p className="mtg-share-card-desc">
                {typeof labels.byParticipantsDesc === 'function'
                  ? labels.byParticipantsDesc(reachableParticipants.length)
                  : labels.byParticipantsDesc}
              </p>
              {unreachableCount > 0 && labels.unreachableNote && (
                <p className="mtg-share-hint" data-testid="mtg-share-unreachable-note">
                  {labels.unreachableNote(unreachableCount)}
                </p>
              )}
              <div className="mtg-share-pill-list">
                {participants.map((p) => (
                  <StatusBadge key={p.key} className="mtg-progress-pill">{p.name}</StatusBadge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. 수동 선택 */}
        <div
          className={`mtg-share-card ${mode === 'manual' ? 'is-selected' : ''}`}
          onClick={() => setMode('manual')}
          role="button"
          tabIndex={0}
        >
          <div className="mtg-share-card-head">
            <Icon
              src="/icons-solid/user-plus-01.svg"
              size={20}
              color="var(--text-secondary, #687079)"
              baseUrl={baseUrl}
            />
            <span className="mtg-share-card-title">{labels.manual}</span>
          </div>
          {mode === 'manual' && (
            <div className="mtg-share-card-body">
              <div className="mtg-share-section-label">{labels.attendees}</div>
              <ul className="mtg-share-member-list">
                {members.map((m) => (
                  <li
                    key={m.key}
                    className={`mtg-share-member-row ${m.reachable ? '' : 'is-unreachable'}`}
                  >
                    <Checkbox
                      checked={m.checked}
                      disabled={!m.reachable}
                      onChange={() => toggleMember(m.key)}
                    />
                    <span className="mtg-record-action-avatar">{m.name.charAt(0)}</span>
                    <span className="mtg-share-member-name">{m.name}</span>
                    <span className="mtg-share-member-role">
                      {m.reachable ? m.role : labels.noEmail}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mtg-share-section-label mtg-share-section-label-sub">
                {labels.addOthers}
              </div>
              <div
                className="tl-snippet-textarea mtg-share-recipients"
                onClick={(e) => {
                  e.stopPropagation();
                  inputRef.current?.focus();
                }}
              >
                {tags.map((tag) => (
                  <span key={tag.key} className="mtg-share-recipient" title={tag.email ?? undefined}>
                    {tag.label}
                    <button
                      type="button"
                      className="mtg-share-recipient-remove"
                      aria-label={labels.removeTag ? labels.removeTag(tag.label) : tag.label}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeTag(tag.key);
                      }}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  ref={inputRef}
                  type="text"
                  className="mtg-share-recipient-input"
                  aria-label={labels.addOthers}
                  placeholder={tags.length === 0 ? labels.addOthersPlaceholder : ''}
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setDdOpen(true);
                    setHint('');
                    setNarrow(null);
                  }}
                  onFocus={() => setDdOpen(true)}
                  onBlur={() => setTimeout(() => setDdOpen(false), 150)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {ddOpen && (
                <ul className="mtg-share-dropdown" role="listbox">
                  {candidates.length === 0 ? (
                    <li className="mtg-share-dropdown-empty" role={directoryFailed ? 'alert' : undefined}>
                      {directoryFailed ? labels.directoryLoadFailed : labels.searchEmpty}
                    </li>
                  ) : (
                    candidates.map((emp) => (
                      <li
                        key={emp.id}
                        role="option"
                        aria-selected={false}
                        className="mtg-share-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          pushTag(memberTag(emp));
                        }}
                      >
                        <span className="mtg-share-dropdown-avatar">{initials(emp.name)}</span>
                        <span className="mtg-share-dropdown-who">
                          <span className="mtg-share-dropdown-name">{emp.name}</span>
                          {emp.email && <span className="mtg-share-dropdown-email">{emp.email}</span>}
                        </span>
                        {emp.department && (
                          <span className="mtg-share-dropdown-dept">{emp.department}</span>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              )}
              {hint && (
                <p className="mtg-share-warning" role="alert">
                  {hint}
                </p>
              )}
              <div className="mtg-share-hint">{labels.addOthersHint}</div>
            </div>
          )}
        </div>

        {/* 3. 외부 링크 */}
        <div
          className={`mtg-share-card ${mode === 'external' ? 'is-selected' : ''}`}
          onClick={() => setMode('external')}
          role="button"
          tabIndex={0}
        >
          <div className="mtg-share-card-head">
            <Icon
              src="/icons-solid/link-01.svg"
              size={20}
              color="var(--text-secondary, #687079)"
              baseUrl={baseUrl}
            />
            <span className="mtg-share-card-title">{labels.externalLink}</span>
          </div>
          {mode === 'external' && (
            <div className="mtg-share-card-body">
              <p className="mtg-share-card-desc">{labels.externalLinkDesc}</p>
              <div className="mtg-share-link-row">
                <div className="mtg-share-link-url tl-snippet-textarea">{shareUrl}</div>
                <button
                  type="button"
                  className="mtg-share-copy-btn"
                  onClick={handleCopy}
                >
                  {copied ? labels.copied : labels.copy}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
});

export default MeetingShareContent;
