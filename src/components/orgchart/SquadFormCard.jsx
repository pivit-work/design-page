/**
 * 스쿼드 생성·수정 공용 폼 — 모달이 아니라 **그리드 카드 자리에 인플레이스**로 뜬다
 * (한판 UX 유지, §4). mode: "create" = 그리드 첫 칸 삽입 / "edit" = 해당 카드 대체.
 *
 * `status` 필드는 의도적으로 없다 — 상태는 배지의 전환 메뉴(전이 규칙)로만 바꾼다.
 * 수정 API 로 우회하면 `진행중 → 보관` 같은 차단 전이가 뚫리기 때문이다(§7).
 */

import { useState } from 'react';
import { LeadStarIcon, CloseIcon, PlusIcon } from './squadIcons.jsx';

const FONT = "'Pretendard','Noto Sans KR',sans-serif";
const MONO = "'DM Mono',monospace";

export default function SquadFormCard({
  form, setForm, errors, palette, onSubmit, onCancel, leadCandidates, submitting,
}) {
  const editing = form.mode === 'edit';
  const [leadQuery, setLeadQuery] = useState('');
  const [leadOpen, setLeadOpen] = useState(false);

  const q = leadQuery.trim().toLowerCase();
  const cands = (leadCandidates || []).filter(
    (n) => q === '' || `${n.name} ${n.nameEn || ''} ${n.team || ''} ${n.dept || ''} ${n.title || ''}`.toLowerCase().includes(q),
  );
  const leadPerson = form.leadUserId
    ? (leadCandidates || []).find((n) => n.id === form.leadUserId)
    : null;

  const inputBase = {
    width: '100%', borderRadius: 6, outline: 'none', fontFamily: FONT, boxSizing: 'border-box',
  };

  return (
    <div
      data-testid={editing ? 'squad-edit-form' : 'squad-create-form'}
      style={{
        background: '#fff', border: `1.5px solid ${form.color}60`, borderRadius: 14,
        overflow: 'hidden', boxShadow: `0 6px 24px ${form.color}18`, fontFamily: FONT,
      }}
    >
      <div style={{ height: 4, background: form.color }} />
      <div style={{ padding: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A', marginBottom: 10 }}>
          {editing ? '스쿼드 수정' : '새 스쿼드'}
        </div>

        <input
          autoFocus value={form.name} maxLength={30}
          aria-label="스쿼드명"
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel(); }}
          placeholder="스쿼드명 (필수)"
          style={{
            ...inputBase, border: `1px solid ${errors.name ? '#FCA5A5' : '#E2E8F0'}`,
            padding: '7px 9px', fontSize: 12, fontWeight: 600,
          }}
        />
        {errors.name && <div style={{ fontSize: 9, color: '#DC2626', marginTop: 3 }}>{errors.name}</div>}

        <input
          value={form.mission} maxLength={60}
          aria-label="미션"
          onChange={(e) => setForm((f) => ({ ...f, mission: e.target.value }))}
          placeholder="미션 한 줄 (선택)"
          style={{ ...inputBase, marginTop: 7, border: '1px solid #E2E8F0', padding: '7px 9px', fontSize: 11 }}
        />

        <div style={{ display: 'flex', gap: 6, marginTop: 7 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 2 }}>시작일 (필수)</div>
            <input
              type="date" value={form.startDate} aria-label="시작일"
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              style={{ ...inputBase, border: '1px solid #E2E8F0', padding: '5px 7px', fontSize: 10, fontFamily: MONO }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 2 }}>종료일 (선택)</div>
            <input
              type="date" value={form.endDate} aria-label="종료일"
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              style={{
                ...inputBase, border: `1px solid ${errors.endDate ? '#FCA5A5' : '#E2E8F0'}`,
                padding: '5px 7px', fontSize: 10, fontFamily: MONO,
              }}
            />
          </div>
        </div>
        {errors.endDate && <div style={{ fontSize: 9, color: '#DC2626', marginTop: 3 }}>{errors.endDate}</div>}

        <div style={{ display: 'flex', gap: 5, marginTop: 9, alignItems: 'center' }}>
          <span style={{ fontSize: 9, color: '#94A3B8', marginRight: 2 }}>색상</span>
          {palette.map((c) => (
            <div
              key={c} onClick={() => setForm((f) => ({ ...f, color: c }))} title={c}
              data-testid={`squad-color-${c}`}
              style={{
                width: 16, height: 16, borderRadius: '50%', background: c, cursor: 'pointer',
                border: form.color === c ? '2px solid #0F172A' : '2px solid transparent',
              }}
            />
          ))}
        </div>

        {/* 팀장(리드) 선택 — 생성 폼에만. 리드 교체는 배정 편집 팝오버의 책임이라 수정 폼에는 없다 */}
        {!editing && (
          <div style={{ marginTop: 9 }}>
            <div style={{ fontSize: 9, color: '#94A3B8', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ color: '#F59E0B', display: 'inline-flex' }}><LeadStarIcon size={9} /></span>
              팀장 (리드) — 선택
            </div>
            {leadPerson ? (
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 8px',
                borderRadius: 99, background: '#FFFBEB', border: '1px solid #FDE68A',
              }}>
                <span style={{ color: '#F59E0B', display: 'inline-flex' }}><LeadStarIcon size={10} /></span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#92400E' }}>{leadPerson.name}</span>
                <span
                  onClick={() => setForm((f) => ({ ...f, leadUserId: null }))}
                  title="팀장 지정 해제"
                  style={{ color: '#D97706', cursor: 'pointer', display: 'inline-flex' }}
                >
                  <CloseIcon size={10} />
                </span>
              </div>
            ) : leadOpen ? (
              <div style={{ border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
                <input
                  autoFocus value={leadQuery} aria-label="팀장 검색"
                  onChange={(e) => setLeadQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Escape') { setLeadOpen(false); setLeadQuery(''); } }}
                  placeholder="이름·팀·직함 검색"
                  style={{ ...inputBase, border: 'none', borderBottom: '1px solid #F1F5F9', padding: '6px 8px', fontSize: 11, borderRadius: 0 }}
                />
                <div style={{ maxHeight: 110, overflowY: 'auto' }}>
                  {cands.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => { setForm((f) => ({ ...f, leadUserId: n.id })); setLeadOpen(false); setLeadQuery(''); }}
                      style={{ padding: '6px 8px', fontSize: 11, color: '#334155', cursor: 'pointer' }}
                    >
                      {n.name} <span style={{ color: '#94A3B8', fontSize: 10 }}>· {n.team} {n.title}</span>
                    </div>
                  ))}
                  {cands.length === 0 && (
                    <div style={{ padding: '6px 8px', fontSize: 10, color: '#CBD5E1' }}>검색 결과가 없습니다</div>
                  )}
                </div>
              </div>
            ) : (
              <button
                type="button" onClick={() => setLeadOpen(true)}
                style={{
                  padding: '4px 9px', borderRadius: 99, border: '1.5px dashed #FDE68A',
                  background: '#fff', color: '#D97706', cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 3,
                  fontSize: 10, fontWeight: 700, fontFamily: FONT,
                }}
              >
                <PlusIcon size={10} /> 팀장 지정
              </button>
            )}
          </div>
        )}

        {!editing && (
          <div style={{ fontSize: 9, color: '#CBD5E1', marginTop: 9, lineHeight: 1.5 }}>
            상태는 <b>준비중</b>으로 생성됩니다.
            {!form.leadUserId && ' 팀장을 지정하지 않으면 해당 조직 팀장이 이 스쿼드의 프로젝트를 편집할 수 없습니다.'}
          </div>
        )}
        {editing && (
          <div style={{ fontSize: 9, color: '#CBD5E1', marginTop: 9, lineHeight: 1.5 }}>
            상태는 여기서 바꿀 수 없습니다 — 카드의 상태 배지에서 전환하세요.
          </div>
        )}

        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
          <button
            type="button" onClick={onSubmit} disabled={submitting}
            style={{
              padding: '6px 14px', borderRadius: 7, border: 'none',
              background: submitting ? '#CBD5E1' : form.color,
              color: '#fff', fontSize: 11, fontWeight: 700,
              cursor: submitting ? 'progress' : 'pointer', fontFamily: FONT,
            }}
          >
            {editing ? '저장' : '만들기'}
          </button>
          <button
            type="button" onClick={onCancel}
            style={{
              padding: '6px 14px', borderRadius: 7, border: '1px solid #E2E8F0', background: '#fff',
              color: '#64748B', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONT,
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
