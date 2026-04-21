import { useState } from 'react';
import Icon from '../shared/Icon.jsx';

/**
 * MeetingShareContent — 회의록 공유 화면 (회의록 → 공유하기 클릭 시).
 * Figma 16711:37469 / 16745:46438.
 *
 * 3가지 공유 방식 중 하나 선택:
 *   - participants: 캘린더 기반 참석자 일괄 공유
 *   - manual: 참석자 수동 선택 (체크박스)
 *   - external: 외부 링크 복사
 */

const CALENDAR_PARTICIPANTS = ['David', 'Kurt', 'Ernest', 'SH', 'John'];

const MEMBER_POOL = [
  { name: 'SH', role: 'COO', checked: true },
  { name: 'David', role: 'CEO', checked: true },
  { name: 'Kurt', role: 'CTO', checked: true },
  { name: 'Ernest', role: 'COO', checked: false },
  { name: 'John', role: 'CDO', checked: false },
];

const SHARE_URL = 'https://pivit.work/m/spr-0407';

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

export default function MeetingShareContent({ meeting, baseUrl = '' }) {
  const [mode, setMode] = useState('participants');
  const [members, setMembers] = useState(MEMBER_POOL);
  const [customName, setCustomName] = useState('');
  const [copied, setCopied] = useState(false);
  const title = meeting?.title ?? '스프린트 리뷰';

  const toggleMember = (name) => {
    setMembers((prev) =>
      prev.map((m) => (m.name === name ? { ...m, checked: !m.checked } : m))
    );
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* no-op in preview */
    }
  };

  return (
    <>
      <div className="mtg-share-header-block">
        <h2 id="mtg-progress-title" className="mtg-progress-title">회의록 공유</h2>
        <p className="mtg-progress-subtitle">{title} · 2026.04.07 10:00</p>
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
            <span className="mtg-share-card-title">참석자 일괄 공유</span>
          </div>
          {mode === 'participants' && (
            <div className="mtg-share-card-body">
              <p className="mtg-share-card-desc">
                캘린더 기반 참석자 {CALENDAR_PARTICIPANTS.length}명에게 자동 발송
              </p>
              <div className="mtg-share-pill-list">
                {CALENDAR_PARTICIPANTS.map((p) => (
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
            <span className="mtg-share-card-title">수동 선택</span>
          </div>
          {mode === 'manual' && (
            <div className="mtg-share-card-body">
              <div className="mtg-share-section-label">참석자</div>
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
                그 외에 인원 추가
              </div>
              <input
                type="text"
                className="tl-snippet-textarea mtg-share-input"
                placeholder="이름 검색 또는 직접 입력 후 Enter"
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
              <div className="mtg-share-hint">이름 검색 또는 Enter로 직접 추가</div>
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
            <span className="mtg-share-card-title">외부 링크</span>
          </div>
          {mode === 'external' && (
            <div className="mtg-share-card-body">
              <p className="mtg-share-card-desc">
                링크를 복사하여 외부에 공유합니다
              </p>
              <div className="mtg-share-link-row">
                <div className="mtg-share-link-url tl-snippet-textarea">{SHARE_URL}</div>
                <button
                  type="button"
                  className="mtg-share-copy-btn"
                  onClick={handleCopy}
                >
                  {copied ? '복사됨' : '복사'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
