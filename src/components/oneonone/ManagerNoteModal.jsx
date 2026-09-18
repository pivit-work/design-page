import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Icon from '../shared/Icon.jsx';

const DEFAULT_LABELS = {
  title: '매니저 노트',
  subtitle:
    '멤버에게 보이지 않는 개인 메모입니다. 1on1 AI 피드백 초안 생성에 활용됩니다.',
  close: '닫기',
  searchPlaceholder: '팀원 검색',
  memoTitle: '성향메모',
  memoPlaceholder: '',
  messagesTitle: '상시 전달 메시지',
  messagesDesc:
    '자주 전달하고 싶은 메시지나 컨텍스트를 저장하세요. 1on1 READY 단계에서 참조됩니다.',
  messagesEmpty: '',
  addPlaceholder: '전달하고 싶은 메시지 입력..',
  addButton: '추가',
  removeMessage: '삭제',
  loading: '불러오는 중…',
};

/**
 * ManagerNoteModal — 매니저 노트 모달. Figma 17414:27470.
 *
 * 좌측: 팀원 검색 + 팀원 리스트(선택 시 brand 테두리), 우측: 선택 팀원의
 * 성향메모(textarea) + 상시 전달 메시지(칩 삭제/추가).
 *
 * members 는 [{ id, name, role, avatar, note?: { memo, messages: [] } }].
 *
 * ## 두 가지 모드
 *
 * **혼자 도는 모드(기본)** — 메모·메시지 편집을 이 컴포넌트가 들고 있다. 데모용이다.
 *
 * **호스트가 값을 쥐는 모드** — `note` 를 주면 그 값만 그리고, 편집은 `onMemoChange` ·
 * `onAddMessage` · `onRemoveMessage` 로 넘긴다. 저장 상태(`status`)·불러오는 중
 * (`loading`)·불러오기 실패(`error`)도 호스트가 준다. 실제 앱이 이 길을 쓴다 —
 * 자동 저장·권한·상한이 서버와 맞물려 있어 여기서 흉내 낼 수 없기 때문이다.
 *
 * 🔴 **불러오기에 실패하면 입력칸을 그리지 않는다.** 빈 칸은 「노트가 없다」로 읽히고,
 * 그 위에 쓰면 매니저가 몇 달 쌓은 관찰을 덮어쓴다.
 */
export default function ManagerNoteModal({
  members = [],
  initialMemberId,
  selectedMemberId,
  onSelectMember,
  note,
  onMemoChange,
  onAddMessage,
  onRemoveMessage,
  memoMaxLength,
  addDisabled = false,
  limitHint,
  status,
  loading = false,
  error,
  labels: labelOverrides,
  renderAvatar,
  icons,
  baseUrl = '',
  onClose,
}) {
  const labels = { ...DEFAULT_LABELS, ...(labelOverrides ?? {}) };
  const controlled = note != null;
  const [innerId, setInnerId] = useState(initialMemberId ?? members[0]?.id);
  const selectedId = selectedMemberId ?? innerId;
  const [search, setSearch] = useState('');
  // 멤버별 편집 상태 — 혼자 도는 모드에서만 쓴다. 열려 있는 동안만 유지.
  const [memoMap, setMemoMap] = useState({});
  const [msgMap, setMsgMap] = useState({});
  const [draft, setDraft] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const filtered = useMemo(() => {
    if (!search.trim()) return members;
    return members.filter((m) => m.name.includes(search.trim()));
  }, [members, search]);

  const selected = members.find((m) => m.id === selectedId) ?? members[0];
  if (!selected) return null;

  const memo = controlled
    ? note.memo
    : (memoMap[selected.id] ?? selected.note?.memo ?? '');
  const messages = controlled
    ? note.messages
    : (msgMap[selected.id] ?? selected.note?.messages ?? []);

  const selectMember = (m) => {
    setDraft('');
    if (onSelectMember) onSelectMember(m);
    if (selectedMemberId == null) setInnerId(m.id);
  };
  const changeMemo = (value) => {
    if (controlled) onMemoChange?.(value);
    else setMemoMap((prev) => ({ ...prev, [selected.id]: value }));
  };
  const removeMessage = (i) => {
    if (controlled) onRemoveMessage?.(i);
    else
      setMsgMap((prev) => ({
        ...prev,
        [selected.id]: messages.filter((_, idx) => idx !== i),
      }));
  };
  const addMessage = () => {
    const text = draft.trim();
    if (!text || addDisabled) return;
    if (controlled) onAddMessage?.(text);
    else
      setMsgMap((prev) => ({ ...prev, [selected.id]: [...messages, text] }));
    setDraft('');
  };

  return createPortal(
    <div className="omn-overlay" onClick={onClose}>
      <div
        className="omn-modal"
        role="dialog"
        aria-modal="true"
        aria-label={labels.title}
        data-testid="manager-note-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="omn-close"
          onClick={onClose}
          aria-label={labels.close}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="omn-scroll">
        <div className="omn-title-block">
          <h2 className="omn-title">{labels.title}</h2>
          <p className="omn-subtitle">{labels.subtitle}</p>
          {status && (
            <p
              className={`omn-status is-${status.tone ?? 'muted'}`}
              data-testid="manager-note-status"
            >
              {status.text}
            </p>
          )}
        </div>

        <div className="omn-body">
          <div className="omn-side">
            <div className="omn-search">
              <Icon src={icons?.search} size={20} color="var(--text-placeholder)" baseUrl={baseUrl} />
              <input
                type="text"
                placeholder={labels.searchPlaceholder}
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
                      {renderAvatar
                        ? renderAvatar(m)
                        : m.avatar && <img src={m.avatar} alt="" draggable={false} />}
                    </span>
                    <b className="omn-member-name">{m.name}</b>
                  </span>
                  <span className="omn-member-role">{m.role}</span>
                </button>
              ))}
            </div>
          </div>

          {loading && (
            <div className="omn-main">
              <p className="omn-placeholder" data-testid="manager-note-loading">
                {labels.loading}
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="omn-main">
              <div className="omn-error" data-testid="manager-note-load-error">
                <span>{error.text}</span>
                {error.retryLabel && (
                  <button type="button" className="omn-error-retry" onClick={error.onRetry}>
                    {error.retryLabel}
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && (
          <div className="omn-main">
            <section className="omn-section">
              <p className="omn-section-title">{labels.memoTitle}</p>
              <textarea
                className="omn-memo"
                data-testid="manager-note-memo"
                value={memo}
                maxLength={memoMaxLength}
                placeholder={labels.memoPlaceholder}
                onChange={(e) => changeMemo(e.target.value)}
              />
            </section>

            <section className="omn-section">
              <div className="omn-section-head">
                <p className="omn-section-title">{labels.messagesTitle}</p>
                <p className="omn-section-desc">{labels.messagesDesc}</p>
              </div>
              <div className="omn-messages">
                {messages.length === 0 && labels.messagesEmpty && (
                  <p className="omn-placeholder">{labels.messagesEmpty}</p>
                )}
                {messages.map((msg, i) => (
                  <div className="omn-message-chip" key={`${msg}-${i}`}>
                    <span className="omn-message-text">{msg}</span>
                    <button
                      type="button"
                      className="omn-message-remove"
                      aria-label={labels.removeMessage}
                      onClick={() => removeMessage(i)}
                    >
                      <Icon src={icons?.xClose} size={20} color="var(--text-quaternary)" baseUrl={baseUrl} />
                    </button>
                  </div>
                ))}
                {limitHint && (
                  <p className="omn-limit" data-testid="manager-note-limit">
                    {limitHint}
                  </p>
                )}
                <div className="omn-add-row">
                  <input
                    type="text"
                    className="omn-add-input"
                    data-testid="manager-note-message-input"
                    placeholder={labels.addPlaceholder}
                    value={draft}
                    disabled={addDisabled}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMessage();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="omn-add-btn"
                    disabled={addDisabled || draft.trim().length === 0}
                    onClick={addMessage}
                  >
                    {labels.addButton}
                  </button>
                </div>
              </div>
            </section>
          </div>
          )}
        </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
