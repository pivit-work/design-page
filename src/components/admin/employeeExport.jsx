import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { fillExportCaption } from './employeeExportItems.js';

/**
 * 명부 내보내기 공용 부품 — `screen-admin-employees-export.policy.md`.
 *
 * 🔴 **왜 별도 모듈인가** (PW-411). 이 부품들은 원래 `AdminEmployeeSheetCanvas.jsx`
 * 안의 로컬 함수였다. 그런데 「전체 구성원」 탭은 목록·스프레드시트 **두 뷰**이고
 * (`admin-employees-two-views`), 두 뷰는 동시에 마운트된 채 감춘 쪽이 `hidden` 이다.
 * 그래서 목록 뷰를 보고 있어도 내보내기 버튼은 시트 쪽 DOM 의 크기 0 인 영역 안에
 * 있었고, 「현재 화면 그대로」 는 **보고 있지 않은 뷰**의 열을 셌다.
 *
 * 두 뷰가 같은 부품을 쓰면 (a) 버튼·모달의 모양과 `data-testid` 가 갈리지 않고
 * (b) 범위 캡션의 인원·열 수 계산이 한 곳에서만 산다. 뷰마다 따로 세면 같은 상태에서
 * 다른 숫자가 나오고, 어느 쪽이 맞는지는 받은 파일을 열어 봐야 안다.
 */

const T = {
  font: "'Pretendard','Noto Sans KR',sans-serif",
  card: '#fff',
  bg: '#F8FAFC',
  border: '#E2E8F0',
  text: '#0F172A',
  sub: '#64748B',
  muted: '#94A3B8',
  accent: '#4F6AF5',
};

/* 아이콘은 이모지(⭳ · 🔒)가 아니라 인라인 SVG 다 — OS·폰트마다 모양이 달라지고
   color 를 상속하지 않아 버튼·캡션 안에서 혼자 튄다. */
export function IconDownload({ size = 14 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'block', flexShrink: 0 }}
    >
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 19h16" />
    </svg>
  );
}

export function IconLock({ size = 12 }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      aria-hidden focusable={false} style={{ display: 'inline-block', verticalAlign: '-1px', flexShrink: 0 }}
    >
      <rect x="4" y="10" width="16" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

/**
 * 명부 내보내기 버튼 + 범위 드롭다운 — 정책 §2-1 · §2-2.
 *
 * 별도 라우트·미리보기 화면을 만들지 않는다. **목록 자체가 미리보기**이고, 여기에
 * 필드 체크박스를 또 두면 사용자가 표와 체크박스 두 곳에서 열을 관리하게 된다(§1).
 *
 * items: [{ id, label, caption, warn, sensitive }]
 */
export function ExportMenu({ items, disabled, busy, labels, onPick }) {
  const L = labels || {};
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);
  // 기본은 버튼 **왼쪽 모서리** 기준. 오른쪽으로 넘칠 때만 오른쪽 정렬로 뒤집는다.
  //
  // 한쪽으로 고정하면 반드시 한 레이아웃에서 잘린다: 우측 정렬은 이 버튼이 툴바
  // 왼편에 오는 좁은 화면에서 사이드바 아래로 밀려 잘렸고(브라우저 검증에서 발견),
  // 좌측 고정은 툴바가 한 줄로 펴져 버튼이 오른쪽 끝에 붙는 넓은 화면에서 여유가
  // 3px 밖에 없다 — 영문 로케일처럼 항목 문구가 길어지면 그대로 넘친다.
  const [alignRight, setAlignRight] = useState(false);
  useLayoutEffect(() => {
    if (!open || !menuRef.current) return;
    const r = menuRef.current.getBoundingClientRect();
    setAlignRight(r.right > window.innerWidth - 8);
  }, [open, items]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  // 대상 0명이면 열리지도 않는다 — **빈 파일을 만들지 않는다**(E1).
  const blocked = disabled || busy;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        type="button"
        data-testid="export-roster-button"
        disabled={blocked}
        title={disabled ? (L.emptyTooltip || '내보낼 대상이 없습니다') : undefined}
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 13px', borderRadius: 9,
          border: `1px solid ${T.border}`, background: T.card, fontSize: 12, fontWeight: 700,
          color: blocked ? T.muted : T.text, fontFamily: T.font,
          cursor: blocked ? 'not-allowed' : 'pointer', opacity: blocked ? 0.6 : 1,
        }}
      >
        <IconDownload size={14} />
        {busy ? (L.preparing || '생성 중…') : (L.button || '명부 내보내기')}
      </button>
      {open && !blocked && (
        <div
          ref={menuRef}
          data-testid="export-roster-menu"
          data-align={alignRight ? 'right' : 'left'}
          style={{
            position: 'absolute', top: 'calc(100% + 4px)', zIndex: 60, minWidth: 260,
            ...(alignRight ? { right: 0 } : { left: 0 }),
            background: T.card, border: `1px solid ${T.border}`, borderRadius: 10,
            boxShadow: '0 12px 32px -8px rgba(15,23,42,.24)', padding: 6,
          }}
        >
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              data-testid={`export-scope-${it.id}`}
              onClick={() => { setOpen(false); onPick(it.id); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 7,
                border: 'none', background: 'transparent', cursor: 'pointer', fontFamily: T.font,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = T.bg; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text }}>{it.label}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 2, display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                <span>{it.caption}</span>
                {/* 제출용 명부에 퇴사자가 섞여 나가는 게 가장 흔한 사고다 —
                    막지는 않고(퇴직정산·보험 상실신고 수요) amber 로 경고만 한다(E3). */}
                {it.warn && <span style={{ color: '#B45309', fontWeight: 700 }}>· {it.warn}</span>}
                {it.sensitive && (
                  <span style={{ color: '#B45309', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    · <IconLock size={11} />{it.sensitive}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 연봉 포함 확인 모달 — 정책 §2-3.
 *
 * 열람이 이미 허용된 상태에서도 **반출에는 확인을 한 번 더** 건다. 화면에서 보는
 * 것과 파일로 내보내는 것은 위험도가 다르다 — 파일은 화면을 떠나 메일·메신저로
 * 재배포되고 회수 경로가 없다.
 *
 * 기본 포커스는 `[연봉 빼고 내보내기]` 다. 명부 요청의 대다수는 연봉이 필요 없고,
 * 연봉 열은 다른 목적으로 켜 둔 채 잊혀 있기 쉽다 — 실수의 기본값을 안전한 쪽에 둔다.
 */
export function SalaryExportModal({ count, columnCount, labels, onExclude, onInclude, onClose }) {
  const L = labels || {};
  const excludeRef = useRef(null);
  useEffect(() => {
    excludeRef.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  const fill = (s) =>
    String(s || '').split('{count}').join(String(count)).split('{columns}').join(String(columnCount));
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 24, fontFamily: T.font }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div data-testid="export-salary-modal" style={{ background: '#fff', borderRadius: 14, width: 'min(460px,100%)', boxShadow: '0 20px 60px rgba(0,0,0,.22)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px 10px', display: 'flex', alignItems: 'center', gap: 8, color: '#B45309' }}>
          <IconLock size={17} />
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>
            {L.salaryTitle || '연봉이 포함된 명부를 내보냅니다'}
          </div>
        </div>
        <div style={{ padding: '0 22px 4px', fontSize: 12, color: T.sub, lineHeight: 1.8 }}>
          <div>{fill(L.salaryBody || '대상 {count}명 · {columns}열 · 연봉 열 포함')}</div>
          <div style={{ color: T.muted }}>
            {L.salaryAudit || '이 반출은 감사 로그에 기록됩니다 — 실행자·시각·조건·행 수'}
          </div>
        </div>
        <div style={{ padding: '18px 22px 18px', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: 6, border: `1px solid ${T.border}`, background: '#fff', color: T.sub, fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: 'pointer' }}
          >
            {L.cancel || '취소'}
          </button>
          <button
            ref={excludeRef}
            data-testid="export-salary-exclude"
            onClick={onExclude}
            style={{ padding: '8px 16px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: 'pointer' }}
          >
            {L.salaryExclude || '연봉 빼고 내보내기'}
          </button>
          <button
            data-testid="export-salary-include"
            onClick={onInclude}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #FECACA', background: '#fff', color: '#DC2626', fontSize: 12, fontWeight: 700, fontFamily: T.font, cursor: 'pointer' }}
          >
            {L.salaryInclude || '포함해 내보내기'}
          </button>
        </div>
      </div>
    </div>
  );
}
