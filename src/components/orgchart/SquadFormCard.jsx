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
import Select from '../shared/Select.jsx';
import Button from '../shared/Button.jsx';
import DateInput from '../shared/DateInput.jsx';
import { LeadStarIcon, PlusIcon } from './squadIcons.jsx';
import { useOrgLabels, rich } from './orgchart-labels.jsx';
import { isEnterKey } from '../shared/enterKey.js';

/**
 * 구성원 한 명 고르기 — 고른 사람은 칩, 아니면 [고르기] → 검색 칸 + 후보 목록.
 * 스쿼드 폼의 ⭐ 팀장(리드) 칸과 묶음 관리 패널의 헤드 칸이 같은 부품을 쓴다(기획 §5-6-A «헤드 고르기는 팀장 선택 칸과 같은 부품»).
 */
export function PersonPickField({ value, candidates, onPick, labels, testId, disabled = false }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const q = query.trim().toLowerCase();
  const cands = (candidates || []).filter(
    (n) => q === '' || `${n.name} ${n.nameEn || ''} ${n.team || ''} ${n.dept || ''} ${n.title || ''}`.toLowerCase().includes(q),
  );
  const picked = value ? (candidates || []).find((n) => n.id === value) : null;
  if (picked) {
    return (
      <div>
        <Chip
          person={{ name: picked.name, photo: picked.avatar }}
          onRemove={disabled ? undefined : () => onPick(null)}
          removeLabel={labels.clear}
          data-testid={testId ? `${testId}-chip` : undefined}
        >
          {picked.name}
        </Chip>
      </div>
    );
  }
  if (open) {
    return (
      <div className="sq-lead-search">
        <input
          autoFocus value={query} aria-label={labels.search}
          className="sq-field"
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setQuery(''); } }}
          placeholder={labels.searchPlaceholder}
        />
        <div className="sq-lead-list">
          {cands.map((n) => (
            <div
              key={n.id}
              className="sq-lead-item"
              onClick={() => { onPick(n.id); setOpen(false); setQuery(''); }}
            >
              {n.name} <span className="sq-lead-item-meta">· {n.team} {n.title}</span>
            </div>
          ))}
          {cands.length === 0 && (
            <div className="sq-lead-none">{labels.none}</div>
          )}
        </div>
      </div>
    );
  }
  return (
    <Button
      type="button" onClick={() => setOpen(true)} disabled={disabled}
      className="sq-btn sq-btn-sm sq-btn-outline"
      data-testid={testId ? `${testId}-open` : undefined}
    >
      <PlusIcon size={12} /> {labels.pick}
    </Button>
  );
}

export default function SquadFormCard({
  form, setForm: setFormRaw, errors, palette, onSubmit: submitRaw, onCancel, leadCandidates, submitting,
  // 소속 묶음 칸(PW-2599 · §5-6-A) — 층이 없으면 칸이 없다
  groupLevelName = null, groupOptions = null,
  /**
   * 읽기 전용 — 폼을 연 사이 권한이 거둬져 저장이 거절됐을 때(pivit-work PW-2635 · 스쿼드 정책 §7-18).
   * 폼은 닫지 않고 적던 글을 남겨 복사할 수 있게 한다. 값은 바뀌지 않고 [저장]·[만들기]는 꺼진다.
   */
  readOnly = false,
}) {
  const setForm = readOnly ? () => {} : setFormRaw;
  const onSubmit = readOnly ? () => {} : submitRaw;
  const L = useOrgLabels();
  const editing = form.mode === 'edit';

  return (
    <div
      data-testid={editing ? 'squad-edit-form' : 'squad-create-form'}
      className="pj-card sq-card sq-form"
      style={{ boxShadow: `0 6px 24px ${form.color}24` }}
    >
      <p className="sq-form-title">{L(editing ? 'squad.form.titleEdit' : 'squad.form.titleCreate')}</p>

      {/* 칸마다 이름표를 위에 단다 — 안내 글자는 입력하면 사라져 무슨 칸인지 잊는다.
          이름표·간격·입력칸은 1on1 「일정 추가」 창 값 그대로 (PW-1900, org_squad.css) */}
      <div className="sq-form-fields">
        <div className="sq-form-field">
          <label className="sq-field-label" htmlFor={`squad-kind-${form.id || 'new'}`}>{L('squad.form.kind')}</label>
          <Select disabled={readOnly} aria-label={L('squad.form.kind')} id={`squad-kind-${form.id || 'new'}`} className="sq-field" value={form.kind || 'squad'} onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}>
            <option value="squad">{L('squad.form.squad')}</option>
            <option value="tf">{L('squad.form.tf')}</option>
          </Select>
        </div>
        <div className="sq-form-field">
          <div className="sq-field-label">{L('squad.form.name')}</div>
          <input
            autoFocus value={form.name} maxLength={30} readOnly={readOnly}
            aria-label={L('squad.form.name')}
            className={`sq-field${errors.name ? ' is-invalid' : ''}`}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            onKeyDown={(e) => { if (isEnterKey(e)) onSubmit(); if (e.key === 'Escape') onCancel(); }}
            placeholder={L('squad.form.namePlaceholder')}
          />
          {errors.name && <div className="sq-field-error">{errors.name}</div>}
        </div>

        <div className="sq-form-field">
          <div className="sq-field-label">{L('squad.form.mission')}</div>
          <input
            value={form.mission} maxLength={60} readOnly={readOnly}
            aria-label={L('squad.form.mission')}
            className="sq-field"
            onChange={(e) => setForm((f) => ({ ...f, mission: e.target.value }))}
            placeholder={L('squad.form.missionPlaceholder')}
          />
        </div>

        <div className="sq-field-row">
          <div className="sq-form-field">
            <div className="sq-field-label">{L('squad.form.startDateLabel')}</div>
            <DateInput readOnly={readOnly}
              value={form.startDate} aria-label={L('squad.form.startDate')}
              className="sq-field"
              onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
            />
          </div>
          <div className="sq-form-field">
            <div className="sq-field-label">{L('squad.form.endDateLabel')}</div>
            <DateInput readOnly={readOnly}
              value={form.endDate} aria-label={L('squad.form.endDate')}
              className={`sq-field${errors.endDate ? ' is-invalid' : ''}`}
              onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
            />
            {errors.endDate && <div className="sq-field-error">{errors.endDate}</div>}
          </div>
        </div>

        <div className="sq-form-field">
          <div className="sq-field-label">{L('squad.form.color')}</div>
          <div className="sq-swatches">
            {palette.map((c) => (
              <div
                key={c} onClick={() => setForm((f) => ({ ...f, color: c }))} title={c} aria-disabled={readOnly || undefined}
                data-testid={`squad-color-${c}`}
                className={`sq-swatch${form.color === c ? ' is-picked' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>

        {/* 소속 {층 이름} — 맨 아래 층 묶음 + 미분류(기본). 2층이면 «위 묶음 › 묶음»(§4 · §5-6-A «스쿼드의 소속») */}
        {groupLevelName && groupOptions && (
          <div className="sq-form-field">
            <label className="sq-field-label" htmlFor={`squad-group-${form.id || 'new'}`}>{L('squad.form.group', { level: groupLevelName })}</label>
            <Select
              aria-label={L('squad.form.group', { level: groupLevelName })}
              id={`squad-group-${form.id || 'new'}`}
              className={`sq-field${errors.groupId ? ' is-invalid' : ''}`}
              data-testid="squad-form-group"
              // 고른 묶음이 그 사이 지워졌으면(엣지 94) «미분류»로 보인다 — 저장도 미분류로 간다
              value={groupOptions.some((g) => g.id === form.groupId) ? form.groupId : ''}
              onChange={(e) => setForm((f) => ({ ...f, groupId: e.target.value || null }))}
            >
              <option value="">{L('squad.struct.ungrouped')}</option>
              {groupOptions.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
            </Select>
            {errors.groupId && <div className="sq-field-error">{errors.groupId}</div>}
          </div>
        )}

        {/* 팀장(리드) 선택 — 생성 폼에만. 리드 교체는 배정 편집 팝오버의 책임이라 수정 폼에는 없다 */}
        {!editing && (
          <div className="sq-form-field">
            <div className="sq-field-label">
              <span className="sq-lead-mark"><LeadStarIcon size={11} /></span>{' '}
              {L('squad.form.leadLabel')}
            </div>
            <PersonPickField
              value={form.leadUserId}
              candidates={leadCandidates}
              onPick={(id) => setForm((f) => ({ ...f, leadUserId: id }))}
              labels={{
                clear: L('squad.form.leadClear'),
                search: L('squad.form.leadSearch'),
                searchPlaceholder: L('squad.form.leadSearchPlaceholder'),
                none: L('squad.form.leadNoResults'),
                pick: L('squad.form.leadPick'),
              }}
              testId="sq-lead"
              disabled={readOnly}
            />
          </div>
        )}
      </div>

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
          type="button" onClick={onSubmit} disabled={submitting || readOnly}
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
