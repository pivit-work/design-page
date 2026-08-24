import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

/**
 * ManagerNoteModal — 매니저 노트 모달. Figma 17414:27470.
 *
 * 좌측: 팀원 검색 + 팀원 리스트(선택 시 brand 테두리), 우측: 선택 팀원의
 * 성향메모(textarea) + 상시 전달 메시지(칩 삭제/추가).
 *
 * members 는 [{ id, name, role, avatar, note?: { memo, messages: [] } }].
 * 메모/메시지 편집은 데모용 UI 상태로만 유지하고, 저장 연동은 호스트 몫이다.
 */
export default function ManagerNoteModal({ members = [], initialMemberId, icons, baseUrl = '', onClose }) {
  const [selectedId, setSelectedId] = useState(initialMemberId ?? members[0]?.id);
  const [search, setSearch] = useState('');
  // 멤버별 편집 상태 — 열려 있는 동안만 유지. 최초 접근 시 member.note 로 초기화.
  const [memoMap, setMemoMap] = useState({});
  const [msgMap, setMsgMap] = useState({});
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    return members.filter((m) => m.name.includes(search.trim()));
  }, [members, search]);

  const selected = members.find((m) => m.id === selectedId) ?? members[0];
  if (!selected) return null;

  const memo = memoMap[selected.id] ?? selected.note?.memo ?? '';
  const messages = msgMap[selected.id] ?? selected.note?.messages ?? [];

  const selectMember = (m) => { setSelectedId(m.id); setDraft(''); };
  const removeMessage = (i) =>
    setMsgMap((prev) => ({ ...prev, [selected.id]: messages.filter((_, idx) => idx !== i) }));
  const addMessage = () => {
    const text = draft.trim();
    if (!text) return;
    setMsgMap((prev) => ({ ...prev, [selected.id]: [...messages, text] }));
    setDraft('');
  };

  return createPortal(
    <div className="omn-overlay" onClick={onClose}>
      <div className="omn-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="omn-close" onClick={onClose} aria-label="닫기">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="omn-scroll">
        <div className="omn-title-block">
          <h2 className="omn-title">매니저 노트</h2>
          <p className="omn-subtitle">멤버에게 보이지 않는 개인 메모입니다. 1on1 AI 피드백 초안 생성에 활용됩니다.</p>
        </div>

        <div className="omn-body">
          <div className="omn-side">
            <div className="omn-search">
              <Icon src={icons?.search} size={20} color="var(--text-placeholder)" baseUrl={baseUrl} />
              <input
                type="text"
                placeholder="팀원 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="omn-list">
              {filtered.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className={`omn-member${m.id === selected.id ? ' is-selected' : ''}`}
                  onClick={() => selectMember(m)}
                >
                  <span className="omn-member-row">
                    <span className="omn-member-avatar">
                      {m.avatar && <img src={m.avatar} alt="" draggable={false} />}
                    </span>
                    <b className="omn-member-name">{m.name}</b>
                  </span>
                  <span className="omn-member-role">{m.role}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="omn-main">
            <section className="omn-section">
              <p className="omn-section-title">성향메모</p>
              <textarea
                className="omn-memo"
                value={memo}
                onChange={(e) => setMemoMap((prev) => ({ ...prev, [selected.id]: e.target.value }))}
              />
            </section>

            <section className="omn-section">
              <div className="omn-section-head">
                <p className="omn-section-title">상시 전달 메시지</p>
                <p className="omn-section-desc">자주 전달하고 싶은 메시지나 컨텍스트를 저장하세요. 1on1 READY 단계에서 참조됩니다.</p>
              </div>
              <div className="omn-messages">
                {messages.map((msg, i) => (
                  <div className="omn-message-chip" key={`${msg}-${i}`}>
                    <span className="omn-message-text">{msg}</span>
                    <button type="button" className="omn-message-remove" onClick={() => removeMessage(i)}>
                      <Icon src={icons?.xClose} size={20} color="var(--text-quaternary)" baseUrl={baseUrl} />
                    </button>
                  </div>
                ))}
                <div className="omn-add-row">
                  <input
                    type="text"
                    className="omn-add-input"
                    placeholder="전달하고 싶은 메시지 입력.."
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addMessage(); }}
                  />
                  <button type="button" className="omn-add-btn" onClick={addMessage}>추가</button>
                </div>
              </div>
            </section>
          </div>
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
