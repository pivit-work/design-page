/**
 * 묶음 관리 패널 — 스쿼드 위의 트라이브·그룹 층과 묶음을 관리한다
 * (pivit-work PW-2599 · 기획 screen-org-chart-squad.policy.md §5-6-A «자리» · §7-17 · 엣지 93 · 95).
 *
 * 스쿼드 툴바 아래 인라인 패널이다(모달·별도 화면 아님 · 한판 UX). `p013` 보유자에게만 연다 — 여는 쪽(SquadCanvas)이 가른다.
 * 저장은 행마다 따로 한다. 패널을 닫아도 저장한 값은 남는다.
 *
 * 콜백은 저장 결과를 돌려준다 — `{ ok: true }` 또는 `{ ok: false, field?, message? }`.
 * `field` 가 있으면 그 칸 아래에 문구를 단다(입력은 그대로 둔다). 토스트·다시 불러오기는 호스트 몫이다.
 *   field: 'levels'(층 수) · 'levelNames.{0|1}'(층 이름) · 'name' · 'color' · 'headUserId' · 'parentId'
 *
 * 층 번호는 아래에서부터 센다 — `levelNames[0]` = 아래 층(스쿼드가 속함) · `[1]` = 위 층. 화면은 위 층부터 적는다.
 *
 * 디자이너 원본은 없다. 같은 탭의 디자이너 모양을 옮겼다:
 *   판           = 스쿼드 생성 폼 카드(.pj-card.sq-card.sq-form) · 제목(.sq-form-title) · 안내(.sq-form-note)
 *   칸·이름표    = 생성 폼(.sq-form-field · .sq-field-label · .sq-field · .sq-field-error)
 *   색 고르기    = 생성 폼 색 팔레트(.sq-swatches · .sq-swatch)
 *   헤드 고르기  = 생성 폼 ⭐ 팀장 칸(PersonPickField)
 *   층 수        = 공용 SegmentedControl · 단추 = .sq-btn
 */
import { useState } from 'react';
import SegmentedControl from '../shared/SegmentedControl.jsx';
import Select from '../shared/Select.jsx';
import ConfirmModal from '../shared/ConfirmModal.jsx';
import { SQUAD_MODAL_Z } from './squad-constants.js';
import { PersonPickField } from './SquadFormCard.jsx';
import { useOrgLabels } from './orgchart-labels.jsx';
import { isEnterKey } from '../shared/enterKey.js';

const byKo = (a, b) => a.name.localeCompare(b.name, 'ko');

/** 층 수를 바꿀 때 보낼 층 이름 — 늘리면 새 층은 위에 기본 이름으로, 줄이면 위 층부터 없앤다(§5-6-A «층 늘리기 · 층 줄이기»). */
function nextLevelNames(current, to, defaults) {
  if (to === current.length) return current;
  if (to < current.length) return current.slice(0, to);
  if (current.length === 0) return to === 1 ? [defaults.bottom] : [defaults.bottom, defaults.top];
  return [current[0], defaults.top];
}

export default function SquadGroupPanel({
  levelNames = [],
  groups = [],
  squads = [],
  people = [],
  palette = [],
  onSaveLevels,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onClose,
}) {
  const L = useOrgLabels();
  const levels = levelNames.length;
  const [busy, setBusy] = useState(null); // 저장 중인 자리 — 'levels' · 'name0' · 'name1' · 'edit' · `del:{id}`
  const [levelErr, setLevelErr] = useState('');
  const [names, setNames] = useState(levelNames);
  const [nameErr, setNameErr] = useState({});
  const [edit, setEdit] = useState(null); // { mode, id?, level, name, color, headUserId, parentId }
  const [editErr, setEditErr] = useState({});
  const [delAsk, setDelAsk] = useState(null);
  // 층 이름 칸은 저장된 이름에서 시작한다 — 저장된 이름이 바뀌면 여는 쪽이 `key` 로 패널을 새로 그린다

  const lv = (i) => levelNames[i] || '';
  const atLevel = (i) => groups.filter((g) => g.level === i).sort(byKo);
  const groupById = (id) => groups.find((g) => g.id === id);
  const personName = (id) => people.find((p) => p.id === id)?.name || '';

  const run = async (key, fn, onFail) => {
    setBusy(key);
    try {
      const res = (await fn()) || { ok: true };
      if (!res.ok) onFail?.(res);
      return res;
    } finally {
      setBusy(null);
    }
  };

  const changeLevels = (to) => {
    setLevelErr('');
    const next = nextLevelNames(levelNames, Number(to), { bottom: L('squad.groups.defaultBottom'), top: L('squad.groups.defaultTop') });
    if (next === levelNames) return;
    run('levels', () => onSaveLevels(next), (res) => setLevelErr(res.message || ''));
  };
  const saveName = (i) => {
    const next = levelNames.map((x, j) => (j === i ? (names[i] || '').trim() : x));
    setNameErr((e) => ({ ...e, [i]: '' }));
    run(`name${i}`, () => onSaveLevels(next), (res) => {
      const at = res.field && res.field.startsWith('levelNames.') ? Number(res.field.split('.')[1]) : i;
      setNameErr((e) => ({ ...e, [at]: res.message || '' }));
    });
  };

  const openCreate = (level) => {
    const used = new Set(atLevel(level).map((g) => g.color));
    setEdit({ mode: 'create', level, name: '', color: palette.find((c) => !used.has(c)) || palette[0], headUserId: null, parentId: null });
    setEditErr({});
    setDelAsk(null);
  };
  const openEdit = (g) => {
    setEdit({ mode: 'edit', id: g.id, level: g.level, name: g.name, color: g.color, headUserId: g.headActive ? g.headUserId : null, parentId: g.parentId });
    setEditErr({});
    setDelAsk(null);
  };
  const submit = async () => {
    const f = edit;
    const name = f.name.trim();
    if (!name) { setEditErr({ name: L('squad.groups.errNameRequired') }); return; }
    if (atLevel(f.level).some((g) => g.id !== f.id && g.name.trim().toLowerCase() === name.toLowerCase())) {
      setEditErr({ name: L('squad.groups.errNameDuplicate', { level: lv(f.level) }) });
      return;
    }
    const payload = {
      name,
      color: f.color,
      headUserId: f.headUserId || null,
      parentId: levels === 2 && f.level === 0 ? (f.parentId || null) : null,
    };
    const res = await run('edit', () => (f.mode === 'create'
      ? onCreateGroup({ level: f.level, ...payload })
      : onUpdateGroup(f.id, payload)), (r) => setEditErr({ [r.field || 'name']: r.message || '' }));
    if (res.ok) setEdit(null);
  };
  const remove = async (g) => {
    const res = await run(`del:${g.id}`, () => onDeleteGroup(g.id));
    // 실패해도 창은 닫는다 — 무엇이 잘못됐는지는 호스트가 토스트로 알리고 패널을 다시 불러온다(§7-17)
    setDelAsk(null);
    return res;
  };

  /** 아래 층 묶음이면 속한 스쿼드 수, 위 층 묶음이면 아래 묶음 수 */
  const childCount = (g) => (g.level === 0
    ? squads.filter((sq) => sq.groupId === g.id).length
    : groups.filter((x) => x.level === 0 && x.parentId === g.id).length);
  const childText = (g) => (g.level === 0
    ? L('squad.groups.squadCount', { count: childCount(g) })
    : L('squad.groups.lowerCount', { level: lv(0), count: childCount(g) }));

  const editor = edit && (
    <div className="sq-group-editor" data-testid="squad-group-editor">
      <div className="sq-form-fields">
        <div className="sq-form-field">
          <div className="sq-field-label">{L('squad.groups.name', { level: lv(edit.level) })}</div>
          <input
            autoFocus value={edit.name} maxLength={30}
            aria-label={L('squad.groups.name', { level: lv(edit.level) })}
            data-testid="squad-group-name"
            className={`sq-field${editErr.name ? ' is-invalid' : ''}`}
            onChange={(e) => { const v = e.target.value; setEdit((x) => ({ ...x, name: v })); setEditErr({}); }}
            onKeyDown={(e) => { if (isEnterKey(e)) submit(); if (e.key === 'Escape') setEdit(null); }}
          />
          {editErr.name && <div className="sq-field-error" data-testid="squad-group-name-error">{editErr.name}</div>}
        </div>
        {levels === 2 && edit.level === 0 && (
          <div className="sq-form-field">
            <div className="sq-field-label">{L('squad.groups.parent', { level: lv(1) })}</div>
            <Select
              aria-label={L('squad.groups.parent', { level: lv(1) })}
              className={`sq-field${editErr.parentId ? ' is-invalid' : ''}`}
              data-testid="squad-group-parent"
              value={edit.parentId || ''}
              onChange={(e) => { const v = e.target.value; setEdit((x) => ({ ...x, parentId: v || null })); }}
            >
              <option value="">{L('squad.struct.ungrouped')}</option>
              {atLevel(1).map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </Select>
            {editErr.parentId && <div className="sq-field-error">{editErr.parentId}</div>}
          </div>
        )}
        <div className="sq-form-field">
          <div className="sq-field-label">{L('squad.groups.head', { level: lv(edit.level) })}</div>
          <PersonPickField
            value={edit.headUserId}
            candidates={people.filter((p) => p.assignable !== false)}
            onPick={(id) => setEdit((x) => ({ ...x, headUserId: id }))}
            labels={{
              clear: L('squad.groups.headClear'),
              search: L('squad.form.leadSearch'),
              searchPlaceholder: L('squad.form.leadSearchPlaceholder'),
              none: L('squad.form.leadNoResults'),
              pick: L('squad.groups.headPick'),
            }}
            testId="squad-group-head"
          />
          {editErr.headUserId && <div className="sq-field-error">{editErr.headUserId}</div>}
        </div>
        <div className="sq-form-field">
          <div className="sq-field-label">{L('squad.form.color')}</div>
          <div className="sq-swatches">
            {palette.map((c) => (
              <div
                key={c} onClick={() => setEdit((x) => ({ ...x, color: c }))} title={c}
                data-testid={`squad-group-color-${c}`}
                className={`sq-swatch${edit.color === c ? ' is-picked' : ''}`}
                style={{ background: c }}
              />
            ))}
          </div>
          {editErr.color && <div className="sq-field-error">{editErr.color}</div>}
        </div>
      </div>
      <p className="sq-form-note">{L('squad.groups.headNote')}</p>
      <div className="sq-form-actions">
        <button type="button" className="sq-btn sq-btn-primary" onClick={submit} disabled={busy === 'edit'} data-testid="squad-group-submit">
          {busy === 'edit' ? L('squad.groups.saving') : L(edit.mode === 'create' ? 'squad.form.create' : 'squad.form.save')}
        </button>
        <button type="button" className="sq-btn sq-btn-outline" onClick={() => setEdit(null)}>{L('squad.form.cancel')}</button>
      </div>
    </div>
  );

  // 위 층부터 적는다 — [1] 위 층 · [0] 아래 층
  const order = levels === 2 ? [1, 0] : levels === 1 ? [0] : [];
  const levelTag = (i) => (levels === 2 ? L(i === 1 ? 'squad.groups.upper' : 'squad.groups.lower') : L('squad.groups.single'));

  return (
    <div className="pj-card sq-card sq-form sq-group-panel" data-testid="squad-group-panel">
      <div className="sq-group-panel-head">
        <div>
          <p className="sq-form-title">{L('squad.groups.title')}</p>
          <p className="sq-form-note">{L('squad.groups.desc')}</p>
        </div>
        <button type="button" className="sq-btn sq-btn-outline sq-btn-sm" onClick={onClose} data-testid="squad-group-close">{L('squad.groups.close')}</button>
      </div>

      <div className="sq-group-levels">
        <span className="sq-field-label">{L('squad.groups.levels')}</span>
        <SegmentedControl
          ariaLabel={L('squad.groups.levels')}
          items={[0, 1, 2].map((n) => ({
            value: String(n),
            label: n === 0 ? L('squad.groups.levelNone') : L('squad.groups.levelN', { count: n }),
            testId: `squad-group-levels-${n}`,
            disabled: busy === 'levels',
          }))}
          value={String(levels)}
          onChange={changeLevels}
        />
        <span className="sq-form-note">
          {busy === 'levels'
            ? L('squad.groups.saving')
            : levels ? `${[...levelNames].reverse().join(' › ')} › ${L('squad.groups.squad')}` : L('squad.groups.levelNoneDesc')}
        </span>
      </div>
      {levelErr && <div className="sq-field-error" role="alert" data-testid="squad-group-levels-error">{levelErr}</div>}

      {order.map((i) => {
        const rows = atLevel(i);
        const dirty = (names[i] || '') !== lv(i);
        return (
          <div key={i} className="sq-group-level" data-testid={`squad-group-level-${i}`}>
            <div className="sq-group-level-head">
              <span className="sq-field-label">{levelTag(i)}</span>
              <input
                value={names[i] || ''} maxLength={10}
                aria-label={L('squad.groups.levelName', { tag: levelTag(i) })}
                data-testid={`squad-group-level-name-${i}`}
                className={`sq-field sq-group-level-input${nameErr[i] ? ' is-invalid' : ''}`}
                onChange={(e) => { const v = e.target.value; setNames((ns) => ns.map((x, j) => (j === i ? v : x))); setNameErr((er) => ({ ...er, [i]: '' })); }}
                onKeyDown={(e) => { if (isEnterKey(e) && dirty) saveName(i); }}
              />
              <button
                type="button" className="sq-btn sq-btn-outline sq-btn-sm"
                onClick={() => saveName(i)} disabled={!dirty || busy === `name${i}`}
                data-testid={`squad-group-level-save-${i}`}
              >
                {busy === `name${i}` ? L('squad.groups.saving') : L('squad.form.save')}
              </button>
            </div>
            {nameErr[i] && <div className="sq-field-error" data-testid={`squad-group-level-error-${i}`}>{nameErr[i]}</div>}

            {rows.length === 0 && <p className="sq-form-note">{L('squad.groups.emptyLevel', { level: lv(i) })}</p>}
            {rows.map((g) => {
              if (edit && edit.mode === 'edit' && edit.id === g.id) return <div key={g.id}>{editor}</div>;
              const parent = levels === 2 && i === 0 ? groupById(g.parentId) : null;
              const head = g.headUserId && g.headActive ? personName(g.headUserId) : '';
              const n = childCount(g);
              return (
                <div key={g.id} className="sq-group-row" data-testid={`squad-group-row-${g.id}`}>
                  <span className="sq-group-dot" style={{ background: g.color }} aria-hidden />
                  <span className="sq-group-row-name sq-graph-ellipsis">{g.name}</span>
                  {levels === 2 && i === 0 && (
                    <span className="sq-group-row-meta">{L('squad.groups.parentLine', { level: lv(1), name: parent ? parent.name : L('squad.struct.ungrouped') })}</span>
                  )}
                  <span className="sq-group-row-meta">{head ? L('squad.groups.headLine', { level: lv(i), name: head }) : L('squad.struct.headUnset')}</span>
                  <span className="sq-group-row-meta">{childText(g)}</span>
                  <span className="sq-group-row-actions">
                    <button type="button" className="sq-btn sq-btn-sm sq-btn-outline" onClick={() => openEdit(g)} data-testid={`squad-group-edit-${g.id}`}>{L('squad.groups.edit')}</button>
                    <button type="button" className="sq-btn sq-btn-sm sq-btn-outline" onClick={() => { setDelAsk(g.id); setEdit(null); }} data-testid={`squad-group-del-${g.id}`}>{L('squad.groups.delete')}</button>
                  </span>
                </div>
              );
            })}
            {edit && edit.mode === 'create' && edit.level === i ? editor : (
              <button type="button" className="sq-btn sq-btn-sm sq-btn-outline sq-group-add" onClick={() => openCreate(i)} data-testid={`squad-group-add-${i}`}>
                {L('squad.groups.add', { level: lv(i) })}
              </button>
            )}
          </div>
        );
      })}

      {/* 묶음 삭제 확인 — 스쿼드·배정·프로젝트 연결은 지우지 않는다. 잃는 것이 이름·색·헤드뿐이라 이름 재입력을 받지 않는다(§5-6-A «묶음 삭제») */}
      {delAsk && groupById(delAsk) && (() => {
        const g = groupById(delAsk);
        return (
          <ConfirmModal
            title={L('squad.groups.delTitle', { level: lv(g.level) })}
            body={<p className="sq-modal-note" data-testid="squad-group-del-body">
              {L(g.level === 0 ? 'squad.groups.delAsk' : 'squad.groups.delAskUpper', { name: g.name, count: childCount(g), level: lv(0) })}
            </p>}
            danger
            confirmDisabled={busy === `del:${g.id}`}
            confirmLabel={busy === `del:${g.id}` ? L('squad.groups.saving') : L('squad.groups.delete')}
            cancelLabel={L('squad.form.cancel')}
            onConfirm={() => remove(g)}
            onCancel={() => setDelAsk(null)}
            zIndex={SQUAD_MODAL_Z}
            testId="squad-group-del-modal"
            cancelTestId="squad-group-del-cancel"
            confirmTestId="squad-group-del-confirm"
          />
        );
      })()}
    </div>
  );
}
