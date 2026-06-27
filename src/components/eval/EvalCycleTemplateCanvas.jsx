import { useState, useMemo } from 'react';

/**
 * EvalCycleTemplateCanvas — 평가 템플릿 빌더.
 * 항목(추가/삭제·분류·응답유형·라벨) + 등급(추가/삭제·키·라벨·비율) + 절대/상대 토글.
 * onSave(dto) — { name, isAbsolute, finalGradePosition, items, grades }.
 */

const DEFAULT_LABELS = {
  title: '평가 템플릿',
  nameLabel: '템플릿 이름',
  absToggle: '평가 방식',
  absolute: '절대평가',
  relative: '상대평가',
  positionToggle: '최종 등급 위치',
  posTop: '상단',
  posBottom: '하단',
  itemsTitle: '평가 항목',
  addItem: '+ 항목 추가',
  gradesTitle: '등급 정의',
  addGrade: '+ 등급 추가',
  itemLabelPh: '항목 질문',
  gradeKeyPh: '키',
  gradeLabelPh: '등급명',
  ratioPh: '비율%',
  remove: '삭제',
  save: '템플릿 저장',
  catLabel: '분류',
  respLabel: '응답',
  readOnly: '오픈된 사이클은 템플릿을 편집할 수 없습니다.',
};

function isObj(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}
function mergeLabels(base, provided) {
  if (!provided) return base;
  const out = { ...base };
  for (const k of Object.keys(provided)) {
    if (isObj(provided[k])) out[k] = mergeLabels(base[k] || {}, provided[k]);
    else if (provided[k] !== undefined) out[k] = provided[k];
  }
  return out;
}

export default function EvalCycleTemplateCanvas({
  cycle,
  template,
  items: initItems = [],
  grades: initGrades = [],
  categoryOptions = [],
  responseOptions = [],
  editable = true,
  labels: providedLabels,
  onSave,
}) {
  const L = useMemo(() => mergeLabels(DEFAULT_LABELS, providedLabels), [providedLabels]);
  const [name, setName] = useState(template?.name ?? '기본 평가 템플릿');
  const [isAbsolute, setIsAbsolute] = useState(template?.isAbsolute ?? true);
  const [position, setPosition] = useState(template?.finalGradePosition ?? 'bottom');
  const [items, setItems] = useState(() =>
    initItems.length
      ? initItems.map((it) => ({
          category: it.category ?? (categoryOptions[0]?.key ?? ''),
          responseType: it.responseType ?? 'text',
          label: it.label ?? '',
        }))
      : [{ category: categoryOptions[0]?.key ?? '', responseType: 'text', label: '' }],
  );
  const [grades, setGrades] = useState(() =>
    initGrades.length
      ? initGrades.map((g) => ({ gradeKey: g.gradeKey, label: g.label, ratio: g.ratio ?? '' }))
      : [
          { gradeKey: 'exceeds', label: '탁월', ratio: '' },
          { gradeKey: 'meets', label: '충족', ratio: '' },
        ],
  );

  const updateItem = (i, patch) =>
    setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  const updateGrade = (i, patch) =>
    setGrades((arr) => arr.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));

  const handleSave = () => {
    if (!onSave) return;
    onSave({
      name,
      isAbsolute,
      finalGradePosition: position,
      items: items.map((it) => ({
        category: it.category || null,
        responseType: it.responseType,
        label: it.label,
      })),
      grades: grades.map((g) => ({
        gradeKey: g.gradeKey,
        label: g.label,
        ratio: isAbsolute ? null : Number(g.ratio) || 0,
      })),
    });
  };

  return (
    <div className="evc-root">
      <header className="evc-header">
        <div>
          <h1 className="evc-title">{L.title}</h1>
          {cycle?.name && <p className="evc-summary">{cycle.name}</p>}
        </div>
        {editable && (
          <button type="button" className="evc-btn is-primary" onClick={handleSave} data-testid="evtpl-save">
            {L.save}
          </button>
        )}
      </header>

      {!editable && (
        <p className="evx-notice" data-testid="evtpl-readonly" style={{ maxWidth: 1080, margin: '0 auto 12px' }}>
          {L.readOnly}
        </p>
      )}

      <div className="evc-list">
        <section className="evc-card">
          <label className="evc-field-label" htmlFor="evtpl-name">{L.nameLabel}</label>
          <input
            id="evtpl-name"
            className="evc-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!editable}
            data-testid="evtpl-name"
          />
          <div className="evtpl-toggles">
            <div>
              <span className="evc-field-label">{L.absToggle}</span>
              <div className="fb-tabs">
                <button type="button" className={`fb-tab${isAbsolute ? ' is-on' : ''}`} onClick={() => editable && setIsAbsolute(true)} data-testid="evtpl-abs">{L.absolute}</button>
                <button type="button" className={`fb-tab${!isAbsolute ? ' is-on' : ''}`} onClick={() => editable && setIsAbsolute(false)} data-testid="evtpl-rel">{L.relative}</button>
              </div>
            </div>
            <div>
              <span className="evc-field-label">{L.positionToggle}</span>
              <div className="fb-tabs">
                <button type="button" className={`fb-tab${position === 'top' ? ' is-on' : ''}`} onClick={() => editable && setPosition('top')}>{L.posTop}</button>
                <button type="button" className={`fb-tab${position === 'bottom' ? ' is-on' : ''}`} onClick={() => editable && setPosition('bottom')}>{L.posBottom}</button>
              </div>
            </div>
          </div>
        </section>

        <section className="evc-card">
          <h3 className="evc-card-name">{L.itemsTitle}</h3>
          {items.map((it, i) => (
            <div className="evtpl-row" key={i} data-testid="evtpl-item-row">
              <select className="evc-select" value={it.category} onChange={(e) => updateItem(i, { category: e.target.value })} disabled={!editable}>
                {categoryOptions.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
              <select className="evc-select" value={it.responseType} onChange={(e) => updateItem(i, { responseType: e.target.value })} disabled={!editable}>
                {responseOptions.map((r) => (
                  <option key={r.key} value={r.key}>{r.label}</option>
                ))}
              </select>
              <input className="evc-input" value={it.label} placeholder={L.itemLabelPh} onChange={(e) => updateItem(i, { label: e.target.value })} disabled={!editable} />
              {editable && (
                <button type="button" className="evc-btn is-ghost" onClick={() => setItems((a) => a.filter((_, idx) => idx !== i))} data-testid="evtpl-item-remove">{L.remove}</button>
              )}
            </div>
          ))}
          {editable && (
            <button type="button" className="evc-btn is-ghost" onClick={() => setItems((a) => [...a, { category: categoryOptions[0]?.key ?? '', responseType: 'text', label: '' }])} data-testid="evtpl-add-item">{L.addItem}</button>
          )}
        </section>

        <section className="evc-card">
          <h3 className="evc-card-name">{L.gradesTitle}</h3>
          {grades.map((g, i) => (
            <div className="evtpl-row" key={i} data-testid="evtpl-grade-row">
              <input className="evc-input" value={g.gradeKey} placeholder={L.gradeKeyPh} onChange={(e) => updateGrade(i, { gradeKey: e.target.value })} disabled={!editable} />
              <input className="evc-input" value={g.label} placeholder={L.gradeLabelPh} onChange={(e) => updateGrade(i, { label: e.target.value })} disabled={!editable} />
              {!isAbsolute && (
                <input className="evc-input" type="number" value={g.ratio} placeholder={L.ratioPh} onChange={(e) => updateGrade(i, { ratio: e.target.value })} disabled={!editable} style={{ maxWidth: 90 }} />
              )}
              {editable && (
                <button type="button" className="evc-btn is-ghost" onClick={() => setGrades((a) => a.filter((_, idx) => idx !== i))} data-testid="evtpl-grade-remove">{L.remove}</button>
              )}
            </div>
          ))}
          {editable && (
            <button type="button" className="evc-btn is-ghost" onClick={() => setGrades((a) => [...a, { gradeKey: '', label: '', ratio: '' }])} data-testid="evtpl-add-grade">{L.addGrade}</button>
          )}
        </section>
      </div>
    </div>
  );
}
