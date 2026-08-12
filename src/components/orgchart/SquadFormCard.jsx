/**
 * 스쿼드 생성·수정 공용 폼 — 모달이 아니라 **그리드 카드 자리에 인플레이스**로 뜬다
 * (한판 UX 유지, §4). mode: "create" = 그리드 첫 칸 삽입 / "edit" = 해당 카드 대체.
 *
 * 그리드 안에서 다른 스쿼드 카드와 나란히 서므로 껍데기(`pj-card sq-card`)도 같은 것을
 * 쓴다 — 폼만 다른 상자로 보이면 그 자리에 구멍이 난 것처럼 읽힌다.
 *
 * `status` 필드는 의도적으로 없다 — 상태는 배지의 전환 메뉴(전이 규칙)로만 바꾼다.
 * 수정 API 로 우회하면 `진행중 → 보관` 같은 차단 전이가 뚫리기 때문이다(§7).
 */

import { useState } from 'react';
import { LeadStarIcon, CloseIcon, PlusIcon } from './squadIcons.jsx';

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

  return (
    <div
      data-testid={editing ? 'squad-edit-form' : 'squad-create-form'}
      className="pj-card sq-card sq-form"
      style={{ boxShadow: `0 6px 24px ${form.color}24` }}
    >
      <span className="sq-card-strip" style={{ background: form.color }} />

      <p className="sq-form-title">{editing ? '스쿼드 수정' : '새 스쿼드'}</p>

      <input
        autoFocus value={form.name} maxLength={30}
        aria-label="스쿼드명"
        className={`sq-field${errors.name ? ' is-invalid' : ''}`}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel(); }}
        placeholder="스쿼드명 (필수)"
      />
      {errors.name && <div className="sq-field-error">{errors.name}</div>}

      <input
        value={form.mission} maxLength={60}
        aria-label="미션"
        className="sq-field"
        onChange={(e) => setForm((f) => ({ ...f, mission: e.target.value }))}
        placeholder="미션 한 줄 (선택)"
      />

      <div className="sq-field-row">
        <div>
          <div className="sq-field-label">시작일 (필수)</div>
          <input
            type="date" value={form.startDate} aria-label="시작일"
            className="sq-field sq-field-date"
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
          />
        </div>
        <div>
          <div className="sq-field-label">종료일 (선택)</div>
          <input
            type="date" value={form.endDate} aria-label="종료일"
            className={`sq-field sq-field-date${errors.endDate ? ' is-invalid' : ''}`}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
          />
        </div>
      </div>
      {errors.endDate && <div className="sq-field-error">{errors.endDate}</div>}

      <div className="sq-swatches">
        <span className="sq-swatches-label">색상</span>
        {palette.map((c) => (
          <div
            key={c} onClick={() => setForm((f) => ({ ...f, color: c }))} title={c}
            data-testid={`squad-color-${c}`}
            className={`sq-swatch${form.color === c ? ' is-picked' : ''}`}
            style={{ background: c }}
          />
        ))}
      </div>

      {/* 팀장(리드) 선택 — 생성 폼에만. 리드 교체는 배정 편집 팝오버의 책임이라 수정 폼에는 없다 */}
      {!editing && (
        <div className="sq-lead-pick">
          <div className="sq-field-label">
            <span className="sq-lead-mark"><LeadStarIcon size={11} /></span>{' '}
            팀장 (리드) — 선택
          </div>
          {leadPerson ? (
            <div className="sq-lead-chip">
              <span className="sq-lead-mark"><LeadStarIcon size={12} /></span>
              <span className="sq-lead-chip-name">{leadPerson.name}</span>
              <span
                className="sq-lead-chip-x"
                onClick={() => setForm((f) => ({ ...f, leadUserId: null }))}
                title="팀장 지정 해제"
              >
                <CloseIcon size={12} />
              </span>
            </div>
          ) : leadOpen ? (
            <div className="sq-lead-search">
              <input
                autoFocus value={leadQuery} aria-label="팀장 검색"
                className="sq-field"
                onChange={(e) => setLeadQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setLeadOpen(false); setLeadQuery(''); } }}
                placeholder="이름·팀·직함 검색"
              />
              <div className="sq-lead-list">
                {cands.map((n) => (
                  <div
                    key={n.id}
                    className="sq-lead-item"
                    onClick={() => { setForm((f) => ({ ...f, leadUserId: n.id })); setLeadOpen(false); setLeadQuery(''); }}
                  >
                    {n.name} <span className="sq-lead-item-meta">· {n.team} {n.title}</span>
                  </div>
                ))}
                {cands.length === 0 && (
                  <div className="sq-lead-none">검색 결과가 없습니다</div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button" onClick={() => setLeadOpen(true)}
              className="sq-btn sq-btn-sm sq-btn-outline"
            >
              <PlusIcon size={12} /> 팀장 지정
            </button>
          )}
        </div>
      )}

      {!editing && (
        <p className="sq-form-note">
          상태는 <b>준비중</b>으로 생성됩니다.
          {!form.leadUserId && ' 팀장을 지정하지 않으면 해당 조직 팀장이 이 스쿼드의 프로젝트를 편집할 수 없습니다.'}
        </p>
      )}
      {editing && (
        <p className="sq-form-note">
          상태는 여기서 바꿀 수 없습니다 — 카드의 상태 배지에서 전환하세요.
        </p>
      )}

      <div className="sq-form-actions">
        <button
          type="button" onClick={onSubmit} disabled={submitting}
          className="sq-btn sq-btn-primary"
        >
          {editing ? '저장' : '만들기'}
        </button>
        <button type="button" onClick={onCancel} className="sq-btn sq-btn-outline">
          취소
        </button>
      </div>
    </div>
  );
}
