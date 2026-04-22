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
 *
 * props 가 없으면 Figma 시안 그대로 demo 데이터를 사용 (backward compat).
 */

const DEFAULT_CALENDAR_PARTICIPANTS = ['David', 'Kurt', 'Ernest', 'SH', 'John'];

const DEFAULT_MEMBER_POOL = [
  { name: 'SH', role: 'COO', checked: true },
  { name: 'David', role: 'CEO', checked: true },
  { name: 'Kurt', role: 'CTO', checked: true },
  { name: 'Ernest', role: 'COO', checked: false },
  { name: 'John', role: 'CDO', checked: false },
];

const DEFAULT_SHARE_URL = 'https://pivit.work/m/spr-0407';

const DEFAULT_LABELS = {
  title: '회의록 공유',
  byParticipants: '참석자 일괄 공유',
  byParticipantsDesc: (count) => `캘린더 기반 참석자 ${count}명에게 자동 발송`,
  manual: '수동 선택',
  attendees: '참석자',
  addOthers: '그 외에 인원 추가',
  addOthersPlaceholder: '이름 검색 또는 직접 입력 후 Enter',
  addOthersHint: '이름 검색 또는 Enter로 직접 추가',
  externalLink: '외부 링크',
  externalLinkDesc: '링크를 복사하여 외부에 공유합니다',
  copy: '복사',
  copied: '복사됨',
};

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

export default function MeetingShareContent({
  meeting,
  baseUrl = '',
  calendarParticipants: calendarProp,
  manualMembers: manualProp,
  shareUrl: shareUrlProp,
  subtitle: subtitleProp,
  labels = {},
}) {
  const mergedLabels = { ...DEFAULT_LABELS, ...labels };
  const calendarParticipants = calendarProp ?? DEFAULT_CALENDAR_PARTICIPANTS;
  const initialMembers = manualProp ?? DEFAULT_MEMBER_POOL;
  const shareUrl = shareUrlProp ?? DEFAULT_SHARE_URL;

  const [mode, setMode] = useState('participants');
  const [members, setMembers] = useState(initialMembers);
  const [customName, setCustomName] = useState('');
  const [copied, setCopied] = useState(false);
  const title = meeting?.title ?? '스프린트 리뷰';
  const subtitle = subtitleProp ?? `${title} · 2026.04.07 10:00`;

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

  return (
    <>
      <div className="mtg-share-header-block">
        <h2 id="mtg-progress-title" className="mtg-progress-title">
          {mergedLabels.title}
        </h2>
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
            <span className="mtg-share-card-title">{mergedLabels.byParticipants}</span>
          </div>
          {mode === 'participants' && (
            <div className="mtg-share-card-body">
              <p className="mtg-share-card-desc">
                {typeof mergedLabels.byParticipantsDesc === 'function'
                  ? mergedLabels.byParticipantsDesc(calendarParticipants.length)
                  : mergedLabels.byParticipantsDesc}
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
            <span className="mtg-share-card-title">{mergedLabels.manual}</span>
          </div>
          {mode === 'manual' && (
            <div className="mtg-share-card-body">
              <div className="mtg-share-section-label">{mergedLabels.attendees}</div>
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
                {mergedLabels.addOthers}
              </div>
              <input
                type="text"
                className="tl-snippet-textarea mtg-share-input"
                placeholder={mergedLabels.addOthersPlaceholder}
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
              <div className="mtg-share-hint">{mergedLabels.addOthersHint}</div>
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
            <span className="mtg-share-card-title">{mergedLabels.externalLink}</span>
          </div>
          {mode === 'external' && (
            <div className="mtg-share-card-body">
              <p className="mtg-share-card-desc">
                {mergedLabels.externalLinkDesc}
              </p>
              <div className="mtg-share-link-row">
                <div className="mtg-share-link-url tl-snippet-textarea">{shareUrl}</div>
                <button
                  type="button"
                  className="mtg-share-copy-btn"
                  onClick={handleCopy}
                >
                  {copied ? mergedLabels.copied : mergedLabels.copy}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
