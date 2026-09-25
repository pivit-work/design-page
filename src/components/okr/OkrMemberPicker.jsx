import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import Avatar from '../shared/Avatar.jsx';
import useDismissLayer from '../shared/useDismissLayer.js';
import { CheckGlyph, ChevronDownGlyph, SearchGlyph } from '../shared/lineIcons.jsx';

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

  // 바깥 누르기·Esc 는 공용 훅이 맡는다(PW-1013). 패널은 wrap 밖(fixed)에 그려지므로 둘 다
  // 안쪽이다. Esc 는 맨 위 층만 닫으므로, 이 드롭다운이 열려 있으면 작성 창은 그대로 남는다.
  useDismissLayer(() => setOpen(false), wrapRef, panelRef, open);

  useEffect(() => {
    if (!open) return undefined;
    const onMove = () => reposition();
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
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
        <ChevronDownGlyph size={12} />
      </button>
      {open && (
        <div className="okr-cf-pick-panel" ref={panelRef} style={panelStyle(rect)}>
          <div className="okr-cf-pick-search">
            <SearchGlyph size={14} />
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
                    <Avatar name={m.name} photo={m.avatar} color={m.color} size={22} />
                    <span className="okr-cf-pick-opt-text">
                      <span className="okr-cf-pick-opt-name">{m.name}</span>
                      {m.role && <span className="okr-cf-pick-opt-role">{m.role}</span>}
                    </span>
                    {isSel && (
                      <CheckGlyph className="okr-cf-pick-check" size={14} strokeWidth={2.5} />
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
