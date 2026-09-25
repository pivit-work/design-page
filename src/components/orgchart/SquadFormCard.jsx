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
import Chip from '../shared/Chip.jsx';
import DateInput from '../shared/DateInput.jsx';
import { LeadStarIcon, PlusIcon } from './squadIcons.jsx';
import { useOrgLabels, rich } from './orgchart-labels.jsx';

export default function SquadFormCard({
  form, setForm, errors, palette, onSubmit, onCancel, leadCandidates, submitting,
}) {
  const L = useOrgLabels();
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
      <p className="sq-form-title">{L(editing ? 'squad.form.titleEdit' : 'squad.form.titleCreate')}</p>

      <input
        autoFocus value={form.name} maxLength={30}
        aria-label={L('squad.form.name')}
        className={`sq-field${errors.name ? ' is-invalid' : ''}`}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        onKeyDown={(e) => { if (e.key === 'Enter') onSubmit(); if (e.key === 'Escape') onCancel(); }}
        placeholder={L('squad.form.namePlaceholder')}
      />
      {errors.name && <div className="sq-field-error">{errors.name}</div>}

      <input
        value={form.mission} maxLength={60}
        aria-label={L('squad.form.mission')}
        className="sq-field"
        onChange={(e) => setForm((f) => ({ ...f, mission: e.target.value }))}
        placeholder={L('squad.form.missionPlaceholder')}
      />

      <div className="sq-field-row">
        <div>
          <div className="sq-field-label">{L('squad.form.startDateLabel')}</div>
          <DateInput
            value={form.startDate} aria-label={L('squad.form.startDate')}
            className="sq-field"
            onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
          />
        </div>
        <div>
          <div className="sq-field-label">{L('squad.form.endDateLabel')}</div>
          <DateInput
            value={form.endDate} aria-label={L('squad.form.endDate')}
            className={`sq-field${errors.endDate ? ' is-invalid' : ''}`}
            onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
          />
        </div>
      </div>
      {errors.endDate && <div className="sq-field-error">{errors.endDate}</div>}

      <div className="sq-swatches">
        <span className="sq-swatches-label">{L('squad.form.color')}</span>
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
            {L('squad.form.leadLabel')}
          </div>
          {leadPerson ? (
            <div>
              <Chip
                person={{ name: leadPerson.name, photo: leadPerson.avatar }}
                onRemove={() => setForm((f) => ({ ...f, leadUserId: null }))}
                removeLabel={L('squad.form.leadClear')}
                data-testid="sq-lead-chip"
              >
                {leadPerson.name}
              </Chip>
            </div>
          ) : leadOpen ? (
            <div className="sq-lead-search">
              <input
                autoFocus value={leadQuery} aria-label={L('squad.form.leadSearch')}
                className="sq-field"
                onChange={(e) => setLeadQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Escape') { setLeadOpen(false); setLeadQuery(''); } }}
                placeholder={L('squad.form.leadSearchPlaceholder')}
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
                  <div className="sq-lead-none">{L('squad.form.leadNoResults')}</div>
                )}
              </div>
            </div>
          ) : (
            <button
              type="button" onClick={() => setLeadOpen(true)}
              className="sq-btn sq-btn-sm sq-btn-outline"
            >
              <PlusIcon size={12} /> {L('squad.form.leadPick')}
            </button>
          )}
        </div>
      )}

      {!editing && (
        <p className="sq-form-note">
          {rich(L('squad.form.noteCreate'))}
          {!form.leadUserId && L('squad.form.noteNoLead')}
        </p>
      )}
      {editing && (
        <p className="sq-form-note">
          {L('squad.form.noteEdit')}
        </p>
      )}

      <div className="sq-form-actions">
        <button
          type="button" onClick={onSubmit} disabled={submitting}
          className="sq-btn sq-btn-primary"
        >
          {L(editing ? 'squad.form.save' : 'squad.form.create')}
        </button>
        <button type="button" onClick={onCancel} className="sq-btn sq-btn-outline">
          {L('squad.form.cancel')}
        </button>
      </div>
    </div>
  );
}
