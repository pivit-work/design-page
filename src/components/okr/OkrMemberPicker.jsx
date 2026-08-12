import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { nameInitials, nameFontSize } from '../shared/nameInitials.js';

/**
 * OkrMemberPicker — OKR 작성 모달의 담당자(PIC) 검색 드롭다운.
 *
 * 정본: pivit-specs okr-spec.md §3.8A + okr-policy.md §5.2B (TC-OKR-076).
 * 네이티브 select 는 조직원이 수백 명이면 검색 없이 한 줄로 전부 나열돼 고를 수가 없다.
 * 상호작용은 어드민 직원시트 FilterMenu(OrgUnitPicker 패턴)를 따른다 —
 * 검색 input + 필터된 리스트 + 바깥 클릭/Escape 닫기.
 *
 * 패널은 `position: fixed` 로 띄운다. 이 피커는 `.okr-cf-editor`(overflow-y: auto)
 * 안에서 열리는데, absolute 로 두면 스크롤 컨테이너에 잘린다.
 *
 * members: [{ id, name, role?, avatar?, color? }]
 */

/** 패널이 아래로 안 들어가면 위로 뒤집는다. 뒤집을 자리도 없으면 화면 안으로 민다. */
const PANEL_W = 248;
const PANEL_MAX_H = 288;
const GAP = 4;
const EDGE = 8;

function panelStyle(rect) {
  if (!rect) return { visibility: 'hidden' };
  const below = window.innerHeight - rect.bottom - GAP - EDGE;
  const above = rect.top - GAP - EDGE;
  const flip = below < 180 && above > below;
  const maxHeight = Math.max(120, Math.min(PANEL_MAX_H, flip ? above : below));
  const left = Math.max(EDGE, Math.min(rect.left, window.innerWidth - PANEL_W - EDGE));
  return flip
    ? { position: 'fixed', left, bottom: window.innerHeight - rect.top + GAP, width: PANEL_W, maxHeight }
    : { position: 'fixed', left, top: rect.bottom + GAP, width: PANEL_W, maxHeight };
}

function Avatar({ member }) {
  const text = nameInitials(member.name);
  if (member.avatar) {
    return <img className="okr-cf-pick-avatar" src={member.avatar} alt="" />;
  }
  return (
    <span
      className="okr-cf-pick-avatar is-fallback"
      style={{ background: member.color || 'var(--utility-gray-200)', fontSize: nameFontSize(text, 22) }}
      aria-hidden
    >
      {text}
    </span>
  );
}

export default function OkrMemberPicker({
  members = [],
  value = '',
  onChange,
  placeholder = '담당자',
  searchPlaceholder = '이름 검색...',
  noResultLabel = '검색 결과 없음',
  ariaLabel = '담당자',
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [rect, setRect] = useState(null);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const searchRef = useRef(null);

  const selected = members.find((m) => m.id === value) || null;

  const shown = useMemo(() => {
    const ql = q.trim().toLowerCase();
    if (!ql) return members;
    // 검색 대상은 이름과 역할 두 필드 (§3.8A "검색 필터 대상 필드: name, role").
    return members.filter(
      (m) => `${m.name || ''} ${m.role || ''}`.toLowerCase().includes(ql),
    );
  }, [members, q]);

  const reposition = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
  };
  // 열기는 위치를 먼저 잡고 나서 연다. 열어 두고 effect 에서 재는 순서로 하면 첫 커밋이
  // `visibility: hidden` 인데, 그 상태의 input 은 포커스를 받지 못해 autoFocus 가
  // 무시된다(브라우저 실측 — jsdom 은 가시성을 안 따져 여기서 안 걸린다).
  const toggle = () => {
    if (open) { setOpen(false); return; }
    reposition();
    setOpen(true);
  };
  useLayoutEffect(() => {
    if (!open) return;
    reposition();
    searchRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      const inWrap = wrapRef.current && wrapRef.current.contains(e.target);
      const inPanel = panelRef.current && panelRef.current.contains(e.target);
      // 패널은 wrap 밖(fixed)에 그려지므로 두 곳을 다 확인해야 한다.
      if (!inWrap && !inPanel) setOpen(false);
    };
    // Escape 는 capture 로 잡고 전파를 끊는다. 모달이 window 에 걸어 둔 Escape 핸들러가
    // 그대로 돌면 드롭다운만 닫으려던 키가 작성 모달째로 닫아 입력을 날린다.
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setOpen(false);
    };
    const onMove = () => reposition();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open]);

  const pick = (id) => {
    onChange?.(id);
    setOpen(false);
    setQ('');
  };

  return (
    <div className="okr-cf-pick" ref={wrapRef}>
      <button
        type="button"
        ref={triggerRef}
        className={`okr-cf-pick-trigger${selected ? ' is-filled' : ''}`}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        <span className="okr-cf-pick-trigger-text">{selected ? selected.name : placeholder}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="okr-cf-pick-panel" ref={panelRef} style={panelStyle(rect)}>
          <div className="okr-cf-pick-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20L16.65 16.65" />
            </svg>
            <input
              ref={searchRef}
              className="okr-cf-pick-search-input"
              aria-label={`${ariaLabel} 검색`}
              placeholder={searchPlaceholder}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="okr-cf-pick-list" role="listbox" aria-label={ariaLabel}>
            {shown.length === 0 ? (
              <p className="okr-cf-pick-empty">{noResultLabel}</p>
            ) : (
              shown.map((m) => {
                const isSel = m.id === value;
                return (
                  <button
                    type="button"
                    key={m.id}
                    role="option"
                    aria-selected={isSel}
                    className={`okr-cf-pick-opt${isSel ? ' is-selected' : ''}`}
                    onClick={() => pick(m.id)}
                  >
                    <Avatar member={m} />
                    <span className="okr-cf-pick-opt-text">
                      <span className="okr-cf-pick-opt-name">{m.name}</span>
                      {m.role && <span className="okr-cf-pick-opt-role">{m.role}</span>}
                    </span>
                    {isSel && (
                      <svg className="okr-cf-pick-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
