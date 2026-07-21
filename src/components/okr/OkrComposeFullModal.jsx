import { useEffect, useState } from 'react';
import Icon from '../shared/Icon.jsx';
import OkrProgressBar from './OkrProgressBar.jsx';

/**
 * OkrComposeFullModal — 개인 OKR 작성 풀스크린 모달.
 *
 * 좌측: 팀 OKR 미니맵. KR 의 + 버튼을 누르면 해당 팀 KR 에 연결된 개인 KR 이
 * (마지막/신규 Objective 에) 추가된다. 우측: Objective/KR 편집 폼.
 * 가중치는 Objective 합계 100%, 각 Objective 의 KR 합계 100% 여야 저장 가능.
 * 저장 시 onSubmit(objectives) 로 소비자에 전달한다.
 *
 * 시안: pivit-specs okr-individual.jsx(IndividualOKRWriter/ObjectiveWriteCard).
 * 담당자·팀 Objective 연결·AI 생성·이니셔티브는 후속(picker/크레딧 필요).
 *
 * onSubmit(objectives): objectives = [{ title, weight, comOkr?, krs: [{ title,
 *   target, unit, inputType('percent'|'binary'|'count'), weight, teamKrId? }] }]
 */
const METHODS = [
  { key: 'percent', label: '% 달성률', desc: '0~100% 직접 입력', unit: '%' },
  { key: 'binary', label: '완료 여부', desc: '달성/미달성', unit: '완료' },
  { key: 'count', label: '개수 달성', desc: 'n / 목표 개수', unit: '개' },
];

let seq = 0;
const nextId = () => { seq += 1; return `cf-${seq}`; };

function emptyKr(linked) {
  return {
    key: nextId(),
    title: '',
    target: linked?.target ?? 100,
    unit: linked?.unit ?? '%',
    inputType: linked?.inputType ?? 'percent',
    weight: '',
    ownerId: '',
    teamKrId: linked?.id ?? null,
  };
}
function emptyObjective(linkedKr) {
  return {
    key: nextId(),
    title: '',
    weight: '',
    parentId: '',
    krs: linkedKr ? [emptyKr(linkedKr)] : [],
  };
}

export default function OkrComposeFullModal({
  minimap,
  icons,
  baseUrl = '',
  onClose,
  onSubmit,
  onGenerate,
  members = [],
  parentOptions = [],
}) {
  const [objectives, setObjectives] = useState([]);
  const [linkedIds, setLinkedIds] = useState({});
  const [saving, setSaving] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [genError, setGenError] = useState(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const TYPE_UNIT = { number: '개', percentage: '%', boolean: '완료' };
  const TYPE_INPUT = { number: 'count', percentage: 'percent', boolean: 'binary' };
  const generate = async () => {
    if (!onGenerate) return;
    setGenLoading(true); setGenError(null);
    try {
      const res = await onGenerate();
      const draft = res?.draft ?? res;
      const krList = (draft?.keyResults ?? []).map((k) => ({
        key: nextId(),
        title: k.title ?? '',
        target: k.targetValue ?? 100,
        unit: k.unit ?? TYPE_UNIT[k.type] ?? '',
        inputType: TYPE_INPUT[k.type] ?? 'count',
        weight: '',
        ownerId: '',
        teamKrId: null,
      }));
      setObjectives((p) => [
        ...p,
        { key: nextId(), title: draft?.objective?.title ?? '', weight: '', parentId: '', krs: krList },
      ]);
    } catch {
      setGenError('AI 초안 생성에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally { setGenLoading(false); }
  };

  const addObjective = () => setObjectives((p) => [...p, emptyObjective()]);
  const removeObjective = (key) => setObjectives((p) => p.filter((o) => o.key !== key));
  const patchObjective = (key, patch) => setObjectives((p) => p.map((o) => (o.key === key ? { ...o, ...patch } : o)));
  const addKr = (objKey) => setObjectives((p) => p.map((o) => (o.key === objKey ? { ...o, krs: [...o.krs, emptyKr()] } : o)));
  const removeKr = (objKey, krKey) => setObjectives((p) => p.map((o) => (
    o.key === objKey ? { ...o, krs: o.krs.filter((k) => k.key !== krKey) } : o
  )));
  const patchKr = (objKey, krKey, patch) => setObjectives((p) => p.map((o) => (
    o.key === objKey ? { ...o, krs: o.krs.map((k) => (k.key === krKey ? { ...k, ...patch } : k)) } : o
  )));

  // 미니맵 + → 마지막 Objective(없으면 신규)에 연결 KR 추가.
  const linkTeamKr = (gi, ki, kr) => {
    setLinkedIds((prev) => ({ ...prev, [`${gi}-${ki}`]: true }));
    setObjectives((prev) => {
      if (prev.length === 0) return [emptyObjective(kr)];
      const last = prev[prev.length - 1];
      return prev.map((o) => (o.key === last.key ? { ...o, krs: [...o.krs, emptyKr(kr)] } : o));
    });
  };

  const totalW = objectives.reduce((a, o) => a + (Number(o.weight) || 0), 0);
  const krWeightOk = (o) => o.krs.length === 0 || o.krs.reduce((a, k) => a + (Number(k.weight) || 0), 0) === 100;
  const canSave =
    objectives.length > 0 &&
    totalW === 100 &&
    objectives.every((o) => o.title.trim() && o.krs.length > 0 && o.krs.every((k) => k.title.trim()) && krWeightOk(o));

  const handleSave = () => {
    if (!canSave || saving) return;
    const payload = objectives.map((o) => ({
      title: o.title.trim(),
      weight: Number(o.weight) || 0,
      parentOkrId: o.parentId || undefined,
      krs: o.krs.map((k) => ({
        title: k.title.trim(),
        target: Number(k.target) || 0,
        unit: k.unit,
        inputType: k.inputType,
        weight: Number(k.weight) || 0,
        ownerId: k.ownerId || undefined,
        teamKrId: k.teamKrId || undefined,
      })),
    }));
    setSaving(true);
    Promise.resolve(onSubmit?.(payload)).finally(() => { setSaving(false); onClose(); });
  };

  return (
    <div className="okr-modal-overlay">
      <div className="okr-cf-modal" onClick={(e) => e.stopPropagation()}>
        <button className="okr-modal-close" onClick={onClose}>
          <Icon src={icons.xClose} size={24} color="var(--text-secondary)" baseUrl={baseUrl} />
        </button>

        <div className="okr-cf-header">
          <p className="okr-cf-eyebrow">팀 OKR 미니맵</p>
          <p className="okr-cf-title">{minimap.title}</p>
        </div>

        <div className="okr-cf-body">
          <div className="okr-cf-minimap">
            <div className="okr-cf-company">
              <p className="okr-cf-company-label">{minimap.company.label}</p>
              <p className="okr-cf-company-title">{minimap.company.title}</p>
            </div>
            {minimap.groups.map((group, gi) => (
              <div className="okr-cf-group" key={group.title}>
                <div className="okr-cf-group-head">
                  <span className="okr-cf-group-q">{group.q}</span>
                  <span className="okr-cf-group-title">{group.title}</span>
                </div>
                {group.krs.map((kr, ki) => (
                  <div className={`okr-cf-kr${linkedIds[`${gi}-${ki}`] ? ' is-linked' : ''}`} key={kr.id + kr.title}>
                    <button className="okr-cf-kr-add" onClick={() => linkTeamKr(gi, ki, kr)}>
                      <Icon src={icons.plus} size={14} color="var(--text-secondary)" baseUrl={baseUrl} />
                    </button>
                    <div className="okr-cf-kr-main">
                      <p className="okr-cf-kr-title"><b>{kr.id}</b> {kr.title}</p>
                      <div className="okr-cf-kr-progress">
                        <OkrProgressBar percent={kr.percent} variant="success" />
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          <div className="okr-cf-editor">
            <div className="okr-cf-editor-head">
              <p className="okr-cf-hint">좌측 팀 OKR 미니맵에서 + 를 클릭하면 해당 팀 KR에 연결된 개인 KR이 자동 추가됩니다.</p>
              <div className="okr-cf-head-actions">
                {onGenerate && (
                  <button className="okr-wz-ai-btn" onClick={generate} disabled={genLoading}>
                    {genLoading ? '생성 중…' : '✦ AI로 초안 생성'}
                  </button>
                )}
                <button className="okr-cf-add-btn" onClick={addObjective}>
                  <Icon src={icons.plus} size={18} color="var(--text-white)" baseUrl={baseUrl} />
                  <span>{objectives.length ? 'Objective 추가' : '직접추가'}</span>
                </button>
              </div>
            </div>
            {genError && <p className="okr-wz-error" role="alert">{genError}</p>}

            {objectives.length === 0 ? (
              <div className="okr-cf-empty">
                <p className="okr-cf-empty-title">개인 OKR을 시작해보세요</p>
                <p className="okr-cf-empty-desc">우측 팀 OKR 미니맵에서 + 를 클릭하거나<br />직접 추가로 시작하세요</p>
              </div>
            ) : (
              objectives.map((objective) => {
                const krSum = objective.krs.reduce((a, k) => a + (Number(k.weight) || 0), 0);
                return (
                  <div className="okr-cf-objective" key={objective.key}>
                    <div className="okr-cf-obj-head">
                      <span className="okr-p-caret is-open">
                        <Icon src={icons.chevronDown} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                      </span>
                      <span className="okr-cf-obj-label">Objective</span>
                      <input
                        className="okr-cf-input"
                        placeholder="Objective 내용"
                        aria-label="Objective 내용"
                        value={objective.title}
                        onChange={(e) => patchObjective(objective.key, { title: e.target.value })}
                      />
                      <button className="okr-cf-x" onClick={() => removeObjective(objective.key)}>
                        <Icon src={icons.xClose} size={18} color="var(--text-tertiary)" baseUrl={baseUrl} />
                      </button>
                    </div>
                    <div className="okr-cf-obj-meta">
                      <input
                        className="okr-cf-input is-sm"
                        placeholder="가중치"
                        aria-label="Objective 가중치"
                        type="number"
                        value={objective.weight}
                        onChange={(e) => patchObjective(objective.key, { weight: e.target.value })}
                      />
                      <span className="okr-cf-unit">%</span>
                      {parentOptions.length > 0 && (
                        <select
                          className="okr-cf-select-real"
                          aria-label="상위 OKR 연결"
                          value={objective.parentId}
                          onChange={(e) => patchObjective(objective.key, { parentId: e.target.value })}
                        >
                          <option value="">상위 OKR 연결 (선택)</option>
                          {parentOptions.map((p) => (
                            <option key={p.id} value={p.id}>{p.label}</option>
                          ))}
                        </select>
                      )}
                    </div>

                    {objective.krs.map((kr) => (
                      <div className="okr-cf-kr-card" key={kr.key}>
                        <div className="okr-cf-kr-card-head">
                          <span className="okr-cf-bullet" />
                          <input
                            className="okr-cf-input"
                            placeholder="KR 내용"
                            aria-label="KR 내용"
                            value={kr.title}
                            onChange={(e) => patchKr(objective.key, kr.key, { title: e.target.value })}
                          />
                          <button className="okr-cf-x" onClick={() => removeKr(objective.key, kr.key)}>
                            <Icon src={icons.xClose} size={16} color="var(--text-tertiary)" baseUrl={baseUrl} />
                          </button>
                        </div>
                        <div className="okr-cf-methods">
                          {METHODS.map((method) => (
                            <button
                              type="button"
                              className={`okr-cf-method${kr.inputType === method.key ? ' is-active' : ''}`}
                              key={method.key}
                              onClick={() => patchKr(objective.key, kr.key, { inputType: method.key, unit: method.unit })}
                            >
                              <p className="okr-cf-method-label">{method.label}</p>
                              <p className="okr-cf-method-desc">{method.desc}</p>
                            </button>
                          ))}
                        </div>
                        <div className="okr-cf-kr-meta">
                          <input
                            className="okr-cf-input is-sm"
                            placeholder="목표"
                            aria-label="KR 목표값"
                            type="number"
                            value={kr.target}
                            onChange={(e) => patchKr(objective.key, kr.key, { target: e.target.value })}
                          />
                          <input
                            className="okr-cf-input is-sm"
                            placeholder="단위"
                            aria-label="KR 단위"
                            value={kr.unit}
                            onChange={(e) => patchKr(objective.key, kr.key, { unit: e.target.value })}
                          />
                          <input
                            className="okr-cf-input is-sm"
                            placeholder="가중치"
                            aria-label="KR 가중치"
                            type="number"
                            value={kr.weight}
                            onChange={(e) => patchKr(objective.key, kr.key, { weight: e.target.value })}
                          />
                          <span className="okr-cf-unit">%</span>
                          {members.length > 0 && (
                            <select
                              className="okr-cf-select-real"
                              aria-label="KR 담당자"
                              value={kr.ownerId}
                              onChange={(e) => patchKr(objective.key, kr.key, { ownerId: e.target.value })}
                            >
                              <option value="">담당자</option>
                              {members.map((m) => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                              ))}
                            </select>
                          )}
                        </div>
                      </div>
                    ))}

                    {objective.krs.length > 0 && (
                      <div className={`okr-cf-krsum${krSum === 100 ? ' is-ok' : ''}`}>
                        {krSum === 100 ? '✓ KR 가중치 100%' : `KR 가중치 합계 ${krSum}% (100% 필요)`}
                      </div>
                    )}
                    <button className="okr-cf-kr-add-btn" onClick={() => addKr(objective.key)}>
                      <Icon src={icons.plus} size={16} color="var(--text-secondary)" baseUrl={baseUrl} />
                      <span>KR 직접추가</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {objectives.length > 0 && (
          <div className="okr-modal-footer">
            <span className={`okr-cf-total${totalW === 100 ? ' is-ok' : ''}`}>
              Objective 가중치 합계 {totalW}% {totalW === 100 ? '✓' : '(100% 필요)'}
            </span>
            <button className="okr-btn is-outline" onClick={onClose}>취소</button>
            <button
              className="okr-btn is-brand"
              disabled={!canSave || saving}
              title={!canSave ? 'Objective·KR 가중치 합이 모두 100%여야 저장할 수 있습니다.' : ''}
              onClick={handleSave}
            >
              {saving ? '저장 중…' : '저장'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
