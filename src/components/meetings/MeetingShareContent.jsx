import { forwardRef, useImperativeHandle, useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * MeetingShareContent — 회의록 공유 화면 (회의록 → 공유하기 클릭 시).
 * Figma 16711:37469 / 16745:46438.
 *
 * 3가지 공유 방식 중 하나 선택:
 *   - participants: 캘린더 기반 참석자 일괄 공유
 *   - manual: 참석자 수동 선택 (체크박스)
 *   - external: 외부 링크 복사
 *
 * 모든 데이터/라벨은 caller 가 주입한다. 패키지 내부에는 fallback 이 없다.
 *
 * 부모(MeetingInProgressModal) 의 sticky bottom "공유 완료" 버튼이 내부 상태
 * (선택된 mode + 체크된 멤버 + 외부 추가 인원) 를 알아야 하므로 ref 로 submit
 * 시그니처 노출. 부모는 ref.current.submit() 호출 → 콜백 prop onShareSubmit
 * 으로 payload 가 흘러나간다. payload 형태:
 *   { method: 'all' | 'manual' | 'link', recipients: { name, role? }[] }
 * email/userId 매핑은 caller (도메인) 책임.
 */

function Checkbox({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`mtg-share-checkbox ${checked ? 'is-checked' : ''}`}
      role="checkbox"
      aria-checked={checked}
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

const MeetingShareContent = forwardRef(function MeetingShareContent(
  {
    meeting,
    baseUrl = '',
    calendarParticipants,
    manualMembers,
    shareUrl,
    subtitle,
    labels,
    onShareSubmit,
  },
  ref,
) {
  const [mode, setMode] = useState('participants');
  const [members, setMembers] = useState(manualMembers);
  const [customName, setCustomName] = useState('');
  const [copied, setCopied] = useState(false);

  const toggleMember = (name) => {
    setMembers((prev) =>
      prev.map((m) => (m.name === name ? { ...m, checked: !m.checked } : m))
    );
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
            recipients: calendarParticipants.map((name) => ({ name })),
          });
        }
        if (mode === 'manual') {
          return onShareSubmit({
            method: 'manual',
            recipients: members
              .filter((m) => m.checked)
              .map((m) => ({ name: m.name, role: m.role })),
          });
        }
        // external link mode
        return onShareSubmit({ method: 'link', recipients: [] });
      },
    }),
    [mode, members, calendarParticipants, onShareSubmit],
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
                  ? labels.byParticipantsDesc(calendarParticipants.length)
                  : labels.byParticipantsDesc}
              </p>
              <div className="mtg-share-pill-list">
                {calendarParticipants.map((p) => (
                  <span key={p} className="mtg-progress-pill">{p}</span>
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
                  <li key={m.name} className="mtg-share-member-row">
                    <Checkbox checked={m.checked} onChange={() => toggleMember(m.name)} />
                    <span className="mtg-record-action-avatar">{m.name.charAt(0)}</span>
                    <span className="mtg-share-member-name">{m.name}</span>
                    <span className="mtg-share-member-role">{m.role}</span>
                  </li>
                ))}
              </ul>
              <div className="mtg-share-section-label mtg-share-section-label-sub">
                {labels.addOthers}
              </div>
              <input
                type="text"
                className="tl-snippet-textarea mtg-share-input"
                placeholder={labels.addOthersPlaceholder}
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && customName.trim()) {
                    setMembers((prev) => [
                      ...prev,
                      { name: customName.trim(), role: '—', checked: true },
                    ]);
                    setCustomName('');
                  }
                }}
              />
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
